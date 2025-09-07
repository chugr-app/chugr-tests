// Integration test to check all services health
describe('Services Health Integration Test', () => {
  describe('All Services Health Check', () => {
    it('should respond to API Gateway health check', async () => {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect((data as any).data).toHaveProperty('status');
    });

    it('should respond to User Service health check', async () => {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should respond to Matching Service health check', async () => {
      const response = await fetch('http://localhost:3002/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should respond to Chat Service health check', async () => {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should respond to Event Service health check', async () => {
      const response = await fetch('http://localhost:3004/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should respond to Notification Service health check', async () => {
      const response = await fetch('http://localhost:3005/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should respond to ML Service health check', async () => {
      const response = await fetch('http://localhost:8001/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('service', 'ML Service');
      expect(data).toHaveProperty('status', 'healthy');
    });
  });

  describe('API Gateway Endpoints', () => {
    it('should respond to API info endpoint', async () => {
      const response = await fetch('http://localhost:3000/api/v1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect((data as any).data).toHaveProperty('message');
    });

    it('should handle 404 for non-existent endpoints', async () => {
      const response = await fetch('http://localhost:3000/api/v1/non-existent');
      
      expect(response.status).toBe(404);
    });
  });
});
