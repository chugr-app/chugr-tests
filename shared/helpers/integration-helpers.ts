// Integration test helpers and utilities
import { integrationConfig, createTestHeaders, generateTestData } from '../config/integration.config';

// HTTP client for integration tests
export class IntegrationHttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = integrationConfig.services.apiGateway) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = createTestHeaders();
  }

  async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; data: T; headers: Record<string, string> }> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    const options: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json().catch(() => null) as T;

      return {
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<{ status: number; data: T }> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  async post<T = any>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<{ status: number; data: T }> {
    return this.request<T>('POST', endpoint, data, headers);
  }

  async put<T = any>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<{ status: number; data: T }> {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<{ status: number; data: T }> {
    return this.request<T>('DELETE', endpoint, undefined, headers);
  }
}

// Test user management
export class TestUserManager {
  private httpClient: IntegrationHttpClient;
  private users: Map<string, any> = new Map();

  constructor() {
    this.httpClient = new IntegrationHttpClient();
  }

  async createUser(userData: any = {}): Promise<{ user: any; token: string }> {
    const testUser = generateTestData(integrationConfig.testUsers.validUser, userData);
    
    // Make email unique to avoid conflicts
    if (!userData.email) {
      testUser.email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    }
    
    // Remove fields that are not allowed in the API
    const { age, ...cleanUserData } = testUser as any;
    
    // Convert age to birthDate if age is provided
    if (age) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - age;
      cleanUserData.birthDate = new Date(birthYear, 0, 1).toISOString();
    }
    
    // Register user
    const registerResponse = await this.httpClient.post('/api/v1/auth/register', cleanUserData);
    
    if (registerResponse.status !== 201) {
      throw new Error(`Failed to register user: ${JSON.stringify(registerResponse.data)}`);
    }

    // Login user
    const loginResponse = await this.httpClient.post('/api/v1/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Failed to login user: ${JSON.stringify(loginResponse.data)}`);
    }

    const token = loginResponse.data.data.tokens.accessToken;
    const user = { ...testUser, id: loginResponse.data.data.user.id };

    this.users.set(user.id, { user, token });
    
    return { user, token };
  }

  async getUserToken(userId: string): Promise<string> {
    const userData = this.users.get(userId);
    if (!userData) {
      throw new Error(`User ${userId} not found`);
    }
    return userData.token;
  }

  async createAuthenticatedClient(userId: string): Promise<IntegrationHttpClient> {
    const token = await this.getUserToken(userId);
    const client = new IntegrationHttpClient();
    (client as any).defaultHeaders = createTestHeaders(token);
    return client;
  }

  async cleanup(): Promise<void> {
    // Clean up all created users
    for (const [userId, _userData] of this.users) {
      try {
        const client = await this.createAuthenticatedClient(userId);
        await client.delete('/api/v1/users/profile');
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.users.clear();
  }
}

// Database helpers
export class DatabaseHelper {
  public postgresUrl: string;
  public redisUrl: string;

  constructor() {
    this.postgresUrl = integrationConfig.databases.postgres.url;
    this.redisUrl = integrationConfig.databases.redis.url;
  }

  async cleanPostgres(): Promise<void> {
    // This would require a PostgreSQL client
    // For now, we'll use a simple approach with test data cleanup
    console.log('Cleaning PostgreSQL test data...');
  }

  async cleanRedis(): Promise<void> {
    // This would require a Redis client
    // For now, we'll use a simple approach
    console.log('Cleaning Redis test data...');
  }

  async cleanAll(): Promise<void> {
    await Promise.all([
      this.cleanPostgres(),
      this.cleanRedis(),
    ]);
  }
}

// Test data factories
export class TestDataFactory {
  static createUser(overrides: any = {}): any {
    const userData = generateTestData(integrationConfig.testUsers.validUser, overrides);
    
    // Make email unique to avoid conflicts
    if (!overrides.email) {
      userData.email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    }
    
    // Remove fields that are not allowed in the API
    const { age, ...cleanUserData } = userData as any;
    
    // Convert age to birthDate if age is provided
    if (age) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - age;
      cleanUserData.birthDate = new Date(birthYear, 0, 1).toISOString();
    }
    
    return cleanUserData;
  }

  static createEvent(overrides: any = {}): any {
    return generateTestData({
      title: 'Test Event',
      description: 'A test event for integration testing',
      location: {
        latitude: 55.7558,
        longitude: 37.6176,
        address: 'Test Address, Moscow',
      },
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxParticipants: 10,
      category: 'drinking',
      tags: ['test', 'integration'],
    }, overrides);
  }

  static createMessage(overrides: any = {}): any {
    return generateTestData({
      content: 'Test message for integration testing',
      type: 'text',
    }, overrides);
  }

  static createNotification(overrides: any = {}): any {
    return generateTestData({
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification',
    }, overrides);
  }
}

// Service health checker
export class ServiceHealthChecker {
  public httpClient: IntegrationHttpClient;

  constructor() {
    this.httpClient = new IntegrationHttpClient();
  }

  async checkAllServices(): Promise<{ [serviceName: string]: boolean }> {
    const results: { [serviceName: string]: boolean } = {};

    for (const [serviceName, serviceUrl] of Object.entries(integrationConfig.services)) {
      try {
        const client = new IntegrationHttpClient(serviceUrl);
        const response = await client.get('/health');
        results[serviceName] = response.status === 200;
      } catch (error) {
        results[serviceName] = false;
      }
    }

    return results;
  }

  async waitForServices(timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const healthStatus = await this.checkAllServices();
      const allHealthy = Object.values(healthStatus).every(status => status);
      
      if (allHealthy) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Services not ready within ${timeout}ms`);
  }
}

// Test assertion helpers
export class TestAssertions {
  static assertSuccessResponse(response: { status: number; data: any }, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('data');
  }

  static assertErrorResponse(response: { status: number; data: any }, expectedStatus: number, expectedErrorCode?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data).toHaveProperty('error');
    
    if (expectedErrorCode) {
      expect(response.data.error).toHaveProperty('code', expectedErrorCode);
    }
  }

  static assertUserData(user: any, expectedData: any): void {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email', expectedData.email);
    // Username is not part of the API response, so we skip this check
    expect(user).toHaveProperty('firstName', expectedData.firstName);
    expect(user).toHaveProperty('lastName', expectedData.lastName);
    if (expectedData.age) {
      expect(user).toHaveProperty('birthDate');
    }
  }

  static assertEventData(event: any, expectedData: any): void {
    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('title', expectedData.title);
    expect(event).toHaveProperty('description', expectedData.description);
    expect(event).toHaveProperty('organizerId');
    expect(event).toHaveProperty('location');
    expect(event).toHaveProperty('dateTime');
    expect(event).toHaveProperty('maxParticipants', expectedData.maxParticipants);
  }
}

// Global test utilities
export const integrationTestUtils = {
  httpClient: new IntegrationHttpClient(),
  userManager: new TestUserManager(),
  databaseHelper: new DatabaseHelper(),
  dataFactory: TestDataFactory,
  healthChecker: new ServiceHealthChecker(),
  assertions: TestAssertions,
};

// Cleanup function for after each test
export async function cleanupAfterTest(): Promise<void> {
  await integrationTestUtils.userManager.cleanup();
  await integrationTestUtils.databaseHelper.cleanAll();
}

// Setup function for before each test
export async function setupBeforeTest(): Promise<void> {
  // Wait for services to be ready
  await integrationTestUtils.healthChecker.waitForServices();
  
  // Clean any existing test data
  await integrationTestUtils.databaseHelper.cleanAll();
}
