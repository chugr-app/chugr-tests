// Unit tests for Event Service
describe('Event Service', () => {
  describe('Event Validation', () => {
    it('should validate event creation data correctly', () => {
      const validateEventData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
          errors.push('Event title is required');
        }
        
        if (data.title && data.title.length > 100) {
          errors.push('Event title too long');
        }
        
        if (!data.description || typeof data.description !== 'string') {
          errors.push('Event description is required');
        }
        
        if (data.description && data.description.length > 1000) {
          errors.push('Event description too long');
        }
        
        if (!data.location || !data.location.latitude || !data.location.longitude) {
          errors.push('Event location is required');
        }
        
        if (data.location) {
          if (data.location.latitude < -90 || data.location.latitude > 90) {
            errors.push('Invalid latitude');
          }
          if (data.location.longitude < -180 || data.location.longitude > 180) {
            errors.push('Invalid longitude');
          }
        }
        
        if (!data.dateTime || !(data.dateTime instanceof Date)) {
          errors.push('Event date and time is required');
        }
        
        if (data.dateTime && data.dateTime <= new Date()) {
          errors.push('Event date must be in the future');
        }
        
        if (!data.maxParticipants || typeof data.maxParticipants !== 'number' || data.maxParticipants < 2) {
          errors.push('Max participants must be at least 2');
        }
        
        if (data.maxParticipants && data.maxParticipants > 100) {
          errors.push('Max participants cannot exceed 100');
        }
        
        if (!data.organizerId || typeof data.organizerId !== 'string') {
          errors.push('Organizer ID is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const validEventData = {
        title: 'Test Event',
        description: 'A test event for drinking and socializing',
        location: {
          latitude: 55.7558,
          longitude: 37.6176,
          address: 'Test Address, Moscow',
        },
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        maxParticipants: 10,
        organizerId: 'user-123',
        category: 'drinking',
        tags: ['social', 'drinking'],
      };

      const result = validateEventData(validEventData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid event data', () => {
      const validateEventData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
          errors.push('Event title is required');
        }
        
        if (data.title && data.title.length > 100) {
          errors.push('Event title too long');
        }
        
        if (!data.description || typeof data.description !== 'string') {
          errors.push('Event description is required');
        }
        
        if (data.description && data.description.length > 1000) {
          errors.push('Event description too long');
        }
        
        if (!data.location || !data.location.latitude || !data.location.longitude) {
          errors.push('Event location is required');
        }
        
        if (data.location) {
          if (data.location.latitude < -90 || data.location.latitude > 90) {
            errors.push('Invalid latitude');
          }
          if (data.location.longitude < -180 || data.location.longitude > 180) {
            errors.push('Invalid longitude');
          }
        }
        
        if (!data.dateTime || !(data.dateTime instanceof Date)) {
          errors.push('Event date and time is required');
        }
        
        if (data.dateTime && data.dateTime <= new Date()) {
          errors.push('Event date must be in the future');
        }
        
        if (!data.maxParticipants || typeof data.maxParticipants !== 'number' || data.maxParticipants < 2) {
          errors.push('Max participants must be at least 2');
        }
        
        if (data.maxParticipants && data.maxParticipants > 100) {
          errors.push('Max participants cannot exceed 100');
        }
        
        if (!data.organizerId || typeof data.organizerId !== 'string') {
          errors.push('Organizer ID is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const invalidEventData = {
        title: '',
        description: '',
        location: {
          latitude: 999,
          longitude: 999,
        },
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        maxParticipants: 1,
        organizerId: '',
      };

      const result = validateEventData(invalidEventData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event title is required');
      expect(result.errors).toContain('Event description is required');
      expect(result.errors).toContain('Invalid latitude');
      expect(result.errors).toContain('Invalid longitude');
      expect(result.errors).toContain('Event date must be in the future');
      expect(result.errors).toContain('Max participants must be at least 2');
      expect(result.errors).toContain('Organizer ID is required');
    });
  });

  describe('Event Participation', () => {
    it('should validate event join request', () => {
      const validateJoinRequest = (event: any, userId: string) => {
        const errors: string[] = [];
        
        if (event.organizerId === userId) {
          errors.push('Organizer cannot join their own event');
        }
        
        if (event.currentParticipants >= event.maxParticipants) {
          errors.push('Event is full');
        }
        
        if (event.dateTime <= new Date()) {
          errors.push('Cannot join past events');
        }
        
        if (event.status !== 'active') {
          errors.push('Event is not active');
        }
        
        return {
          canJoin: errors.length === 0,
          errors,
        };
      };

      const event = {
        id: 'event-1',
        organizerId: 'user-123',
        currentParticipants: 5,
        maxParticipants: 10,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      };

      const result = validateJoinRequest(event, 'user-456');
      
      expect(result.canJoin).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject join request for full event', () => {
      const validateJoinRequest = (event: any, userId: string) => {
        const errors: string[] = [];
        
        if (event.organizerId === userId) {
          errors.push('Organizer cannot join their own event');
        }
        
        if (event.currentParticipants >= event.maxParticipants) {
          errors.push('Event is full');
        }
        
        if (event.dateTime <= new Date()) {
          errors.push('Cannot join past events');
        }
        
        if (event.status !== 'active') {
          errors.push('Event is not active');
        }
        
        return {
          canJoin: errors.length === 0,
          errors,
        };
      };

      const fullEvent = {
        id: 'event-1',
        organizerId: 'user-123',
        currentParticipants: 10,
        maxParticipants: 10,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      };

      const result = validateJoinRequest(fullEvent, 'user-456');
      
      expect(result.canJoin).toBe(false);
      expect(result.errors).toContain('Event is full');
    });

    it('should reject organizer joining their own event', () => {
      const validateJoinRequest = (event: any, userId: string) => {
        const errors: string[] = [];
        
        if (event.organizerId === userId) {
          errors.push('Organizer cannot join their own event');
        }
        
        if (event.currentParticipants >= event.maxParticipants) {
          errors.push('Event is full');
        }
        
        if (event.dateTime <= new Date()) {
          errors.push('Cannot join past events');
        }
        
        if (event.status !== 'active') {
          errors.push('Event is not active');
        }
        
        return {
          canJoin: errors.length === 0,
          errors,
        };
      };

      const event = {
        id: 'event-1',
        organizerId: 'user-123',
        currentParticipants: 5,
        maxParticipants: 10,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      };

      const result = validateJoinRequest(event, 'user-123');
      
      expect(result.canJoin).toBe(false);
      expect(result.errors).toContain('Organizer cannot join their own event');
    });
  });

  describe('Event Search and Filtering', () => {
    it('should filter events by location', () => {
      const filterEventsByLocation = (events: any[], userLat: number, userLon: number, maxDistance: number): any[] => {
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        return events.filter(event => {
          const distance = calculateDistance(userLat, userLon, event.location.latitude, event.location.longitude);
          return distance <= maxDistance;
        });
      };

      const events = [
        {
          id: '1',
          location: { latitude: 55.7558, longitude: 37.6176 }, // Moscow center
        },
        {
          id: '2',
          location: { latitude: 55.7600, longitude: 37.6200 }, // Near Moscow center
        },
        {
          id: '3',
          location: { latitude: 55.8000, longitude: 37.7000 }, // Far from Moscow center
        },
      ];

      const userLat = 55.7558;
      const userLon = 37.6176;
      const maxDistance = 5; // 5km

      const filteredEvents = filterEventsByLocation(events, userLat, userLon, maxDistance);
      
      expect(filteredEvents).toHaveLength(2);
      expect(filteredEvents[0].id).toBe('1');
      expect(filteredEvents[1].id).toBe('2');
    });

    it('should filter events by date range', () => {
      const filterEventsByDateRange = (events: any[], startDate: Date, endDate: Date): any[] => {
        return events.filter(event => {
          const eventDate = new Date(event.dateTime);
          return eventDate >= startDate && eventDate <= endDate;
        });
      };

      const events = [
        { id: '1', dateTime: '2023-01-01T12:00:00Z' },
        { id: '2', dateTime: '2023-01-15T12:00:00Z' },
        { id: '3', dateTime: '2023-01-30T12:00:00Z' },
        { id: '4', dateTime: '2023-02-01T12:00:00Z' },
      ];

      const startDate = new Date('2023-01-01T00:00:00Z');
      const endDate = new Date('2023-01-31T23:59:59Z');

      const filteredEvents = filterEventsByDateRange(events, startDate, endDate);
      
      expect(filteredEvents).toHaveLength(3);
      expect(filteredEvents[0].id).toBe('1');
      expect(filteredEvents[1].id).toBe('2');
      expect(filteredEvents[2].id).toBe('3');
    });

    it('should filter events by category', () => {
      const filterEventsByCategory = (events: any[], category: string): any[] => {
        return events.filter(event => event.category === category);
      };

      const events = [
        { id: '1', category: 'drinking' },
        { id: '2', category: 'sports' },
        { id: '3', category: 'drinking' },
        { id: '4', category: 'music' },
      ];

      const drinkingEvents = filterEventsByCategory(events, 'drinking');
      
      expect(drinkingEvents).toHaveLength(2);
      expect(drinkingEvents[0].id).toBe('1');
      expect(drinkingEvents[1].id).toBe('3');
    });
  });

  describe('Event Status Management', () => {
    it('should update event status correctly', () => {
      const updateEventStatus = (event: any, newStatus: string): any => {
        const validStatuses = ['draft', 'active', 'cancelled', 'completed'];
        
        if (!validStatuses.includes(newStatus)) {
          throw new Error('Invalid event status');
        }
        
        return {
          ...event,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      };

      const event = {
        id: 'event-1',
        status: 'draft',
        title: 'Test Event',
      };

      const updatedEvent = updateEventStatus(event, 'active');
      
      expect(updatedEvent.status).toBe('active');
      expect(updatedEvent.updatedAt).toBeDefined();
    });

    it('should reject invalid event status', () => {
      const updateEventStatus = (event: any, newStatus: string): any => {
        const validStatuses = ['draft', 'active', 'cancelled', 'completed'];
        
        if (!validStatuses.includes(newStatus)) {
          throw new Error('Invalid event status');
        }
        
        return {
          ...event,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      };

      const event = {
        id: 'event-1',
        status: 'draft',
        title: 'Test Event',
      };

      expect(() => updateEventStatus(event, 'invalid')).toThrow('Invalid event status');
    });
  });

  describe('Event Analytics', () => {
    it('should calculate event popularity score', () => {
      const calculatePopularityScore = (event: any): number => {
        const participationRate = event.currentParticipants / event.maxParticipants;
        const timeUntilEvent = (new Date(event.dateTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24); // days
        
        // Higher participation rate and closer to event date = higher popularity
        const participationScore = participationRate * 0.7;
        const timeScore = Math.max(0, (30 - timeUntilEvent) / 30) * 0.3; // Max score if event is today
        
        return Math.min(1, participationScore + timeScore);
      };

      const popularEvent = {
        currentParticipants: 8,
        maxParticipants: 10,
        dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      };

      const unpopularEvent = {
        currentParticipants: 2,
        maxParticipants: 20,
        dateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      const popularScore = calculatePopularityScore(popularEvent);
      const unpopularScore = calculatePopularityScore(unpopularEvent);
      
      expect(popularScore).toBeGreaterThan(unpopularScore);
      expect(popularScore).toBeGreaterThan(0);
      expect(popularScore).toBeLessThanOrEqual(1);
    });
  });
});
