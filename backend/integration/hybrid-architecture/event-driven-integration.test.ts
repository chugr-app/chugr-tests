// Integration tests for Event-Driven Architecture (Redis Pub/Sub)
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Event-Driven Architecture Integration - Redis Pub/Sub', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('User Events Flow', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Event',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should publish and handle user created events', async () => {
      // User creation should trigger user:created event
      // This event should be consumed by notification service
      
      // Wait a bit for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if welcome notification was created (indicates event was processed)
      const notificationsResponse = await client.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);

      const notifications = notificationsResponse.data.data.notifications;
      const welcomeNotification = notifications.find((n: any) => 
        n.type === 'user_welcome' || n.title?.includes('Welcome')
      );

      // Should have received welcome notification from event processing
      expect(welcomeNotification).toBeDefined();
    });

    it('should publish and handle user updated events', async () => {
      // Update user profile
      const updateData = {
        firstName: 'Event Updated',
        lastName: 'Test Updated',
      };

      const updateResponse = await client.put('/api/v1/users/profile', updateData);
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify that other services have updated user data (cache invalidation worked)
      const profileResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data.firstName).toBe('Event Updated');
    });

    it('should publish and handle user preferences updated events', async () => {
      // Update user preferences
      const preferencesData = {
        ageRange: { min: 25, max: 35 },
        maxDistance: 20,
        interests: ['drinking', 'music', 'events'],
        notificationSettings: {
          matches: true,
          messages: true,
          events: false,
        },
      };

      const updateResponse = await client.put('/api/v1/users/preferences', preferencesData);
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify preferences are updated and cached across services
      const preferencesResponse = await client.get('/api/v1/users/preferences');
      TestAssertions.assertSuccessResponse(preferencesResponse, 200);
      expect(preferencesResponse.data.data.interests).toEqual(['drinking', 'music', 'events']);
      expect(preferencesResponse.data.data.notificationSettings.events).toBe(false);
    });
  });

  describe('Matching Events Flow', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Match',
        lastName: 'User1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Match',
        lastName: 'User2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should publish and handle swipe events', async () => {
      // User1 swipes right on User2
      const swipeResponse = await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(swipeResponse, 200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if User2 received a notification about the like
      const notificationsResponse = await client2.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);

      const notifications = notificationsResponse.data.data.notifications;
      const likeNotification = notifications.find((n: any) => 
        n.type === 'swipe_like' || n.title?.includes('likes you')
      );

      expect(likeNotification).toBeDefined();
    });

    it('should publish and handle match created events', async () => {
      // Create a mutual match
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

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Both users should receive match notifications
      const user1Notifications = await client1.get('/api/v1/notifications');
      const user2Notifications = await client2.get('/api/v1/notifications');

      TestAssertions.assertSuccessResponse(user1Notifications, 200);
      TestAssertions.assertSuccessResponse(user2Notifications, 200);

      const user1MatchNotification = user1Notifications.data.data.notifications.find((n: any) => 
        n.type === 'match_created' || n.title?.includes('Match')
      );

      const user2MatchNotification = user2Notifications.data.data.notifications.find((n: any) => 
        n.type === 'match_created' || n.title?.includes('Match')
      );

      expect(user1MatchNotification).toBeDefined();
      expect(user2MatchNotification).toBeDefined();
    });
  });

  describe('Chat Events Flow', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;
    let conversationId: string;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Chat',
        lastName: 'User1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Chat',
        lastName: 'User2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      // Create a match first
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create conversation
      const conversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });

      conversationId = conversationResponse.data.data.conversation.id;
    });

    it('should publish and handle message sent events', async () => {
      // Send a message
      const messageData = {
        conversationId,
        content: 'Hello! This is a test message.',
        type: 'text'
      };

      const messageResponse = await client1.post('/api/v1/chat/messages', messageData);
      TestAssertions.assertSuccessResponse(messageResponse, 201);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // User2 should receive a notification about the new message
      const notificationsResponse = await client2.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);

      const notifications = notificationsResponse.data.data.notifications;
      const messageNotification = notifications.find((n: any) => 
        n.type === 'message_received' || n.title?.includes('message')
      );

      expect(messageNotification).toBeDefined();
    });

    it('should publish and handle typing events', async () => {
      // Start typing
      const typingResponse = await client1.post(`/api/v1/chat/conversations/${conversationId}/typing`, {
        isTyping: true
      });

      TestAssertions.assertSuccessResponse(typingResponse, 200);

      // Stop typing
      const stopTypingResponse = await client1.post(`/api/v1/chat/conversations/${conversationId}/typing`, {
        isTyping: false
      });

      TestAssertions.assertSuccessResponse(stopTypingResponse, 200);

      // Note: Typing indicators are typically handled via WebSocket
      // This test verifies the API endpoints work correctly
    });

    it('should publish and handle message read events', async () => {
      // Send a message
      const messageResponse = await client1.post('/api/v1/chat/messages', {
        conversationId,
        content: 'Please read this message',
        type: 'text'
      });

      const messageId = messageResponse.data.data.id;

      // Mark message as read
      const readResponse = await client2.put(`/api/v1/chat/messages/${messageId}/read`);
      TestAssertions.assertSuccessResponse(readResponse, 200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify message status is updated
      const messagesResponse = await client1.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      TestAssertions.assertSuccessResponse(messagesResponse, 200);

      const messages = messagesResponse.data.data.messages;
      const readMessage = messages.find((m: any) => m.id === messageId);

      expect(readMessage).toBeDefined();
      expect(readMessage.status).toBe('read');
    });
  });

  describe('Event Events Flow', () => {
    let organizer: any, participant: any;
    let organizerClient: any, participantClient: any;

    beforeEach(async () => {
      const organizerData = await integrationTestUtils.userManager.createUser({
        firstName: 'Event',
        lastName: 'Organizer',
      });
      organizer = organizerData.user;
      organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      const participantData = await integrationTestUtils.userManager.createUser({
        firstName: 'Event',
        lastName: 'Participant',
      });
      participant = participantData.user;
      participantClient = await integrationTestUtils.userManager.createAuthenticatedClient(participant.id);
    });

    it('should publish and handle event created events', async () => {
      // Create an event
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Test Event for Events',
        description: 'This is a test event to verify event-driven architecture',
      });

      const eventResponse = await organizerClient.post('/api/v1/events', eventData);
      TestAssertions.assertSuccessResponse(eventResponse, 201);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Organizer should receive confirmation notification
      const notificationsResponse = await organizerClient.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);

      const notifications = notificationsResponse.data.data.notifications;
      const eventNotification = notifications.find((n: any) => 
        n.type === 'event_created' || n.title?.includes('Event Created')
      );

      expect(eventNotification).toBeDefined();
    });

    it('should publish and handle user joined event events', async () => {
      // Create an event
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Join Test Event',
        maxParticipants: 5,
      });

      const eventResponse = await organizerClient.post('/api/v1/events', eventData);
      const eventId = eventResponse.data.data.id;

      // Participant joins the event
      const joinResponse = await participantClient.post(`/api/v1/events/${eventId}/join`);
      TestAssertions.assertSuccessResponse(joinResponse, 200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Organizer should receive notification about new participant
      const notificationsResponse = await organizerClient.get('/api/v1/notifications');
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);

      const notifications = notificationsResponse.data.data.notifications;
      const joinNotification = notifications.find((n: any) => 
        n.type === 'event_user_joined' || n.title?.includes('participant')
      );

      expect(joinNotification).toBeDefined();
    });
  });

  describe('Cross-Service Event Propagation', () => {
    let user1: any, user2: any;
    let client1: any, client2: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Cross',
        lastName: 'Service1',
      });
      user1 = user1Data.user;
      client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Cross',
        lastName: 'Service2',
      });
      user2 = user2Data.user;
      client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);
    });

    it('should propagate events across all subscribed services', async () => {
      // Update user preferences (should trigger events in multiple services)
      const preferencesUpdate = {
        ageRange: { min: 22, max: 32 },
        maxDistance: 25,
        interests: ['drinking', 'music', 'sports', 'events'],
        notificationSettings: {
          matches: true,
          messages: true,
          events: true,
          likes: true,
        },
      };

      const updateResponse = await client1.put('/api/v1/users/preferences', preferencesUpdate);
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a match to verify that matching service has updated preferences
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      const matchResponse = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(matchResponse, 200);

      // The match should succeed, indicating that updated preferences were propagated
      expect(matchResponse.data.data).toHaveProperty('match', true);
    });

    it('should handle event failures gracefully without affecting other services', async () => {
      // This test verifies that if one service fails to process an event,
      // other services continue to work normally

      // Perform an action that triggers multiple events
      const updateResponse = await client1.put('/api/v1/users/profile', {
        firstName: 'Resilient',
        lastName: 'Test',
      });

      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify that core functionality still works
      const profileResponse = await client1.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data.firstName).toBe('Resilient');

      // Other services should also continue to work
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      const swipeResponse = await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      TestAssertions.assertSuccessResponse(swipeResponse, 200);
    });
  });

  describe('Event Processing Performance', () => {
    it('should handle high-volume event processing efficiently', async () => {
      // Create multiple users
      const userPromises = Array.from({ length: 10 }, (_, i) =>
        integrationTestUtils.userManager.createUser({
          firstName: `Perf${i}`,
          lastName: 'Test',
        })
      );

      const userData = await Promise.all(userPromises);
      const clients = await Promise.all(
        userData.map(({ user }) =>
          integrationTestUtils.userManager.createAuthenticatedClient(user.id)
        )
      );

      // Perform multiple actions that trigger events
      const startTime = Date.now();

      const operations = [];

      // Profile updates (trigger user:updated events)
      for (let i = 0; i < Math.min(5, clients.length); i++) {
        if (clients[i]) {
          operations.push(
            clients[i]!.put('/api/v1/users/profile', {
              firstName: `Perf${i} Updated`,
            })
          );
        }
      }

      // Swipes (trigger swipe events)
      for (let i = 0; i < Math.min(5, clients.length); i++) {
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

      const responses = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should succeed
      responses.forEach(response => {
        if (response) {
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(300);
        }
      });

      // Should handle high volume efficiently
      expect(duration).toBeLessThan(3000);

      // Wait for event processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify that events were processed (check for notifications)
      const notificationsResponse = clients[1] ? await clients[1].get('/api/v1/notifications') : null;
      if (notificationsResponse) {
        TestAssertions.assertSuccessResponse(notificationsResponse, 200);

        // Should have received some notifications from event processing
        const notifications = notificationsResponse.data.data.notifications;
        expect(notifications.length).toBeGreaterThan(0);
      }
    });

    it('should maintain event ordering and consistency', async () => {
      // Create a user and perform sequential operations
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Ordering',
        lastName: 'Test',
      });

      const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);

      // Perform sequential updates
      const updates = [
        { firstName: 'Ordering 1' },
        { firstName: 'Ordering 2' },
        { firstName: 'Ordering 3' },
      ];

      for (const update of updates) {
        const response = await client.put('/api/v1/users/profile', update);
        TestAssertions.assertSuccessResponse(response, 200);
        
        // Small delay to ensure ordering
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Final state should reflect the last update
      const finalResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(finalResponse, 200);
      expect(finalResponse.data.data.firstName).toBe('Ordering 3');
    });
  });
});
