// Unit tests for Notification Service
describe('Notification Service', () => {
  describe('Notification Creation', () => {
    it('should validate notification data correctly', () => {
      const validateNotificationData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.userId || typeof data.userId !== 'string') {
          errors.push('User ID is required');
        }
        
        if (!data.type || typeof data.type !== 'string') {
          errors.push('Notification type is required');
        }
        
        const validTypes = ['match', 'message', 'event', 'system', 'reminder'];
        if (data.type && !validTypes.includes(data.type)) {
          errors.push('Invalid notification type');
        }
        
        if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
          errors.push('Notification title is required');
        }
        
        if (data.title && data.title.length > 100) {
          errors.push('Notification title too long');
        }
        
        if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
          errors.push('Notification message is required');
        }
        
        if (data.message && data.message.length > 500) {
          errors.push('Notification message too long');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const validNotificationData = {
        userId: 'user-123',
        type: 'match',
        title: 'New Match!',
        message: 'You have a new match with John Doe',
        data: {
          matchId: 'match-456',
          matchedUserId: 'user-789',
        },
      };

      const result = validateNotificationData(validNotificationData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid notification data', () => {
      const validateNotificationData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.userId || typeof data.userId !== 'string') {
          errors.push('User ID is required');
        }
        
        if (!data.type || typeof data.type !== 'string') {
          errors.push('Notification type is required');
        }
        
        const validTypes = ['match', 'message', 'event', 'system', 'reminder'];
        if (data.type && !validTypes.includes(data.type)) {
          errors.push('Invalid notification type');
        }
        
        if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
          errors.push('Notification title is required');
        }
        
        if (data.title && data.title.length > 100) {
          errors.push('Notification title too long');
        }
        
        if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
          errors.push('Notification message is required');
        }
        
        if (data.message && data.message.length > 500) {
          errors.push('Notification message too long');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const invalidNotificationData = {
        userId: '',
        type: 'invalid',
        title: '',
        message: '',
      };

      const result = validateNotificationData(invalidNotificationData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
      expect(result.errors).toContain('Invalid notification type');
      expect(result.errors).toContain('Notification title is required');
      expect(result.errors).toContain('Notification message is required');
    });
  });

  describe('Notification Types', () => {
    it('should create match notification correctly', () => {
      const createMatchNotification = (userId: string, matchedUserId: string, matchedUserName: string) => {
        return {
          userId,
          type: 'match',
          title: 'New Match!',
          message: `You have a new match with ${matchedUserName}`,
          data: {
            matchId: `match-${Date.now()}`,
            matchedUserId,
            matchedUserName,
          },
          priority: 'high',
          createdAt: new Date().toISOString(),
        };
      };

      const notification = createMatchNotification('user-123', 'user-456', 'John Doe');
      
      expect(notification.type).toBe('match');
      expect(notification.title).toBe('New Match!');
      expect(notification.message).toBe('You have a new match with John Doe');
      expect(notification.data.matchedUserId).toBe('user-456');
      expect(notification.data.matchedUserName).toBe('John Doe');
      expect(notification.priority).toBe('high');
    });

    it('should create message notification correctly', () => {
      const createMessageNotification = (userId: string, senderId: string, senderName: string, messagePreview: string) => {
        return {
          userId,
          type: 'message',
          title: `New message from ${senderName}`,
          message: messagePreview,
          data: {
            senderId,
            senderName,
            conversationId: `conv-${Date.now()}`,
          },
          priority: 'medium',
          createdAt: new Date().toISOString(),
        };
      };

      const notification = createMessageNotification('user-123', 'user-456', 'Jane Doe', 'Hey, how are you?');
      
      expect(notification.type).toBe('message');
      expect(notification.title).toBe('New message from Jane Doe');
      expect(notification.message).toBe('Hey, how are you?');
      expect(notification.data.senderId).toBe('user-456');
      expect(notification.priority).toBe('medium');
    });

    it('should create event notification correctly', () => {
      const createEventNotification = (userId: string, eventId: string, eventTitle: string, eventType: string) => {
        return {
          userId,
          type: 'event',
          title: `New ${eventType} event`,
          message: `Check out "${eventTitle}"`,
          data: {
            eventId,
            eventTitle,
            eventType,
          },
          priority: 'medium',
          createdAt: new Date().toISOString(),
        };
      };

      const notification = createEventNotification('user-123', 'event-456', 'Drinking Night', 'drinking');
      
      expect(notification.type).toBe('event');
      expect(notification.title).toBe('New drinking event');
      expect(notification.message).toBe('Check out "Drinking Night"');
      expect(notification.data.eventId).toBe('event-456');
      expect(notification.data.eventTitle).toBe('Drinking Night');
    });
  });

  describe('Notification Delivery', () => {
    it('should determine delivery channels based on user preferences', () => {
      const getDeliveryChannels = (userPreferences: any, notificationType: string): string[] => {
        const channels: string[] = [];
        
        if (userPreferences.pushNotifications) {
          channels.push('push');
        }
        
        if (userPreferences.emailNotifications) {
          channels.push('email');
        }
        
        if (userPreferences.smsNotifications) {
          channels.push('sms');
        }
        
        // High priority notifications always include push
        if (notificationType === 'match' && !channels.includes('push')) {
          channels.push('push');
        }
        
        return channels;
      };

      const userPreferences = {
        pushNotifications: true,
        emailNotifications: false,
        smsNotifications: true,
      };

      const channels = getDeliveryChannels(userPreferences, 'message');
      
      expect(channels).toContain('push');
      expect(channels).toContain('sms');
      expect(channels).not.toContain('email');
    });

    it('should always include push for match notifications', () => {
      const getDeliveryChannels = (userPreferences: any, notificationType: string): string[] => {
        const channels: string[] = [];
        
        if (userPreferences.pushNotifications) {
          channels.push('push');
        }
        
        if (userPreferences.emailNotifications) {
          channels.push('email');
        }
        
        if (userPreferences.smsNotifications) {
          channels.push('sms');
        }
        
        // High priority notifications always include push
        if (notificationType === 'match' && !channels.includes('push')) {
          channels.push('push');
        }
        
        return channels;
      };

      const userPreferences = {
        pushNotifications: false,
        emailNotifications: true,
        smsNotifications: false,
      };

      const channels = getDeliveryChannels(userPreferences, 'match');
      
      expect(channels).toContain('push');
      expect(channels).toContain('email');
    });
  });

  describe('Notification Status Management', () => {
    it('should mark notification as read', () => {
      const markAsRead = (notification: any): any => {
        return {
          ...notification,
          status: 'read',
          readAt: new Date().toISOString(),
        };
      };

      const notification = {
        id: 'notif-123',
        status: 'unread',
        title: 'Test Notification',
      };

      const readNotification = markAsRead(notification);
      
      expect(readNotification.status).toBe('read');
      expect(readNotification.readAt).toBeDefined();
    });

    it('should mark notification as delivered', () => {
      const markAsDelivered = (notification: any, channel: string): any => {
        return {
          ...notification,
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
          deliveryChannel: channel,
        };
      };

      const notification = {
        id: 'notif-123',
        status: 'sent',
        title: 'Test Notification',
      };

      const deliveredNotification = markAsDelivered(notification, 'push');
      
      expect(deliveredNotification.status).toBe('delivered');
      expect(deliveredNotification.deliveryChannel).toBe('push');
      expect(deliveredNotification.deliveredAt).toBeDefined();
    });
  });

  describe('Notification Filtering and Sorting', () => {
    it('should filter notifications by user ID', () => {
      const filterNotificationsByUser = (notifications: any[], userId: string): any[] => {
        return notifications.filter(notification => notification.userId === userId);
      };

      const notifications = [
        { id: '1', userId: 'user-1', title: 'Notification 1' },
        { id: '2', userId: 'user-2', title: 'Notification 2' },
        { id: '3', userId: 'user-1', title: 'Notification 3' },
        { id: '4', userId: 'user-3', title: 'Notification 4' },
      ];

      const userNotifications = filterNotificationsByUser(notifications, 'user-1');
      
      expect(userNotifications).toHaveLength(2);
      expect(userNotifications[0].id).toBe('1');
      expect(userNotifications[1].id).toBe('3');
    });

    it('should filter unread notifications', () => {
      const filterUnreadNotifications = (notifications: any[]): any[] => {
        return notifications.filter(notification => notification.status === 'unread');
      };

      const notifications = [
        { id: '1', status: 'unread', title: 'Notification 1' },
        { id: '2', status: 'read', title: 'Notification 2' },
        { id: '3', status: 'unread', title: 'Notification 3' },
        { id: '4', status: 'delivered', title: 'Notification 4' },
      ];

      const unreadNotifications = filterUnreadNotifications(notifications);
      
      expect(unreadNotifications).toHaveLength(2);
      expect(unreadNotifications[0].id).toBe('1');
      expect(unreadNotifications[1].id).toBe('3');
    });

    it('should sort notifications by creation date', () => {
      const sortNotificationsByDate = (notifications: any[], order: 'asc' | 'desc' = 'desc'): any[] => {
        return notifications.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return order === 'desc' ? dateB - dateA : dateA - dateB;
        });
      };

      const notifications = [
        { id: '1', createdAt: '2023-01-01T12:00:00Z', title: 'Oldest' },
        { id: '2', createdAt: '2023-01-01T14:00:00Z', title: 'Newest' },
        { id: '3', createdAt: '2023-01-01T13:00:00Z', title: 'Middle' },
      ];

      const sortedNotifications = sortNotificationsByDate(notifications, 'desc');
      
      expect(sortedNotifications[0].id).toBe('2');
      expect(sortedNotifications[1].id).toBe('3');
      expect(sortedNotifications[2].id).toBe('1');
    });
  });

  describe('Notification Batching', () => {
    it('should batch notifications by type', () => {
      const batchNotificationsByType = (notifications: any[]): Map<string, any[]> => {
        const batches = new Map<string, any[]>();
        
        notifications.forEach(notification => {
          const type = notification.type;
          if (!batches.has(type)) {
            batches.set(type, []);
          }
          batches.get(type)!.push(notification);
        });
        
        return batches;
      };

      const notifications = [
        { id: '1', type: 'match', title: 'Match 1' },
        { id: '2', type: 'message', title: 'Message 1' },
        { id: '3', type: 'match', title: 'Match 2' },
        { id: '4', type: 'event', title: 'Event 1' },
        { id: '5', type: 'message', title: 'Message 2' },
      ];

      const batches = batchNotificationsByType(notifications);
      
      expect(batches.get('match')).toHaveLength(2);
      expect(batches.get('message')).toHaveLength(2);
      expect(batches.get('event')).toHaveLength(1);
    });

    it('should create batched notification summary', () => {
      const createBatchedSummary = (notifications: any[], type: string): any => {
        const count = notifications.length;
        const latestNotification = notifications[notifications.length - 1];
        
        return {
          type: `batched_${type}`,
          title: `${count} new ${type} notifications`,
          message: `You have ${count} new ${type} notifications`,
          data: {
            count,
            type,
            latestNotificationId: latestNotification.id,
          },
          priority: count > 5 ? 'high' : 'medium',
        };
      };

      const matchNotifications = [
        { id: '1', type: 'match', title: 'Match 1' },
        { id: '2', type: 'match', title: 'Match 2' },
        { id: '3', type: 'match', title: 'Match 3' },
      ];

      const summary = createBatchedSummary(matchNotifications, 'match');
      
      expect(summary.type).toBe('batched_match');
      expect(summary.title).toBe('3 new match notifications');
      expect(summary.message).toBe('You have 3 new match notifications');
      expect(summary.data.count).toBe(3);
      expect(summary.priority).toBe('medium');
    });
  });
});
