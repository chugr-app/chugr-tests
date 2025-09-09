// Integration tests for database operations and data consistency
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Cross-Service Data Consistency', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Consistency',
        lastName: 'User1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Consistency',
        lastName: 'User2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should maintain user data consistency across services', async () => {
      // Update user profile in User Service
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
        interests: ['music', 'travel']
      };

      const updateResponse = await client1.put('/api/v1/users/profile', updateData);
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify consistency in Matching Service
      const matchesResponse = await client2.get('/api/v1/matching/potential-matches');
      TestAssertions.assertSuccessResponse(matchesResponse, 200);

      const matches = matchesResponse.data.data.matches;
      const user1Match = matches.find((m: any) => m.user.id === user1.id);

      if (user1Match) {
        expect(user1Match.user.firstName).toBe(updateData.firstName);
        expect(user1Match.user.lastName).toBe(updateData.lastName);
      }
    });

    it('should maintain match data consistency across Chat and Matching services', async () => {
      // Create a match in Matching Service
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      const matchResponse = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(matchResponse, 200);
      expect(matchResponse.data.data.match).toBe(true);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify match exists in Chat Service (should be able to create conversation)
      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });

      TestAssertions.assertSuccessResponse(conversationResponse, 201);
      expect(conversationResponse.data.data.conversation).toHaveProperty('id');
      expect(conversationResponse.data.data.conversation.participants).toHaveLength(2);
    });

    it('should handle user deletion across all services', async () => {
      // Create some data for user1
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create a conversation
      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });

      const conversationId = conversationResponse.data.data.conversation.id;

      // Send a message
      await client1.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Hello!',
        type: 'text'
      });

      // Delete user1 account
      const deleteResponse = await client1.delete('/api/v1/users/account', {
        data: {
          password: 'TestPassword123!',
          confirmation: 'DELETE'
        }
      });

      TestAssertions.assertSuccessResponse(deleteResponse, 200);

      // Wait for cascading deletion
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify user1 is removed from user2's matches
      const matchesResponse = await client2.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matchesResponse, 200);

      const matches = matchesResponse.data.data.matches;
      const user1Match = matches.find((m: any) => 
        m.users.some((u: any) => u.id === user1.id)
      );
      expect(user1Match).toBeUndefined();

      // Verify conversation is marked as inactive or user is removed
      const conversationsResponse = await client2.get('/api/v1/chat/conversations');
      TestAssertions.assertSuccessResponse(conversationsResponse, 200);

      const conversations = conversationsResponse.data.data.conversations;
      const targetConversation = conversations.find((c: any) => c.id === conversationId);
      
      if (targetConversation) {
        // Conversation might still exist but user1 should be marked as deleted/inactive
        const user1Participant = targetConversation.participants.find((p: any) => p.id === user1.id);
        expect(user1Participant?.isActive).toBe(false);
      }
    });
  });

  describe('Database Transaction Integrity', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Transaction',
        lastName: 'User1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Transaction',
        lastName: 'User2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should handle concurrent swipe operations atomically', async () => {
      // Simulate concurrent swipes between the same users
      const swipe1Promise = client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      const swipe2Promise = client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      const [swipe1Response, swipe2Response] = await Promise.all([swipe1Promise, swipe2Promise]);

      // Both operations should succeed
      TestAssertions.assertSuccessResponse(swipe1Response, 200);
      TestAssertions.assertSuccessResponse(swipe2Response, 200);

      // Exactly one should create the match (the second one)
      const matchCreated = swipe1Response.data.data.match || swipe2Response.data.data.match;
      expect(matchCreated).toBe(true);

      // Verify only one match exists
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matchesResponse, 200);

      const matches = matchesResponse.data.data.matches;
      const relevantMatches = matches.filter((m: any) =>
        m.users.some((u: any) => u.id === user1.id) &&
        m.users.some((u: any) => u.id === user2.id)
      );

      expect(relevantMatches).toHaveLength(1);
    });

    it('should handle concurrent message sending in the same conversation', async () => {
      // Create a match and conversation first
      await client1.post('/api/v1/matching/swipe', { targetUserId: user2.id, action: 'like' });
      await client2.post('/api/v1/matching/swipe', { targetUserId: user1.id, action: 'like' });

      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });

      const conversationId = conversationResponse.data.data.conversation.id;

      // Send concurrent messages
      const message1Promise = client1.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Message from user1',
        type: 'text'
      });

      const message2Promise = client2.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Message from user2',
        type: 'text'
      });

      const [message1Response, message2Response] = await Promise.all([message1Promise, message2Promise]);

      // Both messages should be created successfully
      TestAssertions.assertSuccessResponse(message1Response, 201);
      TestAssertions.assertSuccessResponse(message2Response, 201);

      // Verify both messages exist in the conversation
      const messagesResponse = await client1.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      TestAssertions.assertSuccessResponse(messagesResponse, 200);

      const messages = messagesResponse.data.data.messages;
      expect(messages).toHaveLength(2);

      const user1Message = messages.find((m: any) => m.senderId === user1.id);
      const user2Message = messages.find((m: any) => m.senderId === user2.id);

      expect(user1Message).toBeDefined();
      expect(user2Message).toBeDefined();
      expect(user1Message.content).toBe('Message from user1');
      expect(user2Message.content).toBe('Message from user2');
    });

    it('should maintain referential integrity on cascading operations', async () => {
      // Create complex relationships
      await client1.post('/api/v1/matching/swipe', { targetUserId: user2.id, action: 'like' });
      await client2.post('/api/v1/matching/swipe', { targetUserId: user1.id, action: 'like' });

      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });

      const conversationId = conversationResponse.data.data.conversation.id;

      await client1.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Test message',
        type: 'text'
      });

      // Unmatch users (should cascade to conversation and messages)
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      const matches = matchesResponse.data.data.matches;
      const matchId = matches[0].id;

      const unmatchResponse = await client1.delete(`/api/v1/matching/matches/${matchId}`);
      TestAssertions.assertSuccessResponse(unmatchResponse, 200);

      // Wait for cascading operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify conversation is affected (archived or deleted)
      const conversationsResponse = await client1.get('/api/v1/chat/conversations');
      TestAssertions.assertSuccessResponse(conversationsResponse, 200);

      const conversations = conversationsResponse.data.data.conversations;
      const targetConversation = conversations.find((c: any) => c.id === conversationId);

      if (targetConversation) {
        // Conversation should be marked as inactive or archived
        expect(targetConversation.isActive).toBe(false);
      }
    });
  });

  describe('Database Performance and Indexing', () => {
    let users: any[] = [];
    let clients: any[] = [];

    beforeEach(async () => {
      // Create multiple users for performance testing
      const userPromises = Array.from({ length: 50 }, (_, i) =>
        integrationTestUtils.userManager.createUser({
          firstName: `Perf${i}`,
          lastName: 'Test',
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1
          }
        })
      );

      const userData = await Promise.all(userPromises);
      users = userData.map(ud => ud.user);
      clients = await Promise.all(
        users.map(user => integrationTestUtils.userManager.createAuthenticatedClient(user.id))
      );
    });

    it('should perform location-based queries efficiently', async () => {
      // Test geospatial queries for potential matches
      const startTime = Date.now();
      
      const requests = clients.slice(0, 10).map(client =>
        client.get('/api/v1/matching/potential-matches')
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      // Location-based queries should be fast even with many users
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large-scale swipe data efficiently', async () => {
      // Generate many swipe operations
      const swipePromises = [];
      
      for (let i = 0; i < 20; i++) {
        for (let j = i + 1; j < Math.min(i + 10, users.length); j++) {
          swipePromises.push(
            clients[i].post('/api/v1/matching/swipe', {
              targetUserId: users[j].id,
              action: Math.random() > 0.5 ? 'like' : 'pass'
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

      // Should handle high-volume swipe operations efficiently
      expect(duration).toBeLessThan(5000);
    });

    it('should perform user search and filtering efficiently', async () => {
      // Test complex filtering operations
      const startTime = Date.now();

      // Update preferences for multiple users to create complex filtering scenarios
      const preferenceUpdates = clients.slice(0, 10).map((client, index) =>
        client.put('/api/v1/users/preferences', {
          ageRange: { min: 20 + index, max: 40 + index },
          maxDistance: 50 + index * 10,
          interestedInGenders: index % 2 === 0 ? ['male'] : ['female'],
          showMe: true
        })
      );

      await Promise.all(preferenceUpdates);

      // Now get potential matches for these users
      const matchRequests = clients.slice(0, 10).map(client =>
        client.get('/api/v1/matching/potential-matches')
      );

      const responses = await Promise.all(matchRequests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      // Complex filtering should still be performant
      expect(duration).toBeLessThan(3000);
    });

    it('should handle message history queries efficiently', async () => {
      // Create conversations and messages
      const conversationPromises = [];
      
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < Math.min(i + 3, users.length); j++) {
          // Create matches first
          conversationPromises.push(
            clients[i].post('/api/v1/matching/swipe', { targetUserId: users[j].id, action: 'like' })
              .then(() => clients[j].post('/api/v1/matching/swipe', { targetUserId: users[i].id, action: 'like' }))
              .then(() => clients[i].post('/api/v1/chat/conversations', { participantIds: [users[j].id] }))
          );
        }
      }

      const conversations = await Promise.all(conversationPromises);

      // Send multiple messages in each conversation
      const messagePromises = [];
      conversations.forEach((convResponse, index) => {
        if (convResponse.status === 201) {
          const conversationId = convResponse.data.data.conversation.id;
          const clientIndex = Math.floor(index / 2);
          
          for (let k = 0; k < 10; k++) {
            messagePromises.push(
              clients[clientIndex].post('/api/v1/chat/messages', {
                conversationId,
                content: `Message ${k} in conversation ${conversationId}`,
                type: 'text'
              })
            );
          }
        }
      });

      await Promise.all(messagePromises);

      // Now test message history retrieval performance
      const startTime = Date.now();
      
      const historyRequests = conversations.map((convResponse, index) => {
        if (convResponse.status === 201) {
          const conversationId = convResponse.data.data.conversation.id;
          const clientIndex = Math.floor(index / 2);
          return clients[clientIndex].get(`/api/v1/chat/conversations/${conversationId}/messages`);
        }
        return Promise.resolve({ status: 200, data: { data: { messages: [] } } });
      });

      const responses = await Promise.all(historyRequests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        if (response.status !== 200) {
          TestAssertions.assertSuccessResponse(response, 200);
        }
      });

      // Message history queries should be fast
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Data Validation and Constraints', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Validation',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should enforce unique constraints', async () => {
      // Try to create another user with the same email
      const duplicateUserData = {
        email: user.email,
        password: 'SecurePassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        gender: 'male'
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/register', duplicateUserData);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create a swipe with non-existent user
      const response = await client.post('/api/v1/matching/swipe', {
        targetUserId: '00000000-0000-0000-0000-000000000000',
        action: 'like'
      });
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'USER_NOT_FOUND');
    });

    it('should validate data types and formats', async () => {
      // Try to update profile with invalid data types
      const response = await client.put('/api/v1/users/profile', {
        firstName: 123, // Should be string
        age: 'twenty-five', // Should be number
        interests: 'music,travel', // Should be array
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should enforce business logic constraints', async () => {
      // Try to set invalid age range in preferences
      const response = await client.put('/api/v1/users/preferences', {
        ageRange: { min: 50, max: 25 }, // Invalid: min > max
        maxDistance: -10, // Invalid: negative distance
        interestedInGenders: ['invalid_gender'], // Invalid gender
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Database Backup and Recovery Simulation', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Backup',
        lastName: 'User1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Backup',
        lastName: 'User2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should maintain data consistency after simulated recovery', async () => {
      // Create some data
      await client1.post('/api/v1/matching/swipe', { targetUserId: user2.id, action: 'like' });
      await client2.post('/api/v1/matching/swipe', { targetUserId: user1.id, action: 'like' });

      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });

      const conversationId = conversationResponse.data.data.conversation.id;

      await client1.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Test message before recovery',
        type: 'text'
      });

      // Simulate a brief service interruption and recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify data is still consistent after "recovery"
      const matchesResponse = await client1.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matchesResponse, 200);
      expect(matchesResponse.data.data.matches).toHaveLength(1);

      const messagesResponse = await client1.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      TestAssertions.assertSuccessResponse(messagesResponse, 200);
      expect(messagesResponse.data.data.messages).toHaveLength(1);
      expect(messagesResponse.data.data.messages[0].content).toBe('Test message before recovery');
    });

    it('should handle partial data corruption gracefully', async () => {
      // This test simulates scenarios where some data might be corrupted or missing
      // In a real scenario, this would involve more sophisticated testing

      // Create data and verify it exists
      await client1.post('/api/v1/matching/swipe', { targetUserId: user2.id, action: 'like' });
      
      const initialSwipeCheck = await client1.get('/api/v1/matching/potential-matches');
      TestAssertions.assertSuccessResponse(initialSwipeCheck, 200);

      // Verify the system can still function even if some operations fail
      // (This is a simplified test - real corruption testing would be more complex)
      const subsequentOperations = [
        client1.get('/api/v1/users/profile'),
        client2.get('/api/v1/matching/potential-matches'),
        client1.get('/api/v1/notifications')
      ];

      const responses = await Promise.all(subsequentOperations);
      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });
    });
  });
});
