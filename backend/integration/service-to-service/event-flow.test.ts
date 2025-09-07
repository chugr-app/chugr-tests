// Integration test for event service workflow
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Event Service Integration', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Event Creation and Management', () => {
    let organizer: any, participant: any;
    // tokens removed as they're not used in these tests

    beforeEach(async () => {
      const organizerData = await integrationTestUtils.userManager.createUser({
        firstName: 'Event',
        lastName: 'Organizer',
      });
      organizer = organizerData.user;
      // organizerToken = organizerData.token; // Not used in these tests

      const participantData = await integrationTestUtils.userManager.createUser({
        firstName: 'Event',
        lastName: 'Participant',
      });
      participant = participantData.user;
      // participantToken = participantData.token; // Not used in these tests
    });

    it('should create a new event', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Test Drinking Event',
        description: 'A test event for integration testing',
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          address: 'Red Square, Moscow',
        },
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        maxParticipants: 10,
        category: 'drinking',
        tags: ['test', 'integration', 'drinking'],
      });

      const createResponse = await client.post('/api/v1/events', eventData);
      
      TestAssertions.assertSuccessResponse(createResponse, 201);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data).toHaveProperty('title', eventData.title);
      expect(createResponse.data.data).toHaveProperty('description', eventData.description);
      expect(createResponse.data.data).toHaveProperty('organizerId', organizer.id);
      expect(createResponse.data.data).toHaveProperty('location');
      expect(createResponse.data.data).toHaveProperty('dateTime');
      expect(createResponse.data.data).toHaveProperty('maxParticipants', eventData.maxParticipants);
      expect(createResponse.data.data).toHaveProperty('category', eventData.category);
      expect(createResponse.data.data).toHaveProperty('tags');
      expect(createResponse.data.data).toHaveProperty('status', 'active');
      expect(createResponse.data.data).toHaveProperty('participants');
      expect(createResponse.data.data).toHaveProperty('createdAt');
      expect(createResponse.data.data).toHaveProperty('updatedAt');

      // Check that organizer is automatically added as participant
      expect(Array.isArray(createResponse.data.data.participants)).toBe(true);
      expect(createResponse.data.data.participants.length).toBe(1);
      expect(createResponse.data.data.participants[0].userId).toBe(organizer.id);
    });

    it('should validate event creation data', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      // Missing required fields
      const invalidEventData = {
        title: '', // Empty title
        description: 'Test event',
        dateTime: 'invalid-date', // Invalid date
        maxParticipants: -1, // Invalid participants count
      };

      const createResponse = await client.post('/api/v1/events', invalidEventData);
      
      TestAssertions.assertErrorResponse(createResponse, 400, 'VALIDATION_ERROR');
    });

    it('should get event by ID', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      // Create an event
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Get Event Test',
      });

      const createResponse = await client.post('/api/v1/events', eventData);
      const eventId = createResponse.data.data.id;

      // Get the event
      const getResponse = await client.get(`/api/v1/events/${eventId}`);
      
      TestAssertions.assertSuccessResponse(getResponse, 200);
      expect(getResponse.data.data).toHaveProperty('id', eventId);
      expect(getResponse.data.data).toHaveProperty('title', eventData.title);
      expect(getResponse.data.data).toHaveProperty('organizerId', organizer.id);
    });

    it('should handle non-existent event', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      const getResponse = await client.get('/api/v1/events/non-existent-id');
      
      TestAssertions.assertErrorResponse(getResponse, 404, 'EVENT_NOT_FOUND');
    });

    it('should update event details', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      // Create an event
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Update Event Test',
        maxParticipants: 5,
      });

      const createResponse = await client.post('/api/v1/events', eventData);
      const eventId = createResponse.data.data.id;

      // Update the event
      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description',
        maxParticipants: 10,
      };

      const updateResponse = await client.put(`/api/v1/events/${eventId}`, updateData);
      
      TestAssertions.assertSuccessResponse(updateResponse, 200);
      expect(updateResponse.data.data).toHaveProperty('title', updateData.title);
      expect(updateResponse.data.data).toHaveProperty('description', updateData.description);
      expect(updateResponse.data.data).toHaveProperty('maxParticipants', updateData.maxParticipants);
    });

    it('should prevent non-organizer from updating event', async () => {
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);
      const participantClient = await integrationTestUtils.userManager.createAuthenticatedClient(participant.id);

      // Create an event as organizer
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Permission Test Event',
      });

      const createResponse = await organizerClient.post('/api/v1/events', eventData);
      const eventId = createResponse.data.data.id;

      // Try to update as participant
      const updateData = {
        title: 'Unauthorized Update',
      };

      const updateResponse = await participantClient.put(`/api/v1/events/${eventId}`, updateData);
      
      TestAssertions.assertErrorResponse(updateResponse, 403, 'EVENT_UPDATE_DENIED');
    });

    it('should delete event', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      // Create an event
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Delete Event Test',
      });

      const createResponse = await client.post('/api/v1/events', eventData);
      const eventId = createResponse.data.data.id;

      // Delete the event
      const deleteResponse = await client.delete(`/api/v1/events/${eventId}`);
      
      TestAssertions.assertSuccessResponse(deleteResponse, 200);

      // Verify event is deleted
      const getResponse = await client.get(`/api/v1/events/${eventId}`);
      TestAssertions.assertErrorResponse(getResponse, 404, 'EVENT_NOT_FOUND');
    });
  });

  describe('Event Participation', () => {
    let organizer: any, participant1: any, participant2: any;
    let eventId: string;

    beforeEach(async () => {
      const organizerData = await integrationTestUtils.userManager.createUser();
      organizer = organizerData.user;

      const participant1Data = await integrationTestUtils.userManager.createUser();
      participant1 = participant1Data.user;

      const participant2Data = await integrationTestUtils.userManager.createUser();
      participant2 = participant2Data.user;

      // Create an event
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Participation Test Event',
        maxParticipants: 3, // Including organizer
      });

      const createResponse = await organizerClient.post('/api/v1/events', eventData);
      eventId = createResponse.data.data.id;
    });

    it('should allow users to join events', async () => {
      const participantClient = await integrationTestUtils.userManager.createAuthenticatedClient(participant1.id);

      const joinResponse = await participantClient.post(`/api/v1/events/${eventId}/join`);
      
      TestAssertions.assertSuccessResponse(joinResponse, 200);
      expect(joinResponse.data.data).toHaveProperty('success', true);
      expect(joinResponse.data.data).toHaveProperty('message');

      // Verify participant is added to event
      const eventResponse = await participantClient.get(`/api/v1/events/${eventId}`);
      const participants = eventResponse.data.data.participants;
      
      expect(participants.length).toBe(2); // Organizer + participant1
      const participantIds = participants.map((p: any) => p.userId);
      expect(participantIds).toContain(organizer.id);
      expect(participantIds).toContain(participant1.id);
    });

    it('should prevent joining full events', async () => {
      const participant1Client = await integrationTestUtils.userManager.createAuthenticatedClient(participant1.id);
      const participant2Client = await integrationTestUtils.userManager.createAuthenticatedClient(participant2.id);

      // Join first participant
      await participant1Client.post(`/api/v1/events/${eventId}/join`);

      // Try to join second participant (should fail - event is full)
      const joinResponse = await participant2Client.post(`/api/v1/events/${eventId}/join`);
      
      TestAssertions.assertErrorResponse(joinResponse, 409, 'EVENT_FULL');
    });

    it('should prevent joining past events', async () => {
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);
      const participantClient = await integrationTestUtils.userManager.createAuthenticatedClient(participant1.id);

      // Create a past event
      const pastEventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Past Event',
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      });

      const createResponse = await organizerClient.post('/api/v1/events', pastEventData);
      const pastEventId = createResponse.data.data.id;

      // Try to join past event
      const joinResponse = await participantClient.post(`/api/v1/events/${pastEventId}/join`);
      
      TestAssertions.assertErrorResponse(joinResponse, 409, 'EVENT_PAST');
    });

    it('should allow users to leave events', async () => {
      const participantClient = await integrationTestUtils.userManager.createAuthenticatedClient(participant1.id);

      // Join the event
      await participantClient.post(`/api/v1/events/${eventId}/join`);

      // Leave the event
      const leaveResponse = await participantClient.post(`/api/v1/events/${eventId}/leave`);
      
      TestAssertions.assertSuccessResponse(leaveResponse, 200);
      expect(leaveResponse.data.data).toHaveProperty('success', true);

      // Verify participant is removed from event
      const eventResponse = await participantClient.get(`/api/v1/events/${eventId}`);
      const participants = eventResponse.data.data.participants;
      
      expect(participants.length).toBe(1); // Only organizer
      const participantIds = participants.map((p: any) => p.userId);
      expect(participantIds).toContain(organizer.id);
      expect(participantIds).not.toContain(participant1.id);
    });

    it('should prevent organizer from leaving their own event', async () => {
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      const leaveResponse = await organizerClient.post(`/api/v1/events/${eventId}/leave`);
      
      TestAssertions.assertErrorResponse(leaveResponse, 409, 'ORGANIZER_CANNOT_LEAVE');
    });
  });

  describe('Event Discovery', () => {
    let user: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser();
      user = userData.user;

      // Create multiple events
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);

      const events = [
        {
          title: 'Beer Tasting Event',
          description: 'Taste different beers',
          category: 'drinking',
          tags: ['beer', 'tasting'],
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          title: 'Wine Night',
          description: 'Wine tasting evening',
          category: 'drinking',
          tags: ['wine', 'elegant'],
          dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          title: 'Cocktail Making',
          description: 'Learn to make cocktails',
          category: 'drinking',
          tags: ['cocktails', 'learning'],
          dateTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const eventData of events) {
        await client.post('/api/v1/events', eventData);
      }
    });

    it('should list all events', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);

      const listResponse = await client.get('/api/v1/events');
      
      TestAssertions.assertSuccessResponse(listResponse, 200);
      expect(listResponse.data.data).toHaveProperty('events');
      expect(Array.isArray(listResponse.data.data.events)).toBe(true);
      expect(listResponse.data.data.events.length).toBeGreaterThanOrEqual(3);
      
      // Check pagination
      expect(listResponse.data.data).toHaveProperty('pagination');
      expect(listResponse.data.data.pagination).toHaveProperty('page');
      expect(listResponse.data.data.pagination).toHaveProperty('limit');
      expect(listResponse.data.data.pagination).toHaveProperty('total');
    });

    it('should filter events by category', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);

      const filterResponse = await client.get('/api/v1/events?category=drinking');
      
      TestAssertions.assertSuccessResponse(filterResponse, 200);
      expect(filterResponse.data.data).toHaveProperty('events');
      
      const events = filterResponse.data.data.events;
      events.forEach((event: any) => {
        expect(event.category).toBe('drinking');
      });
    });

    it('should search events by title', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);

      const searchResponse = await client.get('/api/v1/events?search=beer');
      
      TestAssertions.assertSuccessResponse(searchResponse, 200);
      expect(searchResponse.data.data).toHaveProperty('events');
      
      const events = searchResponse.data.data.events;
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].title.toLowerCase()).toContain('beer');
    });

    it('should filter events by date range', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const filterResponse = await client.get(`/api/v1/events?startDate=${tomorrow}&endDate=${dayAfterTomorrow}`);
      
      TestAssertions.assertSuccessResponse(filterResponse, 200);
      expect(filterResponse.data.data).toHaveProperty('events');
      
      const events = filterResponse.data.data.events;
      events.forEach((event: any) => {
        const eventDate = new Date(event.dateTime);
        const startDate = new Date(tomorrow);
        const endDate = new Date(dayAfterTomorrow);
        expect(eventDate >= startDate && eventDate <= endDate).toBe(true);
      });
    });

    it('should handle pagination', async () => {
      const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);

      // First page
      const page1Response = await client.get('/api/v1/events?page=1&limit=2');
      
      TestAssertions.assertSuccessResponse(page1Response, 200);
      expect(page1Response.data.data.events.length).toBeLessThanOrEqual(2);
      expect(page1Response.data.data.pagination.page).toBe(1);

      // Second page
      const page2Response = await client.get('/api/v1/events?page=2&limit=2');
      
      TestAssertions.assertSuccessResponse(page2Response, 200);
      expect(page2Response.data.data.pagination.page).toBe(2);
    });
  });

  describe('Event Notifications', () => {
    let organizer: any, participant: any;
    let eventId: string;

    beforeEach(async () => {
      const organizerData = await integrationTestUtils.userManager.createUser();
      organizer = organizerData.user;

      const participantData = await integrationTestUtils.userManager.createUser();
      participant = participantData.user;

      // Create an event
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);
      const eventData = integrationTestUtils.dataFactory.createEvent({
        title: 'Notification Test Event',
      });

      const createResponse = await organizerClient.post('/api/v1/events', eventData);
      eventId = createResponse.data.data.id;
    });

    it('should send notification when user joins event', async () => {
      const participantClient = await integrationTestUtils.userManager.createAuthenticatedClient(participant.id);

      // Join the event
      const joinResponse = await participantClient.post(`/api/v1/events/${eventId}/join`);
      
      TestAssertions.assertSuccessResponse(joinResponse, 200);

      // Check notifications for organizer
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);
      const notificationsResponse = await organizerClient.get('/api/v1/notifications');
      
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);
      expect(notificationsResponse.data.data).toHaveProperty('notifications');
      
      const notifications = notificationsResponse.data.data.notifications;
      const joinNotification = notifications.find((n: any) => 
        n.type === 'event_join' && n.data.eventId === eventId
      );
      
      expect(joinNotification).toBeDefined();
      expect(joinNotification.data.userId).toBe(participant.id);
    });

    it('should send notification when event is updated', async () => {
      const organizerClient = await integrationTestUtils.userManager.createAuthenticatedClient(organizer.id);

      // Update the event
      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description',
      };

      const updateResponse = await organizerClient.put(`/api/v1/events/${eventId}`, updateData);
      
      TestAssertions.assertSuccessResponse(updateResponse, 200);

      // Check notifications for participants (organizer in this case)
      const notificationsResponse = await organizerClient.get('/api/v1/notifications');
      
      TestAssertions.assertSuccessResponse(notificationsResponse, 200);
      
      const notifications = notificationsResponse.data.data.notifications;
      const updateNotification = notifications.find((n: any) => 
        n.type === 'event_update' && n.data.eventId === eventId
      );
      
      expect(updateNotification).toBeDefined();
    });
  });
});
