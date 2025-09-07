// Integration test for matching service workflow
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Matching Service Integration', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('User Matching Workflow', () => {
    let user1: any, user2: any, user3: any;
    let token1: string, token2: string, token3: string;

    beforeEach(async () => {
      // Create three test users
      const user1Data = await integrationTestUtils.userManager.createUser({
        email: 'matching-user1@example.com',
        username: 'matchinguser1',
        firstName: 'Alice',
        lastName: 'Johnson',
        age: 25,
      });
      user1 = user1Data.user;
      token1 = user1Data.token;

      const user2Data = await integrationTestUtils.userManager.createUser({
        email: 'matching-user2@example.com',
        username: 'matchinguser2',
        firstName: 'Bob',
        lastName: 'Smith',
        age: 28,
      });
      user2 = user2Data.user;
      token2 = user2Data.token;

      const user3Data = await integrationTestUtils.userManager.createUser({
        email: 'matching-user3@example.com',
        username: 'matchinguser3',
        firstName: 'Charlie',
        lastName: 'Brown',
        age: 30,
      });
      user3 = user3Data.user;
      token3 = user3Data.token;
    });

    it('should get user recommendations', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      const recommendationsResponse = await client1.get('/api/v1/matching/recommendations');
      
      TestAssertions.assertSuccessResponse(recommendationsResponse, 200);
      expect(recommendationsResponse.data.data).toHaveProperty('recommendations');
      expect(Array.isArray(recommendationsResponse.data.data.recommendations)).toBe(true);
      
      // Should recommend other users (user2 and user3)
      const recommendations = recommendationsResponse.data.data.recommendations;
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check that recommended users are not the current user
      recommendations.forEach((rec: any) => {
        expect(rec.id).not.toBe(user1.id);
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('username');
        expect(rec).toHaveProperty('firstName');
        expect(rec).toHaveProperty('lastName');
        expect(rec).toHaveProperty('age');
      });
    });

    it('should handle swipe actions', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      // User1 swipes right on User2
      const swipeResponse = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipeResponse, 200);
      expect(swipeResponse.data.data).toHaveProperty('success', true);
      expect(swipeResponse.data.data).toHaveProperty('action', 'like');
      expect(swipeResponse.data.data).toHaveProperty('targetUserId', user2.id);
    });

    it('should create match when both users swipe right', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
      
      // User1 swipes right on User2
      const swipe1Response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipe1Response, 200);
      
      // User2 swipes right on User1 (mutual like)
      const swipe2Response = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipe2Response, 200);
      
      // Check that both users now have a match
      const matches1Response = await client1.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches1Response, 200);
      expect(matches1Response.data.data).toHaveProperty('matches');
      expect(Array.isArray(matches1Response.data.data.matches)).toBe(true);
      
      const matches1 = matches1Response.data.data.matches;
      expect(matches1.length).toBe(1);
      expect(matches1[0].userId).toBe(user2.id);
      expect(matches1[0]).toHaveProperty('matchedAt');
      
      const matches2Response = await client2.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches2Response, 200);
      
      const matches2 = matches2Response.data.data.matches;
      expect(matches2.length).toBe(1);
      expect(matches2[0].userId).toBe(user1.id);
    });

    it('should not create match when only one user swipes right', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
      
      // User1 swipes right on User2
      const swipe1Response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipe1Response, 200);
      
      // User2 swipes left on User1 (no match)
      const swipe2Response = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'pass'
      });
      
      TestAssertions.assertSuccessResponse(swipe2Response, 200);
      
      // Check that no match was created
      const matches1Response = await client1.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches1Response, 200);
      
      const matches1 = matches1Response.data.data.matches;
      expect(matches1.length).toBe(0);
      
      const matches2Response = await client2.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches2Response, 200);
      
      const matches2 = matches2Response.data.data.matches;
      expect(matches2.length).toBe(0);
    });

    it('should handle super like action', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      // User1 super likes User2
      const superLikeResponse = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'super_like'
      });
      
      TestAssertions.assertSuccessResponse(superLikeResponse, 200);
      expect(superLikeResponse.data.data).toHaveProperty('action', 'super_like');
    });

    it('should prevent duplicate swipes', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      // First swipe
      const swipe1Response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertSuccessResponse(swipe1Response, 200);
      
      // Attempt duplicate swipe
      const swipe2Response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      TestAssertions.assertErrorResponse(swipe2Response, 409, 'ALREADY_SWIPED');
    });

    it('should validate swipe data', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      // Invalid action
      const invalidActionResponse = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'invalid_action'
      });
      
      TestAssertions.assertErrorResponse(invalidActionResponse, 400, 'VALIDATION_ERROR');
      
      // Missing targetUserId
      const missingTargetResponse = await client1.post('/api/v1/matching/swipe', {
        action: 'like'
      });
      
      TestAssertions.assertErrorResponse(missingTargetResponse, 400, 'VALIDATION_ERROR');
      
      // Invalid targetUserId
      const invalidTargetResponse = await client1.post('/api/v1/matching/swipe', {
        targetUserId: 'invalid-user-id',
        action: 'like'
      });
      
      TestAssertions.assertErrorResponse(invalidTargetResponse, 404, 'USER_NOT_FOUND');
    });
  });

  describe('Match Management', () => {
    let user1: any, user2: any;
    let token1: string, token2: string;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        email: 'match-mgmt-user1@example.com',
        username: 'matchmgmtuser1',
      });
      user1 = user1Data.user;
      token1 = user1Data.token;

      const user2Data = await integrationTestUtils.userManager.createUser({
        email: 'match-mgmt-user2@example.com',
        username: 'matchmgmtuser2',
      });
      user2 = user2Data.user;
      token2 = user2Data.token;

      // Create a match between users
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });
    });

    it('should get user matches', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      
      TestAssertions.assertSuccessResponse(matchesResponse, 200);
      expect(matchesResponse.data.data).toHaveProperty('matches');
      expect(Array.isArray(matchesResponse.data.data.matches)).toBe(true);
      
      const matches = matchesResponse.data.data.matches;
      expect(matches.length).toBe(1);
      
      const match = matches[0];
      expect(match).toHaveProperty('userId', user2.id);
      expect(match).toHaveProperty('username', user2.username);
      expect(match).toHaveProperty('firstName', user2.firstName);
      expect(match).toHaveProperty('lastName', user2.lastName);
      expect(match).toHaveProperty('matchedAt');
      expect(match).toHaveProperty('lastMessageAt');
    });

    it('should unmatch users', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      const unmatchResponse = await client1.delete(`/api/v1/matching/matches/${user2.id}`);
      
      TestAssertions.assertSuccessResponse(unmatchResponse, 200);
      
      // Verify match is removed
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matchesResponse, 200);
      
      const matches = matchesResponse.data.data.matches;
      expect(matches.length).toBe(0);
    });

    it('should handle unmatch of non-existent match', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      const unmatchResponse = await client1.delete('/api/v1/matching/matches/non-existent-user');
      
      TestAssertions.assertErrorResponse(unmatchResponse, 404, 'MATCH_NOT_FOUND');
    });
  });

  describe('Recommendation Algorithm', () => {
    let user1: any, user2: any, user3: any;
    let token1: string;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        email: 'rec-algo-user1@example.com',
        username: 'recalgouser1',
        age: 25,
      });
      user1 = user1Data.user;
      token1 = user1Data.token;

      const user2Data = await integrationTestUtils.userManager.createUser({
        email: 'rec-algo-user2@example.com',
        username: 'recalgouser2',
        age: 27, // Similar age
      });
      user2 = user2Data.user;

      const user3Data = await integrationTestUtils.userManager.createUser({
        email: 'rec-algo-user3@example.com',
        username: 'recalgouser3',
        age: 45, // Different age
      });
      user3 = user3Data.user;
    });

    it('should provide personalized recommendations', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      const recommendationsResponse = await client1.get('/api/v1/matching/recommendations');
      
      TestAssertions.assertSuccessResponse(recommendationsResponse, 200);
      expect(recommendationsResponse.data.data).toHaveProperty('recommendations');
      
      const recommendations = recommendationsResponse.data.data.recommendations;
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check recommendation structure
      recommendations.forEach((rec: any) => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('username');
        expect(rec).toHaveProperty('firstName');
        expect(rec).toHaveProperty('lastName');
        expect(rec).toHaveProperty('age');
        expect(rec).toHaveProperty('matchScore');
        expect(typeof rec.matchScore).toBe('number');
        expect(rec.matchScore).toBeGreaterThanOrEqual(0);
        expect(rec.matchScore).toBeLessThanOrEqual(1);
      });
    });

    it('should not recommend already swiped users', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      // Swipe on user2
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      
      // Get recommendations again
      const recommendationsResponse = await client1.get('/api/v1/matching/recommendations');
      
      TestAssertions.assertSuccessResponse(recommendationsResponse, 200);
      
      const recommendations = recommendationsResponse.data.data.recommendations;
      
      // User2 should not be in recommendations anymore
      const user2InRecs = recommendations.find((rec: any) => rec.id === user2.id);
      expect(user2InRecs).toBeUndefined();
    });
  });
});
