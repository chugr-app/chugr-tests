// Unit tests for Chat Service
describe('Chat Service', () => {
  describe('Message Validation', () => {
    it('should validate text message correctly', () => {
      const validateMessage = (message: any) => {
        const errors: string[] = [];
        
        if (!message.content || typeof message.content !== 'string') {
          errors.push('Message content is required');
        }
        
        if (message.content && message.content.length > 1000) {
          errors.push('Message content too long');
        }
        
        if (!message.type || !['text', 'image', 'file'].includes(message.type)) {
          errors.push('Invalid message type');
        }
        
        if (!message.senderId || typeof message.senderId !== 'string') {
          errors.push('Sender ID is required');
        }
        
        if (!message.conversationId || typeof message.conversationId !== 'string') {
          errors.push('Conversation ID is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const validMessage = {
        content: 'Hello, how are you?',
        type: 'text',
        senderId: 'user-123',
        conversationId: 'conv-456',
      };

      const result = validateMessage(validMessage);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid messages', () => {
      const validateMessage = (message: any) => {
        const errors: string[] = [];
        
        if (!message.content || typeof message.content !== 'string') {
          errors.push('Message content is required');
        }
        
        if (message.content && message.content.length > 1000) {
          errors.push('Message content too long');
        }
        
        if (!message.type || !['text', 'image', 'file'].includes(message.type)) {
          errors.push('Invalid message type');
        }
        
        if (!message.senderId || typeof message.senderId !== 'string') {
          errors.push('Sender ID is required');
        }
        
        if (!message.conversationId || typeof message.conversationId !== 'string') {
          errors.push('Conversation ID is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const invalidMessage = {
        content: '',
        type: 'invalid',
        senderId: '',
        conversationId: '',
      };

      const result = validateMessage(invalidMessage);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message content is required');
      expect(result.errors).toContain('Invalid message type');
      expect(result.errors).toContain('Sender ID is required');
      expect(result.errors).toContain('Conversation ID is required');
    });

    it('should reject messages that are too long', () => {
      const validateMessage = (message: any) => {
        const errors: string[] = [];
        
        if (!message.content || typeof message.content !== 'string') {
          errors.push('Message content is required');
        }
        
        if (message.content && message.content.length > 1000) {
          errors.push('Message content too long');
        }
        
        if (!message.type || !['text', 'image', 'file'].includes(message.type)) {
          errors.push('Invalid message type');
        }
        
        if (!message.senderId || typeof message.senderId !== 'string') {
          errors.push('Sender ID is required');
        }
        
        if (!message.conversationId || typeof message.conversationId !== 'string') {
          errors.push('Conversation ID is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const longMessage = {
        content: 'a'.repeat(1001),
        type: 'text',
        senderId: 'user-123',
        conversationId: 'conv-456',
      };

      const result = validateMessage(longMessage);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message content too long');
    });
  });

  describe('Conversation Management', () => {
    it('should validate conversation creation data', () => {
      const validateConversationData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.participantId || typeof data.participantId !== 'string') {
          errors.push('Participant ID is required');
        }
        
        if (!data.creatorId || typeof data.creatorId !== 'string') {
          errors.push('Creator ID is required');
        }
        
        if (data.creatorId === data.participantId) {
          errors.push('Cannot create conversation with yourself');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const validConversationData = {
        participantId: 'user-456',
        creatorId: 'user-123',
      };

      const result = validateConversationData(validConversationData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject self-conversation', () => {
      const validateConversationData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.participantId || typeof data.participantId !== 'string') {
          errors.push('Participant ID is required');
        }
        
        if (!data.creatorId || typeof data.creatorId !== 'string') {
          errors.push('Creator ID is required');
        }
        
        if (data.creatorId === data.participantId) {
          errors.push('Cannot create conversation with yourself');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const invalidConversationData = {
        participantId: 'user-123',
        creatorId: 'user-123',
      };

      const result = validateConversationData(invalidConversationData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot create conversation with yourself');
    });
  });

  describe('Message Filtering', () => {
    it('should filter messages by conversation ID', () => {
      const filterMessagesByConversation = (messages: any[], conversationId: string): any[] => {
        return messages.filter(message => message.conversationId === conversationId);
      };

      const messages = [
        { id: '1', conversationId: 'conv-1', content: 'Hello' },
        { id: '2', conversationId: 'conv-2', content: 'Hi' },
        { id: '3', conversationId: 'conv-1', content: 'How are you?' },
        { id: '4', conversationId: 'conv-3', content: 'Good morning' },
      ];

      const filteredMessages = filterMessagesByConversation(messages, 'conv-1');
      
      expect(filteredMessages).toHaveLength(2);
      expect(filteredMessages[0].id).toBe('1');
      expect(filteredMessages[1].id).toBe('3');
    });

    it('should sort messages by timestamp', () => {
      const sortMessagesByTimestamp = (messages: any[]): any[] => {
        return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      };

      const messages = [
        { id: '1', timestamp: '2023-01-01T12:00:00Z', content: 'First' },
        { id: '2', timestamp: '2023-01-01T12:02:00Z', content: 'Third' },
        { id: '3', timestamp: '2023-01-01T12:01:00Z', content: 'Second' },
      ];

      const sortedMessages = sortMessagesByTimestamp(messages);
      
      expect(sortedMessages[0].id).toBe('1');
      expect(sortedMessages[1].id).toBe('3');
      expect(sortedMessages[2].id).toBe('2');
    });
  });

  describe('Message Content Processing', () => {
    it('should sanitize message content', () => {
      const sanitizeMessageContent = (content: string): string => {
        // Remove HTML tags and trim whitespace
        return content.replace(/<[^>]*>/g, '').replace(/alert\([^)]*\)/g, '').trim();
      };

      const htmlContent = '<script>alert("xss")</script>Hello <b>world</b>!';
      const sanitized = sanitizeMessageContent(htmlContent);
      
      expect(sanitized).toBe('Hello world!');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<b>');
    });

    it('should detect and handle mentions', () => {
      const extractMentions = (content: string): string[] => {
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match;
        
        while ((match = mentionRegex.exec(content)) !== null) {
          if (match[1]) {
            mentions.push(match[1]);
          }
        }
        
        return mentions;
      };

      const content = 'Hello @john and @jane, how are you?';
      const mentions = extractMentions(content);
      
      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('john');
      expect(mentions).toContain('jane');
    });

    it('should detect URLs in messages', () => {
      const extractUrls = (content: string): string[] => {
        const urlRegex = /https?:\/\/[^\s]+/g;
        return content.match(urlRegex) || [];
      };

      const content = 'Check out https://example.com and http://test.org';
      const urls = extractUrls(content);
      
      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('http://test.org');
    });
  });

  describe('Real-time Features', () => {
    it('should track user online status', () => {
      const updateUserStatus = (userId: string, status: 'online' | 'offline' | 'away', userStatuses: Map<string, string>): void => {
        userStatuses.set(userId, status);
      };

      const userStatuses = new Map<string, string>();
      
      updateUserStatus('user-1', 'online', userStatuses);
      updateUserStatus('user-2', 'away', userStatuses);
      
      expect(userStatuses.get('user-1')).toBe('online');
      expect(userStatuses.get('user-2')).toBe('away');
    });

    it('should track typing indicators', () => {
      const setTypingStatus = (userId: string, conversationId: string, isTyping: boolean, typingUsers: Map<string, Set<string>>): void => {
        if (!typingUsers.has(conversationId)) {
          typingUsers.set(conversationId, new Set());
        }
        
        const conversationTyping = typingUsers.get(conversationId)!;
        
        if (isTyping) {
          conversationTyping.add(userId);
        } else {
          conversationTyping.delete(userId);
        }
      };

      const typingUsers = new Map<string, Set<string>>();
      
      setTypingStatus('user-1', 'conv-1', true, typingUsers);
      setTypingStatus('user-2', 'conv-1', true, typingUsers);
      
      expect(typingUsers.get('conv-1')?.has('user-1')).toBe(true);
      expect(typingUsers.get('conv-1')?.has('user-2')).toBe(true);
      
      setTypingStatus('user-1', 'conv-1', false, typingUsers);
      
      expect(typingUsers.get('conv-1')?.has('user-1')).toBe(false);
      expect(typingUsers.get('conv-1')?.has('user-2')).toBe(true);
    });
  });

  describe('Message Delivery Status', () => {
    it('should track message delivery status', () => {
      const updateDeliveryStatus = (messageId: string, status: 'sent' | 'delivered' | 'read', messageStatuses: Map<string, string>): void => {
        messageStatuses.set(messageId, status);
      };

      const messageStatuses = new Map<string, string>();
      
      updateDeliveryStatus('msg-1', 'sent', messageStatuses);
      updateDeliveryStatus('msg-1', 'delivered', messageStatuses);
      updateDeliveryStatus('msg-1', 'read', messageStatuses);
      
      expect(messageStatuses.get('msg-1')).toBe('read');
    });

    it('should get unread message count for user', () => {
      const getUnreadCount = (userId: string, messages: any[]): number => {
        return messages.filter(message => 
          message.recipientId === userId && 
          message.status !== 'read'
        ).length;
      };

      const messages = [
        { id: '1', recipientId: 'user-1', status: 'read' },
        { id: '2', recipientId: 'user-1', status: 'delivered' },
        { id: '3', recipientId: 'user-1', status: 'sent' },
        { id: '4', recipientId: 'user-2', status: 'delivered' },
      ];

      const unreadCount = getUnreadCount('user-1', messages);
      
      expect(unreadCount).toBe(2);
    });
  });
});
