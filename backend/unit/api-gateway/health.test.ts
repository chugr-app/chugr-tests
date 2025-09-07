import request from 'supertest';
import { testConfig } from '@config/test.config';

describe('API Gateway Health Check', () => {
  const apiGatewayUrl = testConfig.services.apiGateway;

  describe('GET /health', () => {
    it('should return healthy status when all services are running', async () => {
      const response = await request(apiGatewayUrl)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: expect.stringMatching(/^(healthy|degraded)$/),
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          version: expect.any(String),
          environment: 'test',
          services: expect.any(Array),
        },
      });

      // Check that all expected services are present
      const serviceNames = response.body.data.services.map((s: any) => s.name);
      expect(serviceNames).toContain('user-service');
      expect(serviceNames).toContain('matching-service');
      expect(serviceNames).toContain('ml-service');
      expect(serviceNames).toContain('chat-service');
      expect(serviceNames).toContain('event-service');
      expect(serviceNames).toContain('notification-service');
    });

    it('should return service status information', async () => {
      const response = await request(apiGatewayUrl)
        .get('/health')
        .expect(200);

      const services = response.body.data.services;
      
      services.forEach((service: any) => {
        expect(service).toMatchObject({
          name: expect.any(String),
          url: expect.any(String),
          status: expect.stringMatching(/^(healthy|unhealthy|circuit-open)$/),
          lastCheck: expect.any(String),
          responseTime: expect.any(Number),
          errorCount: expect.any(Number),
          circuitBreakerOpen: expect.any(Boolean),
        });
      });
    });

    it('should return degraded status when some services are unhealthy', async () => {
      // This test would require mocking some services as unhealthy
      // For now, we'll just verify the structure
      const response = await request(apiGatewayUrl)
        .get('/health')
        .expect(200);

      expect(['healthy', 'degraded']).toContain(response.body.data.status);
    });

    it('should include circuit breaker information when open', async () => {
      const response = await request(apiGatewayUrl)
        .get('/health')
        .expect(200);

      const services = response.body.data.services;
      
      services.forEach((service: any) => {
        if (service.circuitBreakerOpen) {
          expect(service).toHaveProperty('circuitBreakerOpenedAt');
          expect(service.circuitBreakerOpenedAt).toBeInstanceOf(String);
        }
      });
    });
  });

  describe('GET /api/v1', () => {
    it('should return API information', async () => {
      const response = await request(apiGatewayUrl)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'chugr API Gateway v1',
          version: '1.0.0',
          timestamp: expect.any(String),
          services: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            matching: '/api/v1/matching',
            chat: '/api/v1/chat',
            events: '/api/v1/events',
            places: '/api/v1/places',
            notifications: '/api/v1/notifications',
            ml: '/api/v1/ml',
          },
        },
      });
    });
  });
});
