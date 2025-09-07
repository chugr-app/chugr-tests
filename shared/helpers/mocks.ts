// Mock implementations for unit tests
export const mockServiceDiscovery = {
  getServiceUrl: jest.fn().mockReturnValue('http://localhost:3001'),
  getServiceStatus: jest.fn().mockReturnValue({
    name: 'user-service',
    url: 'http://localhost:3001',
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    responseTime: 45,
    errorCount: 0,
    circuitBreakerOpen: false,
  }),
  getAllServiceStatuses: jest.fn().mockReturnValue([
    {
      name: 'user-service',
      url: 'http://localhost:3001',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: 45,
      errorCount: 0,
      circuitBreakerOpen: false,
    },
    {
      name: 'matching-service',
      url: 'http://localhost:3002',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: 32,
      errorCount: 0,
      circuitBreakerOpen: false,
    },
  ]),
  registerService: jest.fn(),
  unregisterService: jest.fn(),
  startHealthChecks: jest.fn(),
  stopHealthChecks: jest.fn(),
};

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

export const mockRequest = {
  headers: {
    'x-request-id': 'test-request-id',
    'x-user-id': 'test-user-id',
    'authorization': 'Bearer test-token',
  },
  method: 'GET',
  url: '/api/v1/test',
  ip: '127.0.0.1',
  get: jest.fn().mockImplementation((header: string) => {
    const headers: { [key: string]: string } = {
      'user-agent': 'test-user-agent',
      'content-type': 'application/json',
    };
    return headers[header.toLowerCase()];
  }),
};

export const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnValue('test-response-id'),
  headersSent: false,
};

export const mockNext = jest.fn();

// Mock JWT functions
export const mockJwt = {
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
};

// Mock database functions
export const mockDatabase = {
  query: jest.fn().mockResolvedValue({
    rows: [],
    rowCount: 0,
  }),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

// Mock Redis functions
export const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

// Mock external API calls
export const mockAxios = {
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
  put: jest.fn().mockResolvedValue({
    data: { success: true },
    status: 200,
    statusText: 'OK',
  }),
  delete: jest.fn().mockResolvedValue({
    data: { success: true },
    status: 200,
    statusText: 'OK',
  }),
};

// Mock file system operations
export const mockFs = {
  readFile: jest.fn().mockResolvedValue('mock file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn().mockReturnValue(undefined),
  unlinkSync: jest.fn().mockReturnValue(undefined),
};

// Mock environment variables
export const mockEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  JWT_SECRET: 'test-jwt-secret',
  POSTGRES_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'error',
};

// Setup function to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset service discovery mock
  mockServiceDiscovery.getServiceUrl.mockReturnValue('http://localhost:3001');
  mockServiceDiscovery.getServiceStatus.mockReturnValue({
    name: 'user-service',
    url: 'http://localhost:3001',
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    responseTime: 45,
    errorCount: 0,
    circuitBreakerOpen: false,
  });
  
  // Reset logger mock
  Object.values(mockLogger).forEach(mock => mock.mockClear());
  
  // Reset JWT mock
  Object.values(mockJwt).forEach(mock => mock.mockClear());
  
  // Reset database mock
  Object.values(mockDatabase).forEach(mock => mock.mockClear());
  
  // Reset Redis mock
  Object.values(mockRedis).forEach(mock => mock.mockClear());
  
  // Reset axios mock
  Object.values(mockAxios).forEach(mock => mock.mockClear());
  
  // Reset fs mock
  Object.values(mockFs).forEach(mock => mock.mockClear());
};

// Mock modules
export const mockModules = {
  'jsonwebtoken': mockJwt,
  'axios': mockAxios,
  'fs': mockFs,
  'path': {
    join: jest.fn().mockImplementation((...args) => args.join('/')),
    resolve: jest.fn().mockImplementation((...args) => args.join('/')),
    dirname: jest.fn().mockReturnValue('/mock/dir'),
    basename: jest.fn().mockReturnValue('mock-file.js'),
  },
  'crypto': {
    randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-hash'),
    }),
  },
  'uuid': {
    v4: jest.fn().mockReturnValue('mock-uuid-v4'),
    v1: jest.fn().mockReturnValue('mock-uuid-v1'),
  },
};
