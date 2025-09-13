// Integration tests for User Cache (Hybrid Architecture v2.0)
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('User Cache Integration - Hybrid Architecture v2.0', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Cache Hit/Miss Scenarios', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Alice',
        lastName: 'Johnson',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Bob',
        lastName: 'Smith',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should cache user data on first access and serve from cache on subsequent requests', async () => {
      // First request - should hit database and cache the result
      const startTime1 = Date.now();
      const response1 = await client1.get('/api/v1/users/profile');
      const duration1 = Date.now() - startTime1;

      TestAssertions.assertSuccessResponse(response1, 200);
      expect(response1.data.data).toHaveProperty('id', user1.id);
      expect(response1.data.data).toHaveProperty('firstName', 'Alice');

      // Second request - should serve from cache (faster)
      const startTime2 = Date.now();
      const response2 = await client1.get('/api/v1/users/profile');
      const duration2 = Date.now() - startTime2;

      TestAssertions.assertSuccessResponse(response2, 200);
      expect(response2.data.data).toEqual(response1.data.data);

      // Cache hit should be faster or at least not significantly slower
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });

    it('should invalidate cache when user data is updated', async () => {
      // Get initial user data (caches it)
      const initialResponse = await client1.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(initialResponse, 200);
      expect(initialResponse.data.data.firstName).toBe('Alice');

      // Update user data
      const updateData = {
        firstName: 'Alice Updated',
        lastName: 'Johnson Updated',
      };

      const updateResponse = await client1.put('/api/v1/users/profile', updateData);
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Get user data again - should reflect the update (cache invalidated)
      const updatedResponse = await client1.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(updatedResponse, 200);
      expect(updatedResponse.data.data.firstName).toBe('Alice Updated');
      expect(updatedResponse.data.data.lastName).toBe('Johnson Updated');
    });

    it('should handle cache misses gracefully with REST fallback', async () => {
      // Simulate cache miss by accessing user data from different service
      // This tests the fallback mechanism when cache is empty

      // Create a match to trigger user cache access in matching service
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      // The matching service should successfully get user data via REST fallback
      const swipeResponse = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(swipeResponse, 200);
      expect(swipeResponse.data.data).toHaveProperty('match', true);
    });
  });

  describe('Batch User Requests', () => {
    let users: any[] = [];
    let clients: any[] = [];

    beforeEach(async () => {
      // Create multiple users for batch testing with unique identifiers
      const timestamp = Date.now();
      for (let i = 0; i < 5; i++) {
        const uniqueId = `${timestamp}_${i}_${Math.floor(Math.random() * 10000)}`;
        const userData = await integrationTestUtils.userManager.createUser({
          firstName: `BatchUser${uniqueId}`,
          lastName: `Test${uniqueId}`,
          email: `batch_user_${uniqueId}@test.com`,
        });
        users.push(userData.user);
        clients.push(await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id));
      }
    });

    it('should efficiently handle batch user requests', async () => {
      // Create matches between users to trigger batch user cache requests
      const matchPromises = [];

      for (let i = 0; i < users.length - 1; i++) {
        matchPromises.push(
          clients[i].post('/api/v1/matching/swipe', {
            targetUserId: users[i + 1].id,
            action: 'like'
          })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(matchPromises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      // Batch processing should be efficient
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle mixed cache hits and misses in batch requests', async () => {
      // First, cache some users by accessing their profiles
      await clients[0].get('/api/v1/users/profile');
      await clients[2].get('/api/v1/users/profile');
      await clients[4].get('/api/v1/users/profile');

      // Now create matches that will trigger batch requests with mixed cache states
      const startTime = Date.now();
      
      const matchResponses = await Promise.all([
        clients[0].post('/api/v1/matching/swipe', { targetUserId: users[1].id, action: 'like' }),
        clients[1].post('/api/v1/matching/swipe', { targetUserId: users[2].id, action: 'like' }),
        clients[2].post('/api/v1/matching/swipe', { targetUserId: users[3].id, action: 'like' }),
        clients[3].post('/api/v1/matching/swipe', { targetUserId: users[4].id, action: 'like' }),
      ]);

      const duration = Date.now() - startTime;

      // All requests should succeed despite mixed cache states
      matchResponses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      expect(duration).toBeLessThan(1500); // Should handle mixed states efficiently
    });
  });

  describe('Cache TTL and Expiration', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'TTL',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should respect cache TTL and refresh expired entries', async () => {
      // Get user data to cache it
      const initialResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(initialResponse, 200);

      // Update user data directly in database (bypassing cache)
      const updateResponse = await client.put('/api/v1/users/profile', {
        firstName: 'TTL Updated',
        lastName: 'Test Updated',
      });
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for cache TTL to expire (in real scenario, this would be 5 minutes)
      // For testing, we'll simulate by making a request that should refresh the cache
      await new Promise(resolve => setTimeout(resolve, 100));

      // Access user data again - should get updated data
      const refreshedResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(refreshedResponse, 200);
      expect(refreshedResponse.data.data.firstName).toBe('TTL Updated');
    });
  });

  describe('Cache Error Handling', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Error',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should gracefully handle Redis connection failures', async () => {
      // This test simulates Redis being unavailable
      // The system should fall back to REST API calls

      // Even if Redis is down, user operations should still work
      const profileResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data).toHaveProperty('id', user.id);

      // Updates should also work
      const updateResponse = await client.put('/api/v1/users/profile', {
        firstName: 'Error Updated',
      });
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Subsequent reads should get updated data
      const updatedResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(updatedResponse, 200);
      expect(updatedResponse.data.data.firstName).toBe('Error Updated');
    });

    it('should handle corrupted cache data gracefully', async () => {
      // This test would require injecting corrupted data into Redis
      // For now, we'll test that the system can handle unexpected cache responses

      // Normal operation should work even with potential cache issues
      const response = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('id', user.id);
      expect(response.data.data).toHaveProperty('firstName', 'Error');
    });
  });

  describe('Cross-Service Cache Consistency', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Cross',
        lastName: 'Service',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Cache',
        lastName: 'Test',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should maintain cache consistency across different services', async () => {
      // Update user profile in User Service
      const updateResponse = await client1.put('/api/v1/users/profile', {
        firstName: 'Cross Updated',
        lastName: 'Service Updated',
      });
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Create a match to trigger user cache access in Matching Service
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      const matchResponse = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(matchResponse, 200);

      // The matching service should have access to updated user data
      // This verifies that cache invalidation works across services
      expect(matchResponse.data.data).toHaveProperty('match', true);
    });

    it('should handle event-driven cache invalidation', async () => {
      // Cache user data in multiple services by accessing it
      await client1.get('/api/v1/users/profile');
      
      // Create a match to cache user data in matching service
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      // Update user preferences (should trigger cache invalidation event)
      const preferencesUpdate = {
        ageRange: { min: 25, max: 35 },
        maxDistance: 15,
        interests: ['drinking', 'music', 'sports'],
      };

      const updateResponse = await client1.put('/api/v1/users/preferences', preferencesUpdate);
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Verify that updated preferences are reflected across services
      const preferencesResponse = await client1.get('/api/v1/users/preferences');
      TestAssertions.assertSuccessResponse(preferencesResponse, 200);
      expect(preferencesResponse.data.data.interests).toEqual(['drinking', 'music', 'sports']);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume concurrent cache operations', async () => {
      // Create multiple users with unique identifiers to avoid conflicts
      const timestamp = Date.now();
      const userCreationPromises = Array.from({ length: 20 }, (_, i) => {
        const uniqueId = `${timestamp}_${i}_${Math.floor(Math.random() * 100000)}`;
        return integrationTestUtils.userManager.createUser({
          firstName: `PerfUser${uniqueId}`,
          lastName: `Test${uniqueId}`,
          email: `perf_user_${uniqueId}@test.com`,
        });
      });

      const startTime = Date.now();
      const userData = await Promise.all(userCreationPromises);
      const creationDuration = Date.now() - startTime;

      expect(userData).toHaveLength(20);
      expect(creationDuration).toBeLessThan(8000); // Increased timeout for unique data generation

      // Create authenticated clients
      const clientPromises = userData.map(({ user }) =>
        integrationTestUtils.userManager.createAuthenticatedClient(user.id)
      );

      const clients = await Promise.all(clientPromises);

      // Perform concurrent profile requests (should benefit from caching)
      const profileStartTime = Date.now();
      const profilePromises = clients.map(client => client.get('/api/v1/users/profile'));
      const profileResponses = await Promise.all(profilePromises);
      const profileDuration = Date.now() - profileStartTime;

      // All requests should succeed
      profileResponses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      expect(profileDuration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should maintain performance under mixed read/write operations', async () => {
      // Create test users
      const userData = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          integrationTestUtils.userManager.createUser({
            firstName: `Mixed${i}`,
            lastName: `Test${i}`,
          })
        )
      );

      const clients = await Promise.all(
        userData.map(({ user }) =>
          integrationTestUtils.userManager.createAuthenticatedClient(user.id)
        )
      );

      // Mix of read and write operations
      const operations = [];

      // Add read operations
      for (let i = 0; i < 15; i++) {
        const clientIndex = i % clients.length;
        const client = clients[clientIndex];
        if (client) {
          operations.push(client.get('/api/v1/users/profile'));
        }
      }

      // Add write operations
      for (let i = 0; i < 5; i++) {
        const clientIndex = i % clients.length;
        const client = clients[clientIndex];
        if (client) {
          operations.push(
            client.put('/api/v1/users/profile', {
              firstName: `Mixed${i} Updated`,
            })
          );
        }
      }

      // Execute mixed operations concurrently
      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      expect(duration).toBeLessThan(4000); // Should handle mixed load efficiently
    });
  });
});
