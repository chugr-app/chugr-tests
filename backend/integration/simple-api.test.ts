// Very simple integration test
import { integrationTestUtils } from '../../shared/helpers/integration-helpers';

describe('Simple API Integration Test', () => {
  describe('API Gateway Health Check', () => {
    it('should respond to health check', async () => {
      const response = await integrationTestUtils.httpClient.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });

    it('should respond to API info endpoint', async () => {
      const response = await integrationTestUtils.httpClient.get('/api/v1');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });
  });
});
