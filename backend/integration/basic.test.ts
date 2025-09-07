// Basic integration test without complex helpers
describe('Basic Integration Test', () => {
  describe('API Gateway Health Check', () => {
    it('should respond to health check', async () => {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should respond to API info endpoint', async () => {
      const response = await fetch('http://localhost:3000/api/v1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });
  });
});
