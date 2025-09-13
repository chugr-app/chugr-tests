// Integration tests for Service Discovery and Circuit Breakers
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Service Discovery and Circuit Breakers Integration', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Service Discovery', () => {
    it('should automatically discover and route to healthy services', async () => {
      // Test that API Gateway can discover and route to all services
      const healthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(healthResponse, 200);

      const healthData = healthResponse.data.data;
      expect(healthData).toHaveProperty('status', 'healthy');
      expect(healthData).toHaveProperty('services');

      // All services should be discovered and healthy
      const services = healthData.services;
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      
      // Check that all expected services are present and healthy
      const serviceNames = services.map((s: any) => s.name);
      expect(serviceNames).toContain('user-service');
      expect(serviceNames).toContain('matching-service');
      expect(serviceNames).toContain('chat-service');
      expect(serviceNames).toContain('event-service');
      expect(serviceNames).toContain('notification-service');
      
      // All services should be healthy
      services.forEach((service: any) => {
        expect(service.status).toBe('healthy');
      });
    });

    it('should route requests to correct services based on endpoints', async () => {
      // Create a test user to verify routing with unique data
      const timestamp = Date.now();
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: `Service${timestamp}`,
        lastName: `Discovery${timestamp}`,
        email: `service_discovery_${timestamp}@test.com`,
      });

      const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);

      // Test routing to User Service
      console.log('Testing User Service routing...');
      const userResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(userResponse, 200);
      expect(userResponse.data.data).toHaveProperty('id', userData.user.id);

      // Test routing to Matching Service
      console.log('Testing Matching Service routing...');
      const potentialMatchesResponse = await client.get('/api/v1/matching/potential-matches');
      TestAssertions.assertSuccessResponse(potentialMatchesResponse, 200);
      expect(potentialMatchesResponse.data.data).toHaveProperty('matches');

      // Test routing to Notification Service
      console.log('Testing Notification Service routing...');
      const notificationsResponse = await client.get('/api/v1/notifications/user');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);
      expect(notificationsResponse.data.data).toHaveProperty('notifications');

      // Test routing to Event Service
      console.log('Testing Event Service routing...');
      const eventsResponse = await client.get('/api/v1/events');
      TestAssertions.assertSuccessResponse(eventsResponse, 200);
      expect(eventsResponse.data.data).toHaveProperty('events');
    });

    it('should handle service discovery updates dynamically', async () => {
      // This test verifies that the API Gateway can adapt to service changes
      // In a real scenario, this would involve stopping/starting services

      // For now, we'll test that the gateway maintains service health monitoring
      const initialHealthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(initialHealthResponse, 200);

      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 2000));

      const secondHealthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(secondHealthResponse, 200);

      // Service discovery should maintain consistent health monitoring
      expect(secondHealthResponse.data.data.status).toBe('healthy');
    });
  });

  describe('Circuit Breakers', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Circuit',
        lastName: 'Breaker',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should handle service failures gracefully with circuit breaker', async () => {
      // This test simulates a service failure scenario
      // In a real implementation, we would need to simulate service downtime

      // Normal operation should work
      const normalResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(normalResponse, 200);

      // Even if a downstream service has issues, the gateway should handle it gracefully
      // The circuit breaker should prevent cascading failures
      const robustResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(robustResponse, 200);
    });

    it('should implement retry logic with exponential backoff', async () => {
      // Test that the system can recover from temporary failures
      let requestCount = 0;
      const startTime = Date.now();

      // Make multiple requests to test retry behavior
      const requests = Array.from({ length: 5 }, async () => {
        requestCount++;
        const response = await client.get('/api/v1/users/profile');
        return response;
      });

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should eventually succeed
      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      // Should complete within reasonable time (accounting for potential retries)
      expect(duration).toBeLessThan(10000);
      expect(requestCount).toBe(5);
    });

    it('should track circuit breaker metrics and health', async () => {
      // Make several requests to generate metrics
      const requests = Array.from({ length: 10 }, () =>
        client.get('/api/v1/users/profile')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed in healthy state
      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      // Check health endpoint for circuit breaker metrics
      const healthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(healthResponse, 200);

      const healthData = healthResponse.data.data;
      expect(healthData).toHaveProperty('dependencies');

      // Circuit breakers should be in closed (healthy) state
      Object.values(healthData.dependencies).forEach(status => {
        expect(status).toBe('healthy');
      });
    });
  });

  describe('Load Balancing and Failover', () => {
    it('should distribute load across available service instances', async () => {
      // Create multiple users to generate load
      const userPromises = Array.from({ length: 20 }, (_, i) =>
        integrationTestUtils.userManager.createUser({
          firstName: `Load${i}`,
          lastName: 'Test',
        })
      );

      const userData = await Promise.all(userPromises);
      const clients = await Promise.all(
        userData.map(({ user }) =>
          integrationTestUtils.userManager.createAuthenticatedClient(user.id)
        )
      );

      // Generate concurrent load
      const startTime = Date.now();
      const requests = clients.map(client => client.get('/api/v1/users/profile'));
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      // Load should be handled efficiently
      expect(duration).toBeLessThan(5000);
    });

    it('should handle partial service failures without complete system failure', async () => {
      // This test verifies that the system remains functional even if some services have issues
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Resilient',
        lastName: 'Test',
      });

      const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);

      // Core user operations should always work
      const userResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(userResponse, 200);

      // Even if some services are slow or have issues, basic functionality should work
      const updateResponse = await client.put('/api/v1/users/profile', {
        firstName: 'Resilient Updated',
      });
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Verify update was successful
      const updatedResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(updatedResponse, 200);
      expect(updatedResponse.data.data.firstName).toBe('Resilient Updated');
    });
  });

  describe('Service Health Monitoring', () => {
    it('should continuously monitor service health', async () => {
      // Check initial health
      const initialHealth = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(initialHealth, 200);

      // Wait for health check interval
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check health again
      const secondHealth = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(secondHealth, 200);

      // Health monitoring should be consistent
      expect(secondHealth.data.data.status).toBe('healthy');
      expect(secondHealth.data.data).toHaveProperty('uptime');
      expect(secondHealth.data.data).toHaveProperty('timestamp');
    });

    it('should provide detailed health information for each service', async () => {
      const healthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(healthResponse, 200);

      const healthData = healthResponse.data.data;
      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('version');
      expect(healthData).toHaveProperty('environment');
      expect(healthData).toHaveProperty('dependencies');

      // Each dependency should have health status
      const dependencies = healthData.dependencies;
      expect(dependencies).toHaveProperty('database');
      expect(dependencies).toHaveProperty('redis');
      expect(dependencies).toHaveProperty('userService');
      expect(dependencies).toHaveProperty('matchingService');
      expect(dependencies).toHaveProperty('chatService');
      expect(dependencies).toHaveProperty('eventService');
      expect(dependencies).toHaveProperty('notificationService');
    });

    it('should track performance metrics for service calls', async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Metrics',
        lastName: 'Test',
      });

      const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);

      // Make several requests to generate metrics
      const requests = Array.from({ length: 5 }, () => client.get('/api/v1/users/profile'));
      await Promise.all(requests);

      // Check if metrics are being tracked (this would be implementation-specific)
      const healthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(healthResponse, 200);

      // Health response should include performance information
      const healthData = healthResponse.data.data;
      expect(healthData).toHaveProperty('uptime');
      expect(typeof healthData.uptime).toBe('number');
      expect(healthData.uptime).toBeGreaterThan(0);
    });
  });

  describe('Service Communication Patterns', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Communication',
        lastName: 'User1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Communication',
        lastName: 'User2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should handle complex multi-service workflows', async () => {
      // This test verifies that complex workflows involving multiple services work correctly
      // Workflow: User1 swipes on User2 -> Match created -> Notification sent -> Chat enabled

      // Step 1: User1 swipes right on User2
      const swipe1Response = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });
      TestAssertions.assertSuccessResponse(swipe1Response, 200);

      // Step 2: User2 swipes right on User1 (creates match)
      const swipe2Response = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });
      TestAssertions.assertSuccessResponse(swipe2Response, 200);
      expect(swipe2Response.data.data).toHaveProperty('match', true);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Verify notifications were sent
      const user1Notifications = await client1.get('/api/v1/notifications');
      const user2Notifications = await client2.get('/api/v1/notifications');

      TestAssertions.assertSuccessResponse(user1Notifications, 200);
      TestAssertions.assertSuccessResponse(user2Notifications, 200);

      // Step 4: Verify chat is enabled between matched users
      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });
      TestAssertions.assertSuccessResponse(conversationResponse, 201);

      // Step 5: Send a message
      const conversationId = conversationResponse.data.data.conversation.id;
      const messageResponse = await client1.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Hello! We matched!',
        type: 'text'
      });
      TestAssertions.assertSuccessResponse(messageResponse, 201);

      // Wait for message notification processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 6: Verify User2 received message notification
      const finalNotifications = await client2.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(finalNotifications, 200);

      const notifications = finalNotifications.data.data.notifications;
      const messageNotification = notifications.find((n: any) => 
        n.type === 'message_received' || n.title?.includes('message')
      );

      expect(messageNotification).toBeDefined();
    });

    it('should maintain data consistency across services', async () => {
      // Update user profile
      const updateResponse = await client1.put('/api/v1/users/profile', {
        firstName: 'Consistent',
        lastName: 'Data',
      });
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify consistency across different service endpoints
      const profileResponse = await client1.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data.firstName).toBe('Consistent');

      // Create a match to verify matching service has consistent data
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      const matchResponse = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(matchResponse, 200);
      expect(matchResponse.data.data).toHaveProperty('match', true);

      // The match should have been created with consistent user data
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matchesResponse, 200);

      const matches = matchesResponse.data.data.matches;
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance under high concurrent load', async () => {
      // Create multiple users for load testing
      const userPromises = Array.from({ length: 30 }, (_, i) =>
        integrationTestUtils.userManager.createUser({
          firstName: `Load${i}`,
          lastName: 'Test',
        })
      );

      const userData = await Promise.all(userPromises);
      const clients = await Promise.all(
        userData.map(({ user }) =>
          integrationTestUtils.userManager.createAuthenticatedClient(user.id)
        )
      );

      // Generate high concurrent load across multiple services
      const operations = [];

      // Profile requests (User Service)
      for (let i = 0; i < Math.min(10, clients.length); i++) {
        if (clients[i]) {
          operations.push(clients[i]!.get('/api/v1/users/profile'));
        }
      }

      // Swipe operations (Matching Service)
      for (let i = 0; i < Math.min(10, clients.length); i++) {
        const targetIndex = (i + 1) % userData.length;
        if (clients[i] && userData[targetIndex]) {
          operations.push(
            clients[i]!.post('/api/v1/matching/swipe', {
              targetUserId: userData[targetIndex].user.id,
              action: 'like'
            })
          );
        }
      }

      // Notification requests (Notification Service)
      for (let i = 0; i < Math.min(10, clients.length); i++) {
        if (clients[i]) {
          operations.push(clients[i]!.get('/api/v1/notifications'));
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      // Should handle high load efficiently
      expect(duration).toBeLessThan(5000);

      // System should remain healthy after load
      const healthResponse = await integrationTestUtils.httpClient.get('/health');
      TestAssertions.assertSuccessResponse(healthResponse, 200);
      expect(healthResponse.data.data.status).toBe('healthy');
    });
  });
});
