// End-to-end integration test for complete user journey
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Complete User Journey E2E', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Complete User Registration to Event Participation Flow', () => {
    it('should complete full user journey from registration to event participation', async () => {
      // Step 1: User Registration
      const user1Data = integrationTestUtils.dataFactory.createUser({
        firstName: 'Alice',
        lastName: 'Johnson',
        age: 25,
      });

      const user2Data = integrationTestUtils.dataFactory.createUser({
        firstName: 'Bob',
        lastName: 'Smith',
        age: 28,
      });

      // Register both users
      const register1Response = await integrationTestUtils.httpClient.post('/api/v1/auth/register', user1Data);
      TestAssertions.assertSuccessResponse(register1Response, 201);

      const register2Response = await integrationTestUtils.httpClient.post('/api/v1/auth/register', user2Data);
      TestAssertions.assertSuccessResponse(register2Response, 201);

      // Step 2: User Login
      const login1Response = await integrationTestUtils.httpClient.post('/api/v1/auth/login', {
        email: user1Data.email,
        password: user1Data.password,
      });
      TestAssertions.assertSuccessResponse(login1Response, 200);

      const login2Response = await integrationTestUtils.httpClient.post('/api/v1/auth/login', {
        email: user2Data.email,
        password: user2Data.password,
      });
      TestAssertions.assertSuccessResponse(login2Response, 200);

      const user1Token = login1Response.data.data.token;
      const user2Token = login2Response.data.data.token;
      const user1Id = login1Response.data.data.user.id;
      const user2Id = login2Response.data.data.user.id;

      // Step 3: Profile Setup
      const profile1Client = new (integrationTestUtils.httpClient.constructor as any)();
      (profile1Client as any).defaultHeaders = { ...(profile1Client as any).defaultHeaders, Authorization: `Bearer ${user1Token}` };

      const profile2Client = new (integrationTestUtils.httpClient.constructor as any)();
      (profile2Client as any).defaultHeaders = { ...(profile2Client as any).defaultHeaders, Authorization: `Bearer ${user2Token}` };

      const profile1Update = {
        bio: 'Love craft beer and meeting new people!',
        interests: ['beer', 'music', 'travel'],
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          city: 'Moscow',
        },
      };

      const profile2Update = {
        bio: 'Wine enthusiast and food lover',
        interests: ['wine', 'cooking', 'art'],
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          city: 'Moscow',
        },
      };

      const profile1Response = await profile1Client.put('/api/v1/users/profile', profile1Update);
      TestAssertions.assertSuccessResponse(profile1Response, 200);

      const profile2Response = await profile2Client.put('/api/v1/users/profile', profile2Update);
      TestAssertions.assertSuccessResponse(profile2Response, 200);

      // Step 4: User Matching
      // Get recommendations for user1
      const recommendationsResponse = await profile1Client.get('/api/v1/matching/recommendations');
      TestAssertions.assertSuccessResponse(recommendationsResponse, 200);
      expect(recommendationsResponse.data.data.recommendations.length).toBeGreaterThan(0);

      // User1 swipes right on User2
      const swipe1Response = await profile1Client.post('/api/v1/matching/swipe', {
        targetUserId: user2Id,
        action: 'like',
      });
      TestAssertions.assertSuccessResponse(swipe1Response, 200);

      // User2 swipes right on User1 (mutual like)
      const swipe2Response = await profile2Client.post('/api/v1/matching/swipe', {
        targetUserId: user1Id,
        action: 'like',
      });
      TestAssertions.assertSuccessResponse(swipe2Response, 200);

      // Verify match was created
      const matches1Response = await profile1Client.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches1Response, 200);
      expect(matches1Response.data.data.matches.length).toBe(1);
      expect(matches1Response.data.data.matches[0].userId).toBe(user2Id);

      const matches2Response = await profile2Client.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches2Response, 200);
      expect(matches2Response.data.data.matches.length).toBe(1);
      expect(matches2Response.data.data.matches[0].userId).toBe(user1Id);

      // Step 5: Chat Communication
      // Get conversations for user1
      const conversations1Response = await profile1Client.get('/api/v1/chat/conversations');
      TestAssertions.assertSuccessResponse(conversations1Response, 200);
      expect(conversations1Response.data.data.conversations.length).toBe(1);

      const conversationId = conversations1Response.data.data.conversations[0].id;

      // User1 sends first message
      const message1Data = {
        conversationId,
        content: 'Hi! Nice to match with you!',
        type: 'text',
      };

      const message1Response = await profile1Client.post('/api/v1/chat/messages', message1Data);
      TestAssertions.assertSuccessResponse(message1Response, 201);

      // User2 responds
      const message2Data = {
        conversationId,
        content: 'Hi Alice! Nice to meet you too! 😊',
        type: 'text',
      };

      const message2Response = await profile2Client.post('/api/v1/chat/messages', message2Data);
      TestAssertions.assertSuccessResponse(message2Response, 201);

      // Get conversation messages
      const messagesResponse = await profile1Client.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      TestAssertions.assertSuccessResponse(messagesResponse, 200);
      expect(messagesResponse.data.data.messages.length).toBe(2);

      // Step 6: Event Creation and Participation
      // User1 creates an event
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Craft Beer Tasting Night',
        description: 'Join us for a fun evening of craft beer tasting and great conversation!',
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          address: 'Craft Beer Bar, Moscow',
        },
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        maxParticipants: 8,
        category: 'drinking',
        tags: ['beer', 'tasting', 'social'],
      });

      const createEventResponse = await profile1Client.post('/api/v1/events', eventData);
      TestAssertions.assertSuccessResponse(createEventResponse, 201);
      const eventId = createEventResponse.data.data.id;

      // User2 joins the event
      const joinEventResponse = await profile2Client.post(`/api/v1/events/${eventId}/join`);
      TestAssertions.assertSuccessResponse(joinEventResponse, 200);

      // Verify event participation
      const eventResponse = await profile1Client.get(`/api/v1/events/${eventId}`);
      TestAssertions.assertSuccessResponse(eventResponse, 200);
      expect(eventResponse.data.data.participants.length).toBe(2);
      const participantIds = eventResponse.data.data.participants.map((p: any) => p.userId);
      expect(participantIds).toContain(user1Id);
      expect(participantIds).toContain(user2Id);

      // Step 7: Event Discussion in Chat
      // User1 sends event-related message
      const eventMessageData = {
        conversationId,
        content: `Looking forward to the beer tasting event! I created it for next week.`,
        type: 'text',
      };

      const eventMessageResponse = await profile1Client.post('/api/v1/chat/messages', eventMessageData);
      TestAssertions.assertSuccessResponse(eventMessageResponse, 201);

      // User2 responds about the event
      const eventResponseData = {
        conversationId,
        content: 'Sounds amazing! I love craft beer. What time should we meet?',
        type: 'text',
      };

      const eventResponseMessage = await profile2Client.post('/api/v1/chat/messages', eventResponseData);
      TestAssertions.assertSuccessResponse(eventResponseMessage, 201);

      // Step 8: Notification Verification
      // Check notifications for user2 (should have event join notification)
      const notificationsResponse = await profile2Client.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);
      expect(notificationsResponse.data.data.notifications.length).toBeGreaterThan(0);

      // Step 9: Event Management
      // User1 updates event details
      const eventUpdateData = {
        description: 'Updated: We will have 5 different craft beers to taste!',
        maxParticipants: 10,
      };

      const updateEventResponse = await profile1Client.put(`/api/v1/events/${eventId}`, eventUpdateData);
      TestAssertions.assertSuccessResponse(updateEventResponse, 200);

      // Step 10: Final Verification
      // Verify all data is consistent across services
      const finalEventResponse = await profile1Client.get(`/api/v1/events/${eventId}`);
      TestAssertions.assertSuccessResponse(finalEventResponse, 200);
      expect(finalEventResponse.data.data.maxParticipants).toBe(10);

      const finalMatchesResponse = await profile1Client.get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(finalMatchesResponse, 200);
      expect(finalMatchesResponse.data.data.matches.length).toBe(1);

      const finalConversationsResponse = await profile1Client.get('/api/v1/chat/conversations');
      TestAssertions.assertSuccessResponse(finalConversationsResponse, 200);
      expect(finalConversationsResponse.data.data.conversations.length).toBe(1);

      const finalMessagesResponse = await profile1Client.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      TestAssertions.assertSuccessResponse(finalMessagesResponse, 200);
      expect(finalMessagesResponse.data.data.messages.length).toBe(4); // 2 initial + 2 event-related

      // Step 11: Cleanup (User leaves event)
      const leaveEventResponse = await profile2Client.post(`/api/v1/events/${eventId}/leave`);
      TestAssertions.assertSuccessResponse(leaveEventResponse, 200);

      // Verify user2 is no longer in the event
      const afterLeaveResponse = await profile1Client.get(`/api/v1/events/${eventId}`);
      TestAssertions.assertSuccessResponse(afterLeaveResponse, 200);
      expect(afterLeaveResponse.data.data.participants.length).toBe(1);
      expect(afterLeaveResponse.data.data.participants[0].userId).toBe(user1Id);
    });

    it('should handle user journey with multiple events and matches', async () => {
      // Create multiple users
      const users = [];
      const tokens: string[] = [];

      for (let i = 0; i < 3; i++) {
        const userData = integrationTestUtils.dataFactory.createUser({
          email: `multi-user${i}@example.com`,
          firstName: `User${i}`,
          lastName: 'Test',
          age: 25 + i,
        });

        const registerResponse = await integrationTestUtils.httpClient.post('/api/v1/auth/register', userData);
        TestAssertions.assertSuccessResponse(registerResponse, 201);

        const loginResponse = await integrationTestUtils.httpClient.post('/api/v1/auth/login', {
          email: userData.email,
          password: userData.password,
        });
        TestAssertions.assertSuccessResponse(loginResponse, 200);

        users.push(loginResponse.data.data.user);
        tokens.push(loginResponse.data.data.token);
      }

      // Create authenticated clients
      const clients = users.map((_user, index) => {
        const client = new (integrationTestUtils.httpClient.constructor as any)();
        (client as any).defaultHeaders = { ...(client as any).defaultHeaders, Authorization: `Bearer ${tokens[index]}` };
        return client;
      });

      // Create multiple events
      const events = [];
      for (let i = 0; i < 2; i++) {
        const eventData = integrationTestUtils.dataFactory.createEvent({
          title: `Multi Event ${i + 1}`,
          description: `This is event number ${i + 1}`,
          dateTime: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        });

        const createResponse = await clients[0].post('/api/v1/events', eventData);
        TestAssertions.assertSuccessResponse(createResponse, 201);
        events.push(createResponse.data.data);
      }

      // Users join different events
      await clients[1].post(`/api/v1/events/${events[0].id}/join`);
      await clients[2].post(`/api/v1/events/${events[1].id}/join`);

      // Create matches between users
      await clients[0].post('/api/v1/matching/swipe', {
        targetUserId: users[1].id,
        action: 'like',
      });
      await clients[1].post('/api/v1/matching/swipe', {
        targetUserId: users[0].id,
        action: 'like',
      });

      await clients[1].post('/api/v1/matching/swipe', {
        targetUserId: users[2].id,
        action: 'like',
      });
      await clients[2].post('/api/v1/matching/swipe', {
        targetUserId: users[1].id,
        action: 'like',
      });

      // Verify matches
      const matches0Response = await clients[0].get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches0Response, 200);
      expect(matches0Response.data.data.matches.length).toBe(1);

      const matches1Response = await clients[1].get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches1Response, 200);
      expect(matches1Response.data.data.matches.length).toBe(2);

      const matches2Response = await clients[2].get('/api/v1/matching/matches');
      TestAssertions.assertSuccessResponse(matches2Response, 200);
      expect(matches2Response.data.data.matches.length).toBe(1);

      // Verify event participations
      const event0Response = await clients[0].get(`/api/v1/events/${events[0].id}`);
      TestAssertions.assertSuccessResponse(event0Response, 200);
      expect(event0Response.data.data.participants.length).toBe(2);

      const event1Response = await clients[0].get(`/api/v1/events/${events[1].id}`);
      TestAssertions.assertSuccessResponse(event1Response, 200);
      expect(event1Response.data.data.participants.length).toBe(2);
    });
  });

  describe('Error Handling in User Journey', () => {
    it('should handle errors gracefully throughout user journey', async () => {
      // Create a user
      const userData = integrationTestUtils.dataFactory.createUser({
        email: 'error-user@example.com',
      });

      const registerResponse = await integrationTestUtils.httpClient.post('/api/v1/auth/register', userData);
      TestAssertions.assertSuccessResponse(registerResponse, 201);

      const loginResponse = await integrationTestUtils.httpClient.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
      });
      TestAssertions.assertSuccessResponse(loginResponse, 200);

      const token = loginResponse.data.data.token;
      // userId not used in this test

      const client = new (integrationTestUtils.httpClient.constructor as any)();
      (client as any).defaultHeaders = { ...(client as any).defaultHeaders, Authorization: `Bearer ${token}` };

      // Test invalid operations
      // Try to swipe on non-existent user
      const invalidSwipeResponse = await client.post('/api/v1/matching/swipe', {
        targetUserId: 'non-existent-user',
        action: 'like',
      });
      TestAssertions.assertErrorResponse(invalidSwipeResponse, 404, 'USER_NOT_FOUND');

      // Try to join non-existent event
      const invalidJoinResponse = await client.post('/api/v1/events/non-existent-event/join');
      TestAssertions.assertErrorResponse(invalidJoinResponse, 404, 'EVENT_NOT_FOUND');

      // Try to send message to non-existent conversation
      const invalidMessageResponse = await client.post('/api/v1/chat/messages', {
        conversationId: 'non-existent-conversation',
        content: 'Hello',
        type: 'text',
      });
      TestAssertions.assertErrorResponse(invalidMessageResponse, 404, 'CONVERSATION_NOT_FOUND');

      // Test with invalid token
      const invalidClient = new (integrationTestUtils.httpClient.constructor as any)();
      (invalidClient as any).defaultHeaders = { ...(invalidClient as any).defaultHeaders, Authorization: 'Bearer invalid-token' };

      const invalidTokenResponse = await invalidClient.get('/api/v1/users/profile');
      TestAssertions.assertErrorResponse(invalidTokenResponse, 401, 'INVALID_TOKEN');
    });
  });
});
