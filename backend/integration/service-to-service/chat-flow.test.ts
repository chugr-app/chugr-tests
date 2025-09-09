// Integration test for chat service workflow
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Chat Service Integration', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  }, 60000); // 60 second timeout

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Chat Conversation Management', () => {
    let user1: any, user2: any;
    // tokens removed as they're not used in these tests

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Alice',
        lastName: 'Johnson',
      });
      user1 = user1Data.user;
      // token1 = user1Data.token; // Not used in these tests

      const user2Data = await integrationTestUtils.userManager.createUser({
        firstName: 'Bob',
        lastName: 'Smith',
      });
      user2 = user2Data.user;
      // token2 = user2Data.token; // Not used in these tests
    });

    it('should create conversation between matched users', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      // First, create a match between users
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create a conversation between matched users
      const createConversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });
      
      TestAssertions.assertSuccessResponse(createConversationResponse, 201);

      // Get conversations for user1
      const conversationsResponse = await client1.get('/api/v1/chat/conversations');
      
      TestAssertions.assertSuccessResponse(conversationsResponse, 200);
      expect(conversationsResponse.data.data).toHaveProperty('conversations');
      expect(Array.isArray(conversationsResponse.data.data.conversations)).toBe(true);
      
      const conversations = conversationsResponse.data.data.conversations;
      expect(conversations.length).toBe(1);
      
      const conversation = conversations[0];
      expect(conversation).toHaveProperty('id');
      expect(conversation).toHaveProperty('participants');
      expect(conversation).toHaveProperty('lastMessage');
      expect(conversation).toHaveProperty('unreadCount');
      expect(conversation).toHaveProperty('createdAt');
      expect(conversation).toHaveProperty('updatedAt');
      
      // Check participants
      expect(Array.isArray(conversation.participants)).toBe(true);
      expect(conversation.participants.length).toBe(2);
      
      const participantIds = conversation.participants.map((p: any) => p.id);
      expect(participantIds).toContain(user1.id);
      expect(participantIds).toContain(user2.id);
    });

    it('should not create conversation for unmatched users', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      // Get conversations without creating a match
      const conversationsResponse = await client1.get('/api/v1/chat/conversations');
      
      TestAssertions.assertSuccessResponse(conversationsResponse, 200);
      
      const conversations = conversationsResponse.data.data.conversations;
      expect(conversations.length).toBe(0);
    });

    it('should get conversation by ID', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      // Create a match
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create conversation
      const createConversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });
      
      TestAssertions.assertSuccessResponse(createConversationResponse, 201);
      const conversationId = createConversationResponse.data.data.conversation.id;

      // Get specific conversation
      const conversationResponse = await client1.get(`/api/v1/chat/conversations/${conversationId}`);
      
      TestAssertions.assertSuccessResponse(conversationResponse, 200);
      expect(conversationResponse.data.data).toHaveProperty('id', conversationId);
      expect(conversationResponse.data.data).toHaveProperty('participants');
      expect(conversationResponse.data.data).toHaveProperty('messages');
    });

    it('should handle non-existent conversation', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      
      const conversationResponse = await client1.get('/api/v1/chat/conversations/non-existent-id');
      
      TestAssertions.assertErrorResponse(conversationResponse, 404, 'CONVERSATION_NOT_FOUND');
    });
  });

  describe('Message Management', () => {
    let user1: any, user2: any;
    let conversationId: string;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser();
      user1 = user1Data.user;

      const user2Data = await integrationTestUtils.userManager.createUser();
      user2 = user2Data.user;

      // Create a match and conversation
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create conversation explicitly
      const createConversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });
      
      conversationId = createConversationResponse.data.data.conversation.id;
    });

    it('should send and receive messages', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      const messageData = {
        conversationId,
        content: 'Hello! How are you?',
        type: 'text'
      };

      // User1 sends a message
      const sendResponse = await client1.post('/api/v1/chat/messages', messageData);
      
      TestAssertions.assertSuccessResponse(sendResponse, 201);
      expect(sendResponse.data.data).toHaveProperty('id');
      expect(sendResponse.data.data).toHaveProperty('content', messageData.content);
      expect(sendResponse.data.data).toHaveProperty('senderId', user1.id);
      expect(sendResponse.data.data).toHaveProperty('conversationId', conversationId);
      expect(sendResponse.data.data).toHaveProperty('type', 'text');
      expect(sendResponse.data.data).toHaveProperty('timestamp');
      expect(sendResponse.data.data).toHaveProperty('status', 'sent');

      const messageId = sendResponse.data.data.id;

      // User2 gets messages
      const messagesResponse = await client2.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      
      TestAssertions.assertSuccessResponse(messagesResponse, 200);
      expect(messagesResponse.data.data).toHaveProperty('messages');
      expect(Array.isArray(messagesResponse.data.data.messages)).toBe(true);
      
      const messages = messagesResponse.data.data.messages;
      expect(messages.length).toBe(1);
      
      const message = messages[0];
      expect(message).toHaveProperty('id', messageId);
      expect(message).toHaveProperty('content', messageData.content);
      expect(message).toHaveProperty('senderId', user1.id);
      expect(message).toHaveProperty('type', 'text');
      expect(message).toHaveProperty('timestamp');
    });

    it('should handle different message types', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      // Text message
      const textMessage = {
        conversationId,
        content: 'Hello!',
        type: 'text'
      };

      const textResponse = await client1.post('/api/v1/chat/messages', textMessage);
      TestAssertions.assertSuccessResponse(textResponse, 201);
      expect(textResponse.data.data.type).toBe('text');

      // Image message
      const imageMessage = {
        conversationId,
        content: 'https://example.com/image.jpg',
        type: 'image'
      };

      const imageResponse = await client1.post('/api/v1/chat/messages', imageMessage);
      TestAssertions.assertSuccessResponse(imageResponse, 201);
      expect(imageResponse.data.data.type).toBe('image');

      // Emoji message
      const emojiMessage = {
        conversationId,
        content: '😊',
        type: 'emoji'
      };

      const emojiResponse = await client1.post('/api/v1/chat/messages', emojiMessage);
      TestAssertions.assertSuccessResponse(emojiResponse, 201);
      expect(emojiResponse.data.data.type).toBe('emoji');
    });

    it('should validate message content', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      // Empty content
      const emptyMessage = {
        conversationId,
        content: '',
        type: 'text'
      };

      const emptyResponse = await client1.post('/api/v1/chat/messages', emptyMessage);
      TestAssertions.assertErrorResponse(emptyResponse, 400, 'VALIDATION_ERROR');

      // Missing content
      const missingContentMessage = {
        conversationId,
        type: 'text'
      };

      const missingResponse = await client1.post('/api/v1/chat/messages', missingContentMessage);
      TestAssertions.assertErrorResponse(missingResponse, 400, 'VALIDATION_ERROR');

      // Invalid message type
      const invalidTypeMessage = {
        conversationId,
        content: 'Hello!',
        type: 'invalid_type'
      };

      const invalidTypeResponse = await client1.post('/api/v1/chat/messages', invalidTypeMessage);
      TestAssertions.assertErrorResponse(invalidTypeResponse, 400, 'VALIDATION_ERROR');
    });

    it('should handle message status updates', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      // User1 sends a message
      const messageData = {
        conversationId,
        content: 'Hello!',
        type: 'text'
      };

      const sendResponse = await client1.post('/api/v1/chat/messages', messageData);
      const messageId = sendResponse.data.data.id;

      // User2 marks message as read
      const readResponse = await client2.put(`/api/v1/chat/messages/${messageId}/read`);
      
      TestAssertions.assertSuccessResponse(readResponse, 200);
      expect(readResponse.data.data).toHaveProperty('status', 'read');
      expect(readResponse.data.data).toHaveProperty('readAt');
    });

    it('should handle message deletion', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      // Send a message
      const messageData = {
        conversationId,
        content: 'This message will be deleted',
        type: 'text'
      };

      const sendResponse = await client1.post('/api/v1/chat/messages', messageData);
      const messageId = sendResponse.data.data.id;

      // Delete the message
      const deleteResponse = await client1.delete(`/api/v1/chat/messages/${messageId}`);
      
      TestAssertions.assertSuccessResponse(deleteResponse, 200);

      // Verify message is deleted
      const messagesResponse = await client1.get(`/api/v1/chat/conversations/${conversationId}/messages`);
      const messages = messagesResponse.data.data.messages;
      
      const deletedMessage = messages.find((msg: any) => msg.id === messageId);
      expect(deletedMessage).toBeUndefined();
    });
  });

  describe('Real-time Messaging', () => {
    let user1: any, user2: any;
    let conversationId: string;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser();
      user1 = user1Data.user;

      const user2Data = await integrationTestUtils.userManager.createUser();
      user2 = user2Data.user;

      // Create a match and conversation
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create conversation explicitly
      const createConversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });
      
      conversationId = createConversationResponse.data.data.conversation.id;
    });

    it('should handle typing indicators', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      // Send typing indicator
      const typingResponse = await client1.post(`/api/v1/chat/conversations/${conversationId}/typing`, {
        isTyping: true
      });
      
      TestAssertions.assertSuccessResponse(typingResponse, 200);

      // Stop typing indicator
      const stopTypingResponse = await client1.post(`/api/v1/chat/conversations/${conversationId}/typing`, {
        isTyping: false
      });
      
      TestAssertions.assertSuccessResponse(stopTypingResponse, 200);
    });

    it('should handle message reactions', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      // User1 sends a message
      const messageData = {
        conversationId,
        content: 'Hello!',
        type: 'text'
      };

      const sendResponse = await client1.post('/api/v1/chat/messages', messageData);
      const messageId = sendResponse.data.data.id;

      // User2 reacts to the message
      const reactionResponse = await client2.post(`/api/v1/chat/messages/${messageId}/reactions`, {
        emoji: '👍'
      });
      
      TestAssertions.assertSuccessResponse(reactionResponse, 200);
      expect(reactionResponse.data.data).toHaveProperty('reactions');
      expect(Array.isArray(reactionResponse.data.data.reactions)).toBe(true);
      
      const reactions = reactionResponse.data.data.reactions;
      expect(reactions.length).toBe(1);
      expect(reactions[0]).toHaveProperty('emoji', '👍');
      expect(reactions[0]).toHaveProperty('userId', user2.id);
    });
  });

  describe('Chat Permissions', () => {
    let user1: any, user2: any, user3: any;

    beforeEach(async () => {
      const user1Data = await integrationTestUtils.userManager.createUser();
      user1 = user1Data.user;

      const user2Data = await integrationTestUtils.userManager.createUser();
      user2 = user2Data.user;

      const user3Data = await integrationTestUtils.userManager.createUser();
      user3 = user3Data.user;
    });

    it('should prevent messaging unmatched users', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);

      // Try to send message to unmatched user
      const messageData = {
        conversationId: 'fake-conversation-id',
        content: 'Hello!',
        type: 'text'
      };

      const messageResponse = await client1.post('/api/v1/chat/messages', messageData);
      
      TestAssertions.assertErrorResponse(messageResponse, 403, 'CONVERSATION_ACCESS_DENIED');
    });

    it('should prevent accessing other users conversations', async () => {
      const client1 = await integrationTestUtils.userManager.createAuthenticatedClient(user1.id);
      const client2 = await integrationTestUtils.userManager.createAuthenticatedClient(user2.id);

      // Create a match between user1 and user2
      await client1.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        action: 'like'
      });

      await client2.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        action: 'like'
      });

      // Create conversation explicitly
      const createConversationResponse = await client1.post('/api/v1/chat/conversations', {
        participantIds: [user2.id]
      });
      
      const conversationId = createConversationResponse.data.data.conversation.id;

      // Try to access conversation as user3 (who is not part of it)
      const client3 = await integrationTestUtils.userManager.createAuthenticatedClient(user3.id);
      const unauthorizedResponse = await client3.get(`/api/v1/chat/conversations/${conversationId}`);
      
      TestAssertions.assertErrorResponse(unauthorizedResponse, 403, 'CONVERSATION_ACCESS_DENIED');
    });
  });
});
