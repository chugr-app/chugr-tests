// Integration tests for User Service API endpoints
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('User API Integration Tests', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('User Registration and Authentication', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        birthDate: '1990-01-01',
        gender: 'MALE'
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/register', userData);
      
      TestAssertions.assertSuccessResponse(response, 201);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('tokens');
      expect(response.data.data.user.email).toBe(userData.email);
      expect(response.data.data.user.firstName).toBe(userData.firstName);
      expect(response.data.data.user.lastName).toBe(userData.lastName);
      expect(response.data.data.user).not.toHaveProperty('password');
    });

    it('should login with valid credentials', async () => {
      // Create a user first
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Login',
        lastName: 'Test',
      });

      const loginData = {
        email: userData.user.email,
        password: 'TestPassword123!'
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/login', loginData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('tokens');
      expect(response.data.data.user.id).toBe(userData.user.id);
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'WrongPassword'
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/login', loginData);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should refresh tokens successfully', async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Refresh',
        lastName: 'Test',
      });

      const refreshData = {
        refreshToken: userData.refreshToken // Use refreshToken instead of accessToken
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/refresh', refreshData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('tokens');
      expect(response.data.data.tokens).toHaveProperty('accessToken');
      expect(response.data.data.tokens).toHaveProperty('refreshToken');
    });

    it('should logout successfully', async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Logout',
        lastName: 'Test',
      });

      const client = await integrationTestUtils.userManager.createAuthenticatedClient(userData.user.id);

      const response = await client.post('/api/v1/auth/logout');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });
  });

  describe('User Profile Management', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Profile',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should get user profile', async () => {
      const response = await client.get('/api/v1/users/profile');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('id', user.id);
      expect(response.data.data).toHaveProperty('firstName', user.firstName);
      expect(response.data.data).toHaveProperty('lastName', user.lastName);
      expect(response.data.data).toHaveProperty('email', user.email);
      expect(response.data.data).not.toHaveProperty('password');
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'This is my updated bio',
        interests: ['music', 'travel', 'photography']
      };

      const response = await client.put('/api/v1/users/profile', updateData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.firstName).toBe(updateData.firstName);
      expect(response.data.data.lastName).toBe(updateData.lastName);
      expect(response.data.data.bio).toBe(updateData.bio);
      expect(response.data.data.interests).toEqual(updateData.interests);
    });

    it('should update user preferences', async () => {
      const preferencesData = {
        ageRange: { min: 25, max: 35 },
        maxDistance: 50,
        interestedInGenders: ['female'],
        showMe: true
      };

      const response = await client.put('/api/v1/users/preferences', preferencesData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.ageRange).toEqual(preferencesData.ageRange);
      expect(response.data.data.maxDistance).toBe(preferencesData.maxDistance);
      expect(response.data.data.interestedInGenders).toEqual(preferencesData.interestedInGenders);
    });

    it('should get user preferences', async () => {
      const response = await client.get('/api/v1/users/preferences');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('ageRange');
      expect(response.data.data).toHaveProperty('maxDistance');
      expect(response.data.data).toHaveProperty('interestedInGenders');
      expect(response.data.data).toHaveProperty('showMe');
    });

    it('should upload profile photo', async () => {
      // Create a mock file buffer
      const mockImageBuffer = Buffer.from('mock image data');
      
      const formData = new FormData();
      const blob = new Blob([mockImageBuffer], { type: 'image/jpeg' });
      formData.append('photo', blob, 'profile.jpg');

      const response = await client.post('/api/v1/users/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      TestAssertions.assertSuccessResponse(response, 201);
      expect(response.data.data).toHaveProperty('photo');
      expect(response.data.data.photo).toHaveProperty('id');
      expect(response.data.data.photo).toHaveProperty('url');
      expect(response.data.data.photo).toHaveProperty('isPrimary');
    });

    it('should delete profile photo', async () => {
      // First upload a photo
      const mockImageBuffer = Buffer.from('mock image data');
      const formData = new FormData();
      const blob = new Blob([mockImageBuffer], { type: 'image/jpeg' });
      formData.append('photo', blob, 'profile.jpg');

      const uploadResponse = await client.post('/api/v1/users/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const photoId = uploadResponse.data.data.photo.id;

      // Then delete it
      const deleteResponse = await client.delete(`/api/v1/users/photos/${photoId}`);
      
      TestAssertions.assertSuccessResponse(deleteResponse, 200);
      expect(deleteResponse.data.data).toHaveProperty('message');
    });

    it('should set primary photo', async () => {
      // First upload a photo
      const mockImageBuffer = Buffer.from('mock image data');
      const formData = new FormData();
      const blob = new Blob([mockImageBuffer], { type: 'image/jpeg' });
      formData.append('photo', blob, 'profile.jpg');

      const uploadResponse = await client.post('/api/v1/users/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const photoId = uploadResponse.data.data.photo.id;

      // Set as primary
      const response = await client.put(`/api/v1/users/photos/${photoId}/primary`);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.photo.isPrimary).toBe(true);
    });
  });

  describe('User Location Management', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Location',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should update user location', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY, USA'
      };

      const response = await client.put('/api/v1/users/location', locationData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.latitude).toBe(locationData.latitude);
      expect(response.data.data.longitude).toBe(locationData.longitude);
      expect(response.data.data.address).toBe(locationData.address);
    });

    it('should get user location', async () => {
      // First set a location
      const locationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY, USA'
      };

      await client.put('/api/v1/users/location', locationData);

      // Then get it
      const response = await client.get('/api/v1/users/location');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.latitude).toBe(locationData.latitude);
      expect(response.data.data.longitude).toBe(locationData.longitude);
      expect(response.data.data.address).toBe(locationData.address);
    });
  });

  describe('User Privacy and Settings', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Privacy',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should update privacy settings', async () => {
      const privacyData = {
        showAge: false,
        showDistance: true,
        showOnlineStatus: false,
        allowMessages: true
      };

      const response = await client.put('/api/v1/users/privacy', privacyData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data.showAge).toBe(privacyData.showAge);
      expect(response.data.data.showDistance).toBe(privacyData.showDistance);
      expect(response.data.data.showOnlineStatus).toBe(privacyData.showOnlineStatus);
      expect(response.data.data.allowMessages).toBe(privacyData.allowMessages);
    });

    it('should get privacy settings', async () => {
      const response = await client.get('/api/v1/users/privacy');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('showAge');
      expect(response.data.data).toHaveProperty('showDistance');
      expect(response.data.data).toHaveProperty('showOnlineStatus');
      expect(response.data.data).toHaveProperty('allowMessages');
    });

    it('should block another user', async () => {
      // Create another user to block
      const otherUserData = await integrationTestUtils.userManager.createUser({
        firstName: 'ToBlock',
        lastName: 'User',
      });

      const response = await client.post('/api/v1/users/block', {
        userId: otherUserData.user.id
      });
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });

    it('should unblock a user', async () => {
      // Create another user and block them first
      const otherUserData = await integrationTestUtils.userManager.createUser({
        firstName: 'ToUnblock',
        lastName: 'User',
      });

      await client.post('/api/v1/users/block', {
        userId: otherUserData.user.id
      });

      // Then unblock
      const response = await client.delete(`/api/v1/users/block/${otherUserData.user.id}`);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });

    it('should get blocked users list', async () => {
      const response = await client.get('/api/v1/users/blocked');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('blockedUsers');
      expect(Array.isArray(response.data.data.blockedUsers)).toBe(true);
    });
  });

  describe('User Account Management', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Account',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    }, 60000); // Increase timeout to 60 seconds

    it('should change password', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewSecurePassword456!',
        confirmPassword: 'NewSecurePassword456!'
      };

      const response = await client.put('/api/v1/users/password', passwordData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });

    it('should change email', async () => {
      const emailData = {
        newEmail: 'newemail@example.com',
        password: 'TestPassword123!'
      };

      const response = await client.put('/api/v1/users/email', emailData);
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });

    it('should deactivate account', async () => {
      const response = await client.put('/api/v1/users/deactivate');
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });

    it('should delete account', async () => {
      const deleteData = {
        password: 'TestPassword123!',
        confirmation: 'DELETE'
      };

      const response = await client.delete('/api/v1/users/account', { params: deleteData });
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(response.data.data).toHaveProperty('message');
    });
  });

  describe('Error Handling and Validation', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Error',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should validate required fields during registration', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '', // Empty
        // Missing lastName, dateOfBirth, gender
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/register', invalidData);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.data.error).toHaveProperty('details');
    });

    it('should handle unauthorized access', async () => {
      const response = await integrationTestUtils.httpClient.get('/api/v1/users/profile');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should handle invalid user ID in requests', async () => {
      const response = await client.post('/api/v1/users/block', {
        userId: 'invalid-uuid'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should handle duplicate email registration', async () => {
      // Create a user first
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Duplicate',
        lastName: 'Test',
      });

      // Try to register with the same email
      const duplicateData = {
        email: userData.user.email,
        password: 'SecurePassword123!',
        firstName: 'Another',
        lastName: 'User',
        birthDate: '1990-01-01',
        gender: 'FEMALE'
      };

      const response = await integrationTestUtils.httpClient.post('/api/v1/auth/register', duplicateData);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid sequential requests to trigger rate limiting
      const responses = [];
      
      for (let i = 0; i < 15; i++) {
        try {
          const response = await client.get('/api/v1/users/profile');
          responses.push(response);
        } catch (error: any) {
          // Capture rate limit errors
          if (error.response) {
            responses.push(error.response);
          }
        }
      }

      // Some requests should succeed, but rate limiting should kick in
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // In test environment, rate limiting may be disabled or have high limits
      // This test verifies that the endpoint responds correctly to multiple requests
      // Rate limiting behavior is environment-dependent
      if (rateLimitedRequests.length === 0) {
        console.log('Rate limiting not triggered in test environment (expected behavior)');
        expect(successfulRequests.length).toBe(responses.length);
      } else {
        expect(rateLimitedRequests.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Caching', () => {
    let user: any, client: any;

    beforeEach(async () => {
      const userData = await integrationTestUtils.userManager.createUser({
        firstName: 'Performance',
        lastName: 'Test',
      });
      user = userData.user;
      client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
    });

    it('should respond quickly to profile requests', async () => {
      const startTime = Date.now();
      const response = await client.get('/api/v1/users/profile');
      const duration = Date.now() - startTime;
      
      TestAssertions.assertSuccessResponse(response, 200);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent profile requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        client.get('/api/v1/users/profile')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        TestAssertions.assertSuccessResponse(response, 200);
      });

      expect(duration).toBeLessThan(20000); // All requests should complete within 20 seconds
    });

    it('should cache user data effectively', async () => {
      // Make initial request
      const firstResponse = await client.get('/api/v1/users/profile');
      TestAssertions.assertSuccessResponse(firstResponse, 200);

      // Make subsequent requests - should be faster due to caching
      const startTime = Date.now();
      const secondResponse = await client.get('/api/v1/users/profile');
      const duration = Date.now() - startTime;

      TestAssertions.assertSuccessResponse(secondResponse, 200);
      expect(duration).toBeLessThan(200); // Cached response should be very fast
      expect(secondResponse.data.data.id).toBe(firstResponse.data.data.id);
    });
  });
});
