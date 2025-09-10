// Integration test configuration
export const integrationConfig = {
  // Test environment settings
  environment: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error', // Reduce log noise during tests
  },

  // Service URLs for integration tests
  services: {
    apiGateway: 'http://localhost:3000',
    userService: 'http://localhost:3001',
    matchingService: 'http://localhost:3002',
    chatService: 'http://localhost:3003',
    eventService: 'http://localhost:3004',
    notificationService: 'http://localhost:3005',
    mlService: 'http://localhost:8001',
  },

  // Database configurations (using existing backend services)
  databases: {
    postgres: {
      host: 'localhost',
      port: 5432,
      database: 'chugr',
      username: 'chugr_user',
      password: 'chugr_password',
      url: 'postgresql://chugr_user:chugr_password@localhost:5432/chugr',
    },
    redis: {
      host: 'localhost',
      port: 6379,
      url: 'redis://localhost:6379',
    },
    clickhouse: {
      host: 'localhost',
      port: 8123,
      database: 'chugr',
      username: 'default',
      password: '',
      url: 'http://localhost:8123',
    },
    minio: {
      endpoint: 'localhost',
      port: 9000,
      accessKey: 'chugr_access_key',
      secretKey: 'chugr_secret_key',
      useSSL: false,
    },
  },

  // Test timeouts
  timeouts: {
    serviceStartup: 60000, // 1 minute
    testExecution: 30000,  // 30 seconds
    databaseOperation: 10000, // 10 seconds
    httpRequest: 5000,     // 5 seconds
  },

  // Test data settings
  testData: {
    cleanupAfterEach: true,
    useFixtures: true,
    generateRandomData: true,
  },

  // Docker settings
  docker: {
    composeFile: 'docker-compose.integration.yml',
    networkName: 'chugr-test-network',
    waitForServices: true,
  },

  // JWT settings for tests
  jwt: {
    secret: 'test-jwt-secret-key',
    expiresIn: '1h',
    testUserId: 'test-user-id',
    testUserEmail: 'test@example.com',
  },

  // Test user credentials
  testUsers: {
    validUser: {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      birthDate: '1999-01-01',
      gender: 'FEMALE',
      location: 'New York, NY',
    },
    adminUser: {
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      birthDate: '1994-01-01',
      gender: 'MALE',
      role: 'admin',
      location: 'Los Angeles, CA',
    },
    secondUser: {
      email: 'test2@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User2',
      gender: 'MALE',
      birthDate: '1996-01-01',
      location: 'Chicago, IL',
    },
  },

  // API endpoints for testing
  endpoints: {
    auth: {
      register: '/api/v1/auth/register',
      login: '/api/v1/auth/login',
      refresh: '/api/v1/auth/refresh',
      logout: '/api/v1/auth/logout',
      profile: '/api/v1/auth/profile',
    },
    users: {
      profile: '/api/v1/users/profile',
      update: '/api/v1/users/profile',
      delete: '/api/v1/users/profile',
      search: '/api/v1/users/search',
    },
    matching: {
      swipe: '/api/v1/matching/swipe',
      matches: '/api/v1/matching/matches',
      recommendations: '/api/v1/matching/recommendations',
    },
    chat: {
      conversations: '/api/v1/chat/conversations',
      messages: '/api/v1/chat/messages',
      send: '/api/v1/chat/messages',
    },
    events: {
      create: '/api/v1/events',
      list: '/api/v1/events',
      join: '/api/v1/events/:id/join',
      leave: '/api/v1/events/:id/leave',
    },
    notifications: {
      list: '/api/v1/notifications',
      markRead: '/api/v1/notifications/:id/read',
      markAllRead: '/api/v1/notifications/read-all',
    },
    health: '/health',
  },

  // Expected response codes
  statusCodes: {
    success: 200,
    created: 201,
    noContent: 204,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    unprocessableEntity: 422,
    internalServerError: 500,
    serviceUnavailable: 503,
  },

  // Test retry settings
  retry: {
    maxAttempts: 3,
    delay: 1000, // 1 second
    backoff: 2, // Exponential backoff multiplier
  },

  // Performance thresholds
  performance: {
    maxResponseTime: 5000, // 5 seconds
    maxDatabaseQueryTime: 1000, // 1 second
    maxMemoryUsage: 512 * 1024 * 1024, // 512 MB
  },

  // Cleanup settings
  cleanup: {
    removeTestData: true,
    resetDatabases: true,
    clearCaches: true,
    removeFiles: true,
  },
};

// Helper function to get service URL
export function getServiceUrl(serviceName: keyof typeof integrationConfig.services): string {
  return integrationConfig.services[serviceName];
}

// Helper function to get database URL
export function getDatabaseUrl(databaseName: keyof typeof integrationConfig.databases): string {
  const db = integrationConfig.databases[databaseName] as any;
  return db.url || `${db.host}:${db.port}`;
}

// Helper function to get endpoint URL
export function getEndpointUrl(category: keyof typeof integrationConfig.endpoints, endpoint: string): string {
  const baseUrl = integrationConfig.services.apiGateway;
  const categoryEndpoints = integrationConfig.endpoints[category];
  
  if (typeof categoryEndpoints === 'object' && (categoryEndpoints as any)[endpoint]) {
    return `${baseUrl}${(categoryEndpoints as any)[endpoint]}`;
  }
  
  throw new Error(`Endpoint ${endpoint} not found in category ${category}`);
}

// Helper function to create test headers
export function createTestHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'chugr-integration-tests/1.0.0',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Helper function to generate test data
export function generateTestData<T>(baseData: T, overrides: Partial<T> = {}): T {
  return {
    ...baseData,
    ...overrides,
  };
}

// Helper function to wait for service
export function waitForService(serviceName: string, timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkService = async () => {
      try {
        const response = await fetch(`${integrationConfig.services.apiGateway}/health`);
        if (response.ok) {
          resolve();
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Service ${serviceName} not ready within ${timeout}ms`));
        return;
      }
      
      setTimeout(checkService, 1000);
    };
    
    checkService();
  });
}
