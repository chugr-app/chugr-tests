// Integration test for authentication flow between services
import { 
  integrationTestUtils, 
  setupBeforeTest, 
  cleanupAfterTest,
  TestAssertions 
} from '../../../shared/helpers/integration-helpers';

describe('Authentication Flow Integration', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('User Registration and Login Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Register a new user
      const userData = integrationTestUtils.dataFactory.createUser();

      const registerResponse = await integrationTestUtils.httpClient.post(
        '/api/v1/auth/register',
        userData
      );

      TestAssertions.assertSuccessResponse(registerResponse, 201);
      expect(registerResponse.data.data).toHaveProperty('user');
      expect(registerResponse.data.data.user.email).toBe(userData.email);

      // 2. Login with the registered user
      const loginResponse = await integrationTestUtils.httpClient.post(
        '/api/v1/auth/login',
        {
          email: userData.email,
          password: userData.password,
        }
      );

      TestAssertions.assertSuccessResponse(loginResponse, 200);
      expect(loginResponse.data.data).toHaveProperty('tokens');
      expect(loginResponse.data.data.tokens).toHaveProperty('accessToken');
      expect(loginResponse.data.data).toHaveProperty('user');
      expect(loginResponse.data.data.user.email).toBe(userData.email);

      const token = loginResponse.data.data.tokens.accessToken;
      const userId = loginResponse.data.data.user.id;

      // 3. Access protected endpoint with token
      const protectedResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        {
          'Authorization': `Bearer ${token}`
        }
      );

      TestAssertions.assertSuccessResponse(protectedResponse, 200);
      TestAssertions.assertUserData(protectedResponse.data.data, userData);

      // 4. Verify token is valid by making another request
      const secondProtectedResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: `Bearer ${token}` }
      );

      TestAssertions.assertSuccessResponse(secondProtectedResponse, 200);
      expect(secondProtectedResponse.data.data.id).toBe(userId);
    });

    it('should reject invalid credentials', async () => {
      const invalidLoginResponse = await integrationTestUtils.httpClient.post(
        '/api/v1/auth/login',
        {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }
      );

      TestAssertions.assertErrorResponse(invalidLoginResponse, 401, 'INVALID_CREDENTIALS');
    });

    it('should reject requests without token', async () => {
      const unauthorizedResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile'
      );

      TestAssertions.assertErrorResponse(unauthorizedResponse, 401, 'NO_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      const invalidTokenResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: 'Bearer invalid-token' }
      );

      TestAssertions.assertErrorResponse(invalidTokenResponse, 403, 'INVALID_TOKEN');
    });
  });

  describe('User Profile Management Flow', () => {
    // testUser removed as it's not used in these tests
    let testToken: string;

    beforeEach(async () => {
      const { user: _user, token } = await integrationTestUtils.userManager.createUser();
      testToken = token;
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        age: 30,
      };

      const updateResponse = await integrationTestUtils.httpClient.put(
        '/api/v1/users/profile',
        updateData,
        { Authorization: `Bearer ${testToken}` }
      );

      TestAssertions.assertSuccessResponse(updateResponse, 200);
      expect(updateResponse.data.data.firstName).toBe(updateData.firstName);
      expect(updateResponse.data.data.lastName).toBe(updateData.lastName);
      if (updateData.age) {
        expect(updateResponse.data.data).toHaveProperty('birthDate');
      }

      // Verify the update by fetching the profile again
      const profileResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: `Bearer ${testToken}` }
      );

      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data.firstName).toBe(updateData.firstName);
      expect(profileResponse.data.data.lastName).toBe(updateData.lastName);
      expect(profileResponse.data.data.age).toBe(updateData.age);
    });

    it('should validate profile update data', async () => {
      const invalidUpdateData = {
        age: 15, // Invalid age
        email: 'invalid-email', // Invalid email format
      };

      const updateResponse = await integrationTestUtils.httpClient.put(
        '/api/v1/users/profile',
        invalidUpdateData,
        { Authorization: `Bearer ${testToken}` }
      );

      TestAssertions.assertErrorResponse(updateResponse, 400, 'VALIDATION_ERROR');
    });
  });

  describe('Service-to-Service Authentication', () => {
    it('should allow service-to-service communication', async () => {
      // Create a user through User Service
      const { user, token: _token } = await integrationTestUtils.userManager.createUser();

      // Test that API Gateway can communicate with User Service
      const profileResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: `Bearer ${_token}` }
      );

      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data.id).toBe(user.id);

      // Test that other services can access user data through API Gateway
      const searchResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/search?q=service',
        { Authorization: `Bearer ${_token}` }
      );

      TestAssertions.assertSuccessResponse(searchResponse, 200);
      expect(Array.isArray(searchResponse.data.data.users)).toBe(true);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh expired token', async () => {
      const { user, token: _token } = await integrationTestUtils.userManager.createUser();

      // Get refresh token from login response
      const loginResponse = await integrationTestUtils.httpClient.post(
        '/api/v1/auth/login',
        {
          email: user.email,
          password: user.password,
        }
      );

      const refreshToken = loginResponse.data.data.tokens.refreshToken;

      // Use refresh token to get new access token
      const refreshResponse = await integrationTestUtils.httpClient.post(
        '/api/v1/auth/refresh',
        { refreshToken }
      );

      TestAssertions.assertSuccessResponse(refreshResponse, 200);
      expect(refreshResponse.data.data).toHaveProperty('tokens');
      expect(refreshResponse.data.data.tokens).toHaveProperty('accessToken');
      expect(refreshResponse.data.data.tokens).toHaveProperty('refreshToken');

      const newToken = refreshResponse.data.data.tokens.accessToken;

      // Verify new token works
      const profileResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: `Bearer ${newToken}` }
      );

      TestAssertions.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.data.data.id).toBe(user.id);
    });
  });

  describe('Logout Flow', () => {
    it('should logout user and invalidate token', async () => {
      const { user: _user, token } = await integrationTestUtils.userManager.createUser();

      // Verify token works before logout
      const profileResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: `Bearer ${token}` }
      );

      TestAssertions.assertSuccessResponse(profileResponse, 200);

      // Logout user
      const logoutResponse = await integrationTestUtils.httpClient.post(
        '/api/v1/auth/logout',
        {},
        { Authorization: `Bearer ${token}` }
      );

      TestAssertions.assertSuccessResponse(logoutResponse, 200);

      // Verify token is invalidated after logout
      const invalidProfileResponse = await integrationTestUtils.httpClient.get(
        '/api/v1/users/profile',
        { Authorization: `Bearer ${token}` }
      );

      TestAssertions.assertErrorResponse(invalidProfileResponse, 401, 'INVALID_TOKEN');
    });
  });
});