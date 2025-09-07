export const testConfig = {
  // Test environment settings
  environment: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    PORT: 3000,
  },

  // Database configurations
  databases: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5433'),
      database: process.env.POSTGRES_DB || 'chugr_test',
      username: process.env.POSTGRES_USER || 'test_user',
      password: process.env.POSTGRES_PASSWORD || 'test_password',
      url: process.env.POSTGRES_URL || 'postgresql://test_user:test_password@localhost:5433/chugr_test',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380'),
      url: process.env.REDIS_URL || 'redis://localhost:6380',
    },
    clickhouse: {
      host: process.env.CLICKHOUSE_HOST || 'localhost',
      port: parseInt(process.env.CLICKHOUSE_PORT || '8124'),
      database: process.env.CLICKHOUSE_DB || 'chugr_test',
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8124',
    },
  },

  // MinIO configuration
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9001'),
    accessKey: process.env.MINIO_ACCESS_KEY || 'test_access_key',
    secretKey: process.env.MINIO_SECRET_KEY || 'test_secret_key',
    useSSL: false,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'test_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  // Service URLs
  services: {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    matchingService: process.env.MATCHING_SERVICE_URL || 'http://localhost:3002',
    mlService: process.env.ML_SERVICE_URL || 'http://localhost:3003',
    chatService: process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
    eventService: process.env.EVENT_SERVICE_URL || 'http://localhost:3005',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  },

  // Test timeouts
  timeouts: {
    unit: 5000,        // 5 seconds for unit tests
    integration: 15000, // 15 seconds for integration tests
    e2e: 30000,        // 30 seconds for e2e tests
    performance: 60000, // 60 seconds for performance tests
    security: 45000,   // 45 seconds for security tests
  },

  // Test data settings
  testData: {
    // Number of test users to create for load tests
    loadTestUsers: 100,
    // Number of test events to create for load tests
    loadTestEvents: 50,
    // Number of test messages to create for load tests
    loadTestMessages: 1000,
  },

  // Performance test settings
  performance: {
    // Artillery configuration
    artillery: {
      config: {
        target: 'http://localhost:3000',
        phases: [
          { duration: '2m', arrivalRate: 10 },
          { duration: '5m', arrivalRate: 20 },
          { duration: '2m', arrivalRate: 10 },
        ],
      },
    },
    // Load test thresholds
    thresholds: {
      responseTime: 1000,    // 1 second max response time
      errorRate: 0.01,       // 1% max error rate
      throughput: 100,       // 100 requests per second
    },
  },

  // Security test settings
  security: {
    // OWASP ZAP configuration
    zap: {
      host: 'localhost',
      port: 8080,
      apiKey: '',
      context: 'chugr-test-context',
    },
    // Security test thresholds
    thresholds: {
      highRisk: 0,      // No high-risk vulnerabilities allowed
      mediumRisk: 2,    // Max 2 medium-risk vulnerabilities
      lowRisk: 10,      // Max 10 low-risk vulnerabilities
    },
  },

  // Test coverage settings
  coverage: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    critical: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

export default testConfig;
