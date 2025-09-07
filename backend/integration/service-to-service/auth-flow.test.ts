import request from 'supertest';
import { testConfig } from '@config/test.config';
import { testUsers, userFixtures } from '@fixtures/users';

describe('Authentication Flow Integration', () => {
  const apiGatewayUrl = testConfig.services.apiGateway;
  let authToken: string;
  let userId: string;

  describe('User Registration and Login Flow', () => {
    it('should complete full registration and login flow', async () => {
      // Step 1: Register a new user
      const registrationData = userFixtures.generateRegistrationData();
      
      const registerResponse = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            email: registrationData.email,
            username: registrationData.username,
            firstName: registrationData.firstName,
            lastName: registrationData.lastName,
            age: registrationData.age,
            isVerified: false,
          },
          token: expect.any(String),
        },
      });

      userId = registerResponse.body.data.user.id;
      authToken = registerResponse.body.data.token;

      // Verify token is valid
      expect(authToken).toBeValidJWT();

      // Step 2: Login with the same credentials
      const loginResponse = await request(apiGatewayUrl)
        .post('/api/v1/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password,
        })
        .expect(200);

      expect(loginResponse.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: userId,
            email: registrationData.email,
            username: registrationData.username,
          },
          token: expect.any(String),
        },
      });

      // Verify new token is also valid
      expect(loginResponse.body.data.token).toBeValidJWT();
    });

    it('should handle invalid login credentials', async () => {
      const loginData = userFixtures.generateLoginData();

      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: expect.any(String),
        },
      });
    });

    it('should handle duplicate email registration', async () => {
      const registrationData = userFixtures.generateRegistrationData();

      // First registration should succeed
      await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Second registration with same email should fail
      const duplicateResponse = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(409);

      expect(duplicateResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: expect.any(String),
        },
      });
    });
  });

  describe('Protected Route Access', () => {
    beforeEach(async () => {
      // Setup authenticated user for protected route tests
      const registrationData = userFixtures.generateRegistrationData();
      
      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    it('should allow access to protected routes with valid token', async () => {
      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: userId,
            email: expect.any(String),
            username: expect.any(String),
          },
        },
      });
    });

    it('should deny access to protected routes without token', async () => {
      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.any(String),
        },
      });
    });

    it('should deny access to protected routes with invalid token', async () => {
      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: expect.any(String),
        },
      });
    });

    it('should deny access to protected routes with expired token', async () => {
      // Generate an expired token (this would require mocking JWT or using a test token)
      const expiredToken = global.testUtils.generateTestToken({ 
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: expect.any(String),
        },
      });
    });
  });

  describe('Token Refresh Flow', () => {
    beforeEach(async () => {
      const registrationData = userFixtures.generateRegistrationData();
      
      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      authToken = response.body.data.token;
    });

    it('should refresh token successfully', async () => {
      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
        },
      });

      expect(response.body.data.token).toBeValidJWT();
      expect(response.body.data.token).not.toBe(authToken);
    });

    it('should handle refresh with invalid token', async () => {
      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: expect.any(String),
        },
      });
    });
  });
});
