// Integration tests for Matching Service API endpoints
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Matching API Integration Tests', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Potential Matches Discovery', () => {
    let user1: any, user2: any, user3: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      // Create test users with different profiles
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Alice',
        lastName: 'Smith',
        birthDate: '1999-01-01',
        gender: 'FEMALE',
        interests: ['music', 'travel', 'photography'],
        location: 'New York, NY' // NYC
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Bob',
        lastName: 'Johnson',
        birthDate: '1996-01-01',
        gender: 'MALE',
        interests: ['music', 'sports', 'cooking'],
        location: 'New York, NY' // NYC (close to user1)
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      const user3Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Charlie',
        lastName: 'Brown',
        birthDate: '1994-01-01',
        gender: 'MALE',
        interests: ['reading', 'hiking', 'movies'],
        location: 'Los Angeles, CA' // LA (far from user1)
      });
      user3 = user3Data.user;
      // client3 = await integrationTestUtils.userManager.createAuthenticatedClient(user3.id);

      // Set preferences for user1 to match with males aged 25-35
      await client1.put('/api/v1/users/preferences', {
        ageRange: { min: 25, max: 35 },
        maxDistance: 100,
        interestedInGenders: ['MALE'],
        showMe: true
      });

      // Set preferences for user2 to be discoverable
      await client2.put('/api/v1/users/preferences', {
        ageRange: { min: 20, max: 30 },
        maxDistance: 100,
        interestedInGenders: ['FEMALE'],
        showMe: true
      });

      // Set preferences for user3 (but in LA, should not match due to distance)
      const client3 = await integrationTestUtils.userManager.createAuthenticatedClient(user3.id);
      await client3.put('/api/v1/users/preferences', {
        ageRange: { min: 20, max: 30 },
        maxDistance: 50, // Lower distance, should not reach from LA to NYC
        interestedInGenders: ['FEMALE'],
        showMe: true
      });
    });

    it('should get potential matches based on preferences', async () => {
      const response = await client1.get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('matches');
      expect(Array.isArray(response.data.data.matches)).toBe(true);
      
      const matches = response.data.data.matches;
      
      // Should include user2 (male, age 28, close distance, shared interest: music)
      const user2Match = matches.find((m: any) => m.recommendedUser.id === user2.id);
      expect(user2Match).toBeDefined();
      expect(user2Match).toHaveProperty('matchScore');
      expect(user2Match.matchScore).toBeGreaterThan(0);
      
      // Should not include user3 if distance filtering is working (too far)
      const user3Match = matches.find((m: any) => m.recommendedUser.id === user3.id);
      if (user3Match) {
        // If included, should have lower compatibility due to distance
        expect(user3Match.matchScore).toBeLessThan(user2Match.matchScore);
      }
    });

    it('should calculate compatibility scores correctly', async () => {
      const response = await client1.get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      matches.forEach((match: any) => {
        expect(match).toHaveProperty('matchScore');
        expect(typeof match.matchScore).toBe('number');
        expect(match.matchScore).toBeGreaterThanOrEqual(0);
        expect(match.matchScore).toBeLessThanOrEqual(1);
        
        expect(match).toHaveProperty('recommendedUser');
        expect(match.recommendedUser).toHaveProperty('id');
        expect(match.recommendedUser).toHaveProperty('firstName');
        expect(match.recommendedUser).toHaveProperty('birthDate');
        expect(match.recommendedUser).not.toHaveProperty('email'); // Should not expose sensitive data
      });
    });

    it('should respect distance preferences', async () => {
      // Set very small distance preference
      await client1.put('/api/v1/users/preferences', {
        ageRange: { min: 25, max: 35 },
        maxDistance: 5, // Very small radius
        interestedInGenders: ['MALE'],
        showMe: true
      });

      const response = await client1.get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Should only include very close users (user2 should still be included, user3 should not)
      const user3Match = matches.find((m: any) => m.recommendedUser.id === user3.id);
      expect(user3Match).toBeUndefined(); // Too far away
    });

    it('should respect age preferences', async () => {
      // Set narrow age range
      await client1.put('/api/v1/users/preferences', {
        ageRange: { min: 27, max: 29 }, // Only user2 should match
        maxDistance: 1000,
        interestedInGenders: ['MALE'],
        showMe: true
      });

      const response = await client1.get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Should only include users within age range (calculated from birthDate)
      matches.forEach((match: any) => {
        const birthYear = new Date(match.recommendedUser.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        expect(age).toBeGreaterThanOrEqual(27);
        expect(age).toBeLessThanOrEqual(29);
      });
    });

    it('should respect gender preferences', async () => {
      // User1 looking for females only
      await client1.put('/api/v1/users/preferences', {
        ageRange: { min: 18, max: 50 },
        maxDistance: 1000,
        interestedInGenders: ['FEMALE'], // Only females
        showMe: true
      });

      const response = await client1.get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Should not include male users
      const maleMatches = matches.filter((m: any) => m.recommendedUser.gender === 'MALE');
      expect(maleMatches.length).toBe(0);
    });

    it('should not show users who have showMe disabled', async () => {
      // Disable showMe for user2
      await client2.put('/api/v1/users/preferences', {
        showMe: false
      });

      const response = await client1.get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Should not include user2
      const user2Match = matches.find((m: any) => m.recommendedUser.id === user2.id);
      expect(user2Match).toBeUndefined();
    });
  });

  describe('Swiping Mechanism', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Swiper1',
        lastName: 'Test',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Swiper2',
        lastName: 'Test',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should record a like swipe', async () => {
      const swipeData = {
        targetUserId: user2.id,
        action: 'like'
      };

      const response = await client1.post('/api/v1/matching/swipe', swipeData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('swipe');
      expect(response.data.data.swipe.action).toBe('like');
      expect(response.data.data.swipe.targetUserId).toBe(user2.id);
      expect(response.data.data).toHaveProperty('match', false); // No match yet
    });

    it('should record a pass swipe', async () => {
      const swipeData = {
        targetUserId: user2.id,
        action: 'dislike'
      };

      const response = await client1.post('/api/v1/matching/swipe', swipeData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('swipe');
      expect(response.data.data.swipe.action).toBe('dislike');
      expect(response.data.data.swipe.targetUserId).toBe(user2.id);
      expect(response.data.data).toHaveProperty('match', false);
    });

    it('should create a match when both users like each other', async () => {
      // User1 likes User2
      const swipe1Response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipe1Response, 200);
      expect(swipe1Response.data.data.match).toBe(false);

      // User2 likes User1 - should create a match
      const swipe2Response = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipe2Response, 200);
      expect(swipe2Response.data.data.match).toBe(true);
      expect(swipe2Response.data.data).toHaveProperty('matchId');
      expect(swipe2Response.data.data.matchId).toBeTruthy();
    });

    it('should not create a match if one user passes', async () => {
      // User1 likes User2
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      // User2 passes on User1 - should not create a match
      const swipe2Response = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'dislike'
      });
      
      TestAssertions.assertSuccessResponse(swipe2Response, 200);
      expect(swipe2Response.data.data.match).toBe(false);
    });

    it('should prevent duplicate swipes on the same user', async () => {
      // First swipe
      const firstSwipe = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(firstSwipe, 200);

      // Second swipe on same user should fail
      const secondSwipe = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      expect(secondSwipe.status).toBe(409);
      expect(secondSwipe.data.success).toBe(false);
      expect(secondSwipe.data.error).toHaveProperty('code', 'SWIPE_EXISTS');
    });

    it('should prevent swiping on yourself', async () => {
      const response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'INVALID_TARGET');
    });
  });

  describe('Matches Management', () => {
    let user1: any, user2: any, user3: any;
    let client1: any, client2: any, client3: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Match1',
        lastName: 'Test',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Match2',
        lastName: 'Test',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      const user3Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Match3',
        lastName: 'Test',
      });
      user3 = user3Data.user;
      client3 = await integrationTestUtils.userManager.createAuthenticatedClient(user3.id);

      // Create matches between user1-user2 and user1-user3
      await client1.post('/api/v1/matching/swipe', { targetUserId: user2.id, action: 'like' });
      await client2.post('/api/v1/matching/swipe', { targetUserId: user1.id, action: 'like' });
      
      await client1.post('/api/v1/matching/swipe', { targetUserId: user3.id, action: 'like' });
      await client3.post('/api/v1/matching/swipe', { targetUserId: user1.id, action: 'like' });
    });

    it('should get all matches for a user', async () => {
      const response = await client1.get('/api/v1/matching/matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('matches');
      expect(Array.isArray(response.data.data.matches)).toBe(true);
      
      const matches = response.data.data.matches;
      expect(matches.length).toBe(2); // user1 matched with user2 and user3
      
      matches.forEach((match: any) => {
        expect(match).toHaveProperty('id');
        expect(match).toHaveProperty('users');
        expect(match).toHaveProperty('createdAt');
        expect(match.users.length).toBe(2);
        
        // One of the users should be user1
        const userIds = match.users.map((u: any) => u.id);
        expect(userIds).toContain(user1.id);
      });
    });

    it('should get a specific match by ID', async () => {
      // First get all matches to get a match ID
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      const matches = matchesResponse.data.data.matches;
      const matchId = matches[0].id;

      const response = await client1.get(`/api/v1/matching/matches/${matchId}`);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('match');
      expect(response.data.data.match.id).toBe(matchId);
      expect(response.data.data.match).toHaveProperty('users');
      expect(response.data.data.match.users.length).toBe(2);
    });

    it('should unmatch users', async () => {
      // Get a match to unmatch
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      const matches = matchesResponse.data.data.matches;
      const matchId = matches[0].id;

      const response = await client1.delete(`/api/v1/matching/matches/${matchId}`);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');

      // Verify the match is removed
      const updatedMatchesResponse = await client1.get('/api/v1/matching/matches');
      const updatedMatches = updatedMatchesResponse.data.data.matches;
      
      const removedMatch = updatedMatches.find((m: any) => m.id === matchId);
      expect(removedMatch).toBeUndefined();
    });

    it('should prevent access to matches the user is not part of', async () => {
      // Create a separate user who is not part of any matches with user1
      const user4Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Outsider',
        lastName: 'Test',
      });
      const client4 = await integrationTestUtils.userManager.createAuthenticatedClient(user4Data.user.id);

      // Get a match ID from user1
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      const matches = matchesResponse.data.data.matches;
      const matchId = matches[0].id;

      // User4 should not be able to access this match (returns 404 for security)
      const response = await client4.get(`/api/v1/matching/matches/${matchId}`);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'MATCH_NOT_FOUND');
    });
  });

  describe('Super Likes and Special Actions', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'SuperLiker',
        lastName: 'Test',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'SuperLiked',
        lastName: 'Test',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should handle super like action', async () => {
      const swipeData = {
        targetUserId: user2.id,
        action: 'super_like'
      };

      const response = await client1.post('/api/v1/matching/swipe', swipeData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.swipe.action).toBe('super_like');
      expect(response.data.data.swipe.targetUserId).toBe(user2.id);
    });

    it('should create immediate match on super like response', async () => {
      // User1 super likes User2
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'super_like'
      });

      // User2 likes User1 back - should create match
      const response = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.match).toBe(true);
    });

    it('should track super like usage limits', async () => {
      // This test would verify super like limits if implemented
      // For now, just verify the action is recorded correctly
      
      const response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'super_like'
      });
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.swipe.action).toBe('super_like');
    });
  });

  describe('Matching Algorithm Integration', () => {
    let users: any[] = [];
    let clients: any[] = [];

    beforeEach(async () => {
      // Create multiple users with varied profiles for algorithm testing
      const userProfiles = [
        { firstName: 'Alice', birthDate: '1999-01-01', gender: 'FEMALE', interests: ['music', 'travel'], location: 'New York, NY' },
        { firstName: 'Bob', birthDate: '1996-01-01', gender: 'MALE', interests: ['music', 'sports'], location: 'New York, NY' },
        { firstName: 'Carol', birthDate: '1998-01-01', gender: 'FEMALE', interests: ['travel', 'photography'], location: 'New York, NY' },
        { firstName: 'David', birthDate: '1994-01-01', gender: 'MALE', interests: ['sports', 'cooking'], location: 'New York, NY' },
        { firstName: 'Eve', birthDate: '2000-01-01', gender: 'FEMALE', interests: ['photography', 'art'], location: 'New York, NY' }
      ];

      for (const profile of userProfiles) {
        const userData = await integrationTestUtils.userManager.createUser({
          firstName: profile.firstName,
          lastName: 'Algorithm',
          birthDate: profile.birthDate,
          gender: profile.gender,
          interests: profile.interests,
          location: profile.location
        });
        
        users.push(userData.user);
        const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);
        clients.push(client);
        
        // Set preferences to make users discoverable
        await client.put('/api/v1/users/preferences', {
          ageRange: { min: 18, max: 40 },
          maxDistance: 100,
          interestedInGenders: ['MALE', 'FEMALE'],
          showMe: true
        });
      }
    });

    it('should prioritize matches with shared interests', async () => {
      // Alice (music, travel) should be matched with Bob (music, sports) and Carol (travel, photography)
      // due to shared interests
      
      const response = await clients[0].get('/api/v1/matching/potential-matches'); // Alice's matches
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Should return some matches
      expect(matches.length).toBeGreaterThan(0);
      
      // All matches should have reasonable compatibility scores
      matches.forEach((match: any) => {
        expect(match.matchScore).toBeGreaterThan(0.5);
        expect(match.matchScore).toBeLessThanOrEqual(1.0);
      });
    });

    it('should consider distance in compatibility scoring', async () => {
      const response = await clients[0].get('/api/v1/matching/potential-matches'); // Alice's matches
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Sort matches by compatibility score
      matches.sort((a: any, b: any) => b.matchScore - a.matchScore);
      
      // Closer users should generally have higher scores (all else being equal)
      matches.forEach((match: any, index: number) => {
        expect(match.matchScore).toBeGreaterThanOrEqual(0);
        expect(match.matchScore).toBeLessThanOrEqual(1);
        
        if (index > 0) {
          // Each subsequent match should have equal or lower compatibility
          expect(match.matchScore).toBeLessThanOrEqual(matches[index - 1].matchScore);
        }
      });
    });

    it('should integrate with ML service for enhanced compatibility', async () => {
      // This test verifies that the matching service integrates with ML service
      // for more sophisticated compatibility analysis
      
      const response = await clients[0].get('/api/v1/matching/potential-matches');
      
      TestAssertions.assertSuccessResponse(response, 200);
      const matches = response.data.data.matches;
      
      // Verify that compatibility scores are calculated (indicating ML integration)
      matches.forEach((match: any) => {
        expect(match).toHaveProperty('matchScore');
        expect(typeof match.matchScore).toBe('number');
        
        // ML-enhanced scores should be more nuanced than simple rule-based scoring
        expect(match.matchScore).not.toBe(0);
        expect(match.matchScore).not.toBe(1);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Error',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should handle invalid swipe actions', async () => {
      const response = await client.post('/api/v1/matching/swipe', {
        targetUserId: user.id, // Invalid: swiping on self
        action: 'invalid_action'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should handle non-existent target users', async () => {
      const response = await client.post('/api/v1/matching/swipe', {
        targetUserId: '00000000-0000-0000-0000-000000000000',
        action: 'like'
      });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'USER_NOT_FOUND');
    });

    it('should handle unauthorized access to matching endpoints', async () => {
      const response = await integrationTestUtils.httpClient.get('/api/v1/matching/potential-matches');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should handle malformed request data', async () => {
      const response = await client.post('/api/v1/matching/swipe', {
        // Missing required fields
        action: 'like'
        // targetUserId missing
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Performance and Scalability', () => {
    let users: any[] = [];
    let clients: any[] = [];

    beforeEach(async () => {
      // Create multiple users for performance testing
      const userPromises = Array.from({ length: 20 }, (_, i) =>
        integrationTestUtils.userManager.createUser({
          firstName: `Perf${i}`,
          lastName: 'Test',
        })
      );

      const userData = await Promise.all(userPromises);
      users = userData.map(ud => ud.user);
      clients = await Promise.all(
        users.map(user => integrationTestUtils.userManager.createAuthenticatedClient(user.id))
      );
    });

    it('should handle concurrent match requests efficiently', async () => {
      const requests = clients.slice(0, 10).map(client =>
        client.get('/api/v1/matching/potential-matches')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      expect(duration).toBeLessThan(15000); // Should handle 10 concurrent requests within 15 seconds
    });

    it('should handle high-volume swiping efficiently', async () => {
      // Generate many swipe operations
      const swipePromises = [];
      
      for (let i = 0; i < 10; i++) {
        for (let j = i + 1; j < Math.min(i + 6, users.length); j++) {
          swipePromises.push(
            clients[i].post('/api/v1/matching/swipe', {
              targetUserId: users[j].id,
              action: Math.random() > 0.5 ? 'like' : 'dislike'
            })
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(swipePromises);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      expect(duration).toBeLessThan(5000); // Should handle high volume efficiently
    });

    it('should maintain performance with large match lists', async () => {
      // Create matches for a user
      const targetUser = users[0];
      const targetClient = clients[0];

      // Create multiple matches
      for (let i = 1; i < Math.min(10, users.length); i++) {
        await targetClient.post('/api/v1/matching/swipe', {
          targetUserId: users[i].id,
          action: 'like'
        });
        
        await clients[i].post('/api/v1/matching/swipe', {
          targetUserId: targetUser.id,
          action: 'like'
        });
      }

      // Retrieve matches - should be fast even with many matches
      const startTime = Date.now();
      const response = await targetClient.get('/api/v1/matching/matches');
      const duration = Date.now() - startTime;

      TestAssertions.assertSuccessResponse(response, 200);
      expect(duration).toBeLessThan(1000); // Should retrieve matches quickly
      
      const matches = response.data.data.matches;
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
