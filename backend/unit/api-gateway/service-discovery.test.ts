// Unit tests for Service Discovery
import { mockServiceDiscovery } from '../../../shared/helpers/mocks';

// Mock the service discovery module
jest.mock('../../../../backend/api-gateway/src/services/serviceDiscovery', () => ({
  serviceDiscovery: mockServiceDiscovery,
}));

describe('Service Discovery Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getServiceUrl', () => {
    it('should return service URL for registered service', () => {
      const serviceName = 'user-service';
      const expectedUrl = 'http://localhost:3001';

      const url = mockServiceDiscovery.getServiceUrl(serviceName);

      expect(url).toBe(expectedUrl);
      expect(mockServiceDiscovery.getServiceUrl).toHaveBeenCalledWith(serviceName);
    });

    it('should return null for unregistered service', () => {
      mockServiceDiscovery.getServiceUrl.mockReturnValueOnce(null);
      
      const serviceName = 'unknown-service';
      const url = mockServiceDiscovery.getServiceUrl(serviceName);

      expect(url).toBeNull();
      expect(mockServiceDiscovery.getServiceUrl).toHaveBeenCalledWith(serviceName);
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status for registered service', () => {
      const serviceName = 'user-service';
      const expectedStatus = {
        name: 'user-service',
        url: 'http://localhost:3001',
        status: 'healthy',
        lastCheck: expect.any(String),
        responseTime: 45,
        errorCount: 0,
        circuitBreakerOpen: false,
      };

      const status = mockServiceDiscovery.getServiceStatus(serviceName);

      expect(status).toEqual(expectedStatus);
      expect(mockServiceDiscovery.getServiceStatus).toHaveBeenCalledWith(serviceName);
    });

    it('should return null for unregistered service', () => {
      mockServiceDiscovery.getServiceStatus.mockReturnValueOnce(null);
      
      const serviceName = 'unknown-service';
      const status = mockServiceDiscovery.getServiceStatus(serviceName);

      expect(status).toBeNull();
      expect(mockServiceDiscovery.getServiceStatus).toHaveBeenCalledWith(serviceName);
    });
  });

  describe('getAllServiceStatuses', () => {
    it('should return all service statuses', () => {
      const expectedStatuses = [
        {
          name: 'user-service',
          url: 'http://localhost:3001',
          status: 'healthy',
          lastCheck: expect.any(String),
          responseTime: 45,
          errorCount: 0,
          circuitBreakerOpen: false,
        },
        {
          name: 'matching-service',
          url: 'http://localhost:3002',
          status: 'healthy',
          lastCheck: expect.any(String),
          responseTime: 32,
          errorCount: 0,
          circuitBreakerOpen: false,
        },
      ];

      const statuses = mockServiceDiscovery.getAllServiceStatuses();

      expect(statuses).toEqual(expectedStatuses);
      expect(mockServiceDiscovery.getAllServiceStatuses).toHaveBeenCalled();
    });

    it('should return empty array when no services are registered', () => {
      mockServiceDiscovery.getAllServiceStatuses.mockReturnValueOnce([]);
      
      const statuses = mockServiceDiscovery.getAllServiceStatuses();

      expect(statuses).toEqual([]);
      expect(mockServiceDiscovery.getAllServiceStatuses).toHaveBeenCalled();
    });
  });

  describe('registerService', () => {
    it('should register a new service', () => {
      const serviceConfig = {
        name: 'new-service',
        url: 'http://localhost:3007',
        healthCheckPath: '/health',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 30000,
        retryableStatusCodes: [500, 502, 503, 504],
      };

      mockServiceDiscovery.registerService(serviceConfig);

      expect(mockServiceDiscovery.registerService).toHaveBeenCalledWith(serviceConfig);
    });
  });

  describe('unregisterService', () => {
    it('should unregister a service', () => {
      const serviceName = 'user-service';

      mockServiceDiscovery.unregisterService(serviceName);

      expect(mockServiceDiscovery.unregisterService).toHaveBeenCalledWith(serviceName);
    });
  });

  describe('startHealthChecks', () => {
    it('should start health checks for all services', () => {
      mockServiceDiscovery.startHealthChecks();

      expect(mockServiceDiscovery.startHealthChecks).toHaveBeenCalled();
    });
  });

  describe('stopHealthChecks', () => {
    it('should stop health checks for all services', () => {
      mockServiceDiscovery.stopHealthChecks();

      expect(mockServiceDiscovery.stopHealthChecks).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker functionality', () => {
    it('should handle circuit breaker open state', () => {
      const serviceName = 'user-service';
      const circuitOpenStatus = {
        name: 'user-service',
        url: 'http://localhost:3001',
        status: 'circuit-open',
        lastCheck: new Date().toISOString(),
        responseTime: 0,
        errorCount: 10,
        circuitBreakerOpen: true,
        circuitBreakerOpenedAt: new Date().toISOString(),
      };

      mockServiceDiscovery.getServiceStatus.mockReturnValueOnce(circuitOpenStatus);

      const status = mockServiceDiscovery.getServiceStatus(serviceName);

      expect(status).toEqual(circuitOpenStatus);
      expect(status.circuitBreakerOpen).toBe(true);
      expect(status.circuitBreakerOpenedAt).toBeDefined();
    });

    it('should handle circuit breaker half-open state', () => {
      const serviceName = 'user-service';
      const halfOpenStatus = {
        name: 'user-service',
        url: 'http://localhost:3001',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 45,
        errorCount: 0,
        circuitBreakerOpen: false,
        circuitBreakerOpenedAt: null,
      };

      mockServiceDiscovery.getServiceStatus.mockReturnValueOnce(halfOpenStatus);

      const status = mockServiceDiscovery.getServiceStatus(serviceName);

      expect(status).toEqual(halfOpenStatus);
      expect(status.circuitBreakerOpen).toBe(false);
      expect(status.circuitBreakerOpenedAt).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle service discovery errors gracefully', () => {
      const serviceName = 'error-service';
      const error = new Error('Service discovery error');

      mockServiceDiscovery.getServiceUrl.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => {
        mockServiceDiscovery.getServiceUrl(serviceName);
      }).toThrow('Service discovery error');
    });
  });
});
