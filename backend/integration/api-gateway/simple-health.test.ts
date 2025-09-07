// Simple integration test for API Gateway health check
import { integrationTestUtils, setupBeforeTest, cleanupAfterTest } from '../../../shared/helpers/integration-helpers';

describe('API Gateway Simple Health Check', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  describe('Health Endpoint', () => {
    it('should respond to health check', async () => {
      const response = await integrationTestUtils.httpClient.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('status');
    });

    it('should respond to API info endpoint', async () => {
      const response = await integrationTestUtils.httpClient.get('/api/v1');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('message');
    });
  });
});
