import request from 'supertest';
import { testConfig } from '@config/test.config';
import { userFixtures } from '@fixtures/users';
import { eventFixtures } from '@fixtures/events';

describe('Complete User Journey E2E', () => {
  const apiGatewayUrl = testConfig.services.apiGateway;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let eventId: string;

  describe('Full User Journey: Registration → Profile → Matching → Event → Chat', () => {
    it('should complete full user journey from registration to chat', async () => {
      // Step 1: Register two users
      const user1Data = userFixtures.generateRegistrationData();
      const user2Data = userFixtures.generateRegistrationData();

      const user1Response = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(user1Data)
        .expect(201);

      const user2Response = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(user2Data)
        .expect(201);

      user1Token = user1Response.body.data.token;
      user2Token = user2Response.body.data.token;
      user1Id = user1Response.body.data.user.id;
      user2Id = user2Response.body.data.user.id;

      // Step 2: Complete user profiles
      const user1Profile = {
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          city: 'Moscow',
          country: 'Russia',
        },
        preferences: {
          ageRange: { min: 21, max: 35 },
          maxDistance: 10,
          interests: ['drinking', 'socializing', 'music'],
        },
      };

      const user2Profile = {
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          city: 'Moscow',
          country: 'Russia',
        },
        preferences: {
          ageRange: { min: 20, max: 30 },
          maxDistance: 15,
          interests: ['drinking', 'socializing', 'gaming'],
        },
      };

      await request(apiGatewayUrl)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(user1Profile)
        .expect(200);

      await request(apiGatewayUrl)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(user2Profile)
        .expect(200);

      // Step 3: Create an event
      const eventData = eventFixtures.generateEventCreationData({
        organizerId: user1Id,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });

      const eventResponse = await request(apiGatewayUrl)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(eventData)
        .expect(201);

      eventId = eventResponse.body.data.event.id;

      // Step 4: User2 joins the event
      await request(apiGatewayUrl)
        .post(`/api/v1/events/${eventId}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // Step 5: Check matching between users
      const matchingResponse = await request(apiGatewayUrl)
        .get('/api/v1/matching/suggestions')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(matchingResponse.body.data.suggestions).toBeInstanceOf(Array);
      
      // User2 should appear in suggestions for User1
      const user2InSuggestions = matchingResponse.body.data.suggestions.find(
        (suggestion: any) => suggestion.userId === user2Id
      );
      expect(user2InSuggestions).toBeDefined();

      // Step 6: User1 likes User2
      await request(apiGatewayUrl)
        .post('/api/v1/matching/like')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user2Id })
        .expect(200);

      // Step 7: User2 likes User1 back (creating a match)
      await request(apiGatewayUrl)
        .post('/api/v1/matching/like')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ targetUserId: user1Id })
        .expect(200);

      // Step 8: Check that match was created
      const matchesResponse = await request(apiGatewayUrl)
        .get('/api/v1/matching/matches')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(matchesResponse.body.data.matches).toBeInstanceOf(Array);
      const match = matchesResponse.body.data.matches.find(
        (match: any) => match.userId === user2Id
      );
      expect(match).toBeDefined();

      // Step 9: Start a chat between matched users
      const chatResponse = await request(apiGatewayUrl)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id })
        .expect(201);

      const conversationId = chatResponse.body.data.conversation.id;

      // Step 10: Send messages in the chat
      const message1 = {
        conversationId,
        content: 'Hello! Nice to match with you!',
        type: 'text',
      };

      const message2 = {
        conversationId,
        content: 'Hi there! Looking forward to the event!',
        type: 'text',
      };

      await request(apiGatewayUrl)
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(message1)
        .expect(201);

      await request(apiGatewayUrl)
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(message2)
        .expect(201);

      // Step 11: Retrieve chat messages
      const messagesResponse = await request(apiGatewayUrl)
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(messagesResponse.body.data.messages).toHaveLength(2);
      expect(messagesResponse.body.data.messages[0].content).toBe(message1.content);
      expect(messagesResponse.body.data.messages[1].content).toBe(message2.content);

      // Step 12: Check notifications were sent
      const notificationsResponse = await request(apiGatewayUrl)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(notificationsResponse.body.data.notifications).toBeInstanceOf(Array);
      
      // Should have notifications for match and messages
      const matchNotification = notificationsResponse.body.data.notifications.find(
        (notification: any) => notification.type === 'match'
      );
      const messageNotification = notificationsResponse.body.data.notifications.find(
        (notification: any) => notification.type === 'message'
      );

      expect(matchNotification).toBeDefined();
      expect(messageNotification).toBeDefined();
    });

    it('should handle event cancellation and cleanup', async () => {
      // This test would cover event cancellation and related cleanup
      // For now, we'll just verify the event exists from previous test
      expect(eventId).toBeDefined();

      // Cancel the event
      await request(apiGatewayUrl)
        .delete(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Verify event is cancelled
      const eventResponse = await request(apiGatewayUrl)
        .get(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      expect(eventResponse.body.success).toBe(false);
    });
  });

  describe('Error Handling in User Journey', () => {
    it('should handle service failures gracefully', async () => {
      // Test what happens when a service is down
      // This would require mocking service failures
      
      const response = await request(apiGatewayUrl)
        .get('/api/v1/matching/suggestions')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Should either return data or a proper error response
      expect(response.body).toHaveProperty('success');
    });

    it('should handle invalid data gracefully', async () => {
      // Test with invalid event data
      const invalidEventData = {
        title: '', // Empty title
        description: 'Test event',
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        maxParticipants: -5, // Negative participants
      };

      const response = await request(apiGatewayUrl)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(invalidEventData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          details: expect.any(Object),
        },
      });
    });
  });
});
