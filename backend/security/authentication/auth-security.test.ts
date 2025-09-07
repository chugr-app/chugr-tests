import request from 'supertest';
import { testConfig } from '@config/test.config';
import { userFixtures } from '@fixtures/users';

describe('Authentication Security Tests', () => {
  const apiGatewayUrl = testConfig.services.apiGateway;

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        'password123',
        'admin',
        'test',
        '123456789',
        'password1',
        'qwerty123',
      ];

      for (const weakPassword of weakPasswords) {
        const registrationData = userFixtures.generateRegistrationData({
          password: weakPassword,
        });

        const response = await request(apiGatewayUrl)
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('password'),
          },
        });
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password1',
        'Complex#Pass2023',
        'Test123$Password',
        'Secure!Pass456',
      ];

      for (const strongPassword of strongPasswords) {
        const registrationData = userFixtures.generateRegistrationData({
          password: strongPassword,
        });

        const response = await request(apiGatewayUrl)
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
      }
    });

    it('should hash passwords and not return them in responses', async () => {
      const registrationData = userFixtures.generateRegistrationData();

      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Password should not be in response
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      
      // User object should not contain password
      expect(JSON.stringify(response.body)).not.toContain(registrationData.password);
    });
  });

  describe('JWT Token Security', () => {
    let validToken: string;

    beforeEach(async () => {
      const registrationData = userFixtures.generateRegistrationData();
      
      const response = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      validToken = response.body.data.token;
    });

    it('should reject tokens with invalid signature', async () => {
      const invalidToken = validToken.slice(0, -10) + 'invalid123';

      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
        },
      });
    });

    it('should reject expired tokens', async () => {
      // Generate an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'test-user', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
        },
      });
    });

    it('should reject tokens without proper structure', async () => {
      const malformedTokens = [
        'not-a-jwt-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header only
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0', // Missing signature
        'invalid.header.payload.signature',
        '',
        'Bearer ',
      ];

      for (const token of malformedTokens) {
        const response = await request(apiGatewayUrl)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    it('should require Bearer prefix in Authorization header', async () => {
      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', validToken) // Missing 'Bearer ' prefix
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
        },
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting on login attempts', async () => {
      const loginData = userFixtures.generateLoginData();
      
      // Make multiple failed login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(apiGatewayUrl)
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Should eventually get rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement rate limiting on registration attempts', async () => {
      // Make multiple registration attempts
      const promises = Array.from({ length: 10 }, (_, index) =>
        request(apiGatewayUrl)
          .post('/api/v1/auth/register')
          .send(userFixtures.generateRegistrationData({
            email: `ratelimit${index}@example.com`,
          }))
      );

      const responses = await Promise.all(promises);
      
      // Should eventually get rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection in email field', async () => {
      const sqlInjectionEmails = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "admin'/*",
        "' UNION SELECT * FROM users --",
      ];

      for (const email of sqlInjectionEmails) {
        const registrationData = userFixtures.generateRegistrationData({
          email,
        });

        const response = await request(apiGatewayUrl)
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(400);

        expect(response.body.success).toBe(false);
        // Should not return database errors
        expect(response.body.error.message).not.toContain('SQL');
        expect(response.body.error.message).not.toContain('database');
      }
    });

    it('should prevent XSS in user input fields', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "'><script>alert('XSS')</script>",
      ];

      for (const payload of xssPayloads) {
        const registrationData = userFixtures.generateRegistrationData({
          firstName: payload,
          lastName: payload,
        });

        const response = await request(apiGatewayUrl)
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(400);

        expect(response.body.success).toBe(false);
        // Should sanitize or reject XSS payloads
        expect(response.body.error.message).not.toContain('<script>');
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user..double.dot@example.com',
        'user@.example.com',
        'user@example..com',
        'user@example.com.',
        'user name@example.com',
        'user@exam ple.com',
      ];

      for (const email of invalidEmails) {
        const registrationData = userFixtures.generateRegistrationData({
          email,
        });

        const response = await request(apiGatewayUrl)
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('email'),
          },
        });
      }
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      const registrationData = userFixtures.generateRegistrationData();
      
      const registerResponse = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      const token = registerResponse.body.data.token;

      // Logout
      await request(apiGatewayUrl)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should be invalidated
      const response = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
        },
      });
    });

    it('should handle concurrent sessions properly', async () => {
      const registrationData = userFixtures.generateRegistrationData();
      
      // Register user
      const registerResponse = await request(apiGatewayUrl)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      const token1 = registerResponse.body.data.token;

      // Login again (should create new token)
      const loginResponse = await request(apiGatewayUrl)
        .post('/api/v1/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password,
        })
        .expect(200);

      const token2 = loginResponse.body.data.token;

      // Both tokens should be valid
      expect(token1).not.toBe(token2);

      const response1 = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const response2 = await request(apiGatewayUrl)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
    });
  });
});
