import { config } from 'dotenv';
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Load environment variables
config();

// Mock external modules for unit tests
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
  decode: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
  }),
}));

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: { success: true },
    status: 200,
    statusText: 'OK',
  }),
  post: jest.fn().mockResolvedValue({
    data: { success: true },
    status: 201,
    statusText: 'Created',
  }),
}));

jest.mock('fs', () => ({
  readFile: jest.fn().mockResolvedValue('mock file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  existsSync: jest.fn().mockReturnValue(true),
}));

// Global test setup
beforeAll(async () => {
  // Setup global test environment
  console.log('🚀 Setting up test environment...');
  
  // Set test environment variables
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'error'; // Reduce log noise during tests
  
  // Initialize test database connections if needed
  // await setupTestDatabases();
});

afterAll(async () => {
  // Cleanup global test environment
  console.log('🧹 Cleaning up test environment...');
  
  // Close database connections
  // await closeTestDatabases();
});

beforeEach(() => {
  // Setup before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Generate test JWT token
  generateTestToken: (payload: any = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        userId: 'test-user-id',
        email: 'test@example.com',
        ...payload 
      },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  // Generate test user data
  generateTestUser: (overrides: any = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    age: 25,
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      city: 'Moscow',
      country: 'Russia'
    },
    preferences: {
      ageRange: { min: 21, max: 35 },
      maxDistance: 10,
      interests: ['drinking', 'socializing']
    },
    ...overrides
  }),

  // Generate test event data
  generateTestEvent: (overrides: any = {}) => ({
    id: 'test-event-id',
    title: 'Test Event',
    description: 'Test event description',
    location: {
      latitude: 55.7558,
      longitude: 37.6176,
      address: 'Test Address, Moscow'
    },
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    maxParticipants: 10,
    currentParticipants: 1,
    organizerId: 'test-user-id',
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock external API responses
  mockApiResponse: (data: any, status: number = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  })
};

// Extend Jest matchers
expect.extend({
  toBeValidJWT(received: string) {
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(received, process.env['JWT_SECRET'] || 'test-secret');
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `expected ${received} to be a valid JWT, but got error: ${error instanceof Error ? error.message : String(error)}`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  }
});

// Type declarations for global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
      toBeValidUUID(): R;
    }
  }

  var testUtils: {
    generateTestToken: (payload?: any) => string;
    generateTestUser: (overrides?: any) => any;
    generateTestEvent: (overrides?: any) => any;
    waitFor: (ms: number) => Promise<void>;
    mockApiResponse: (data: any, status?: number) => any;
  };
}
