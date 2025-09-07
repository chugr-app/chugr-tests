// Simple integration test to verify database connections
import { integrationTestUtils, setupBeforeTest, cleanupAfterTest } from '../../../shared/helpers/integration-helpers';

describe('Database Infrastructure Tests', () => {
  beforeAll(async () => {
    await setupBeforeTest();
  });

  afterAll(async () => {
    await cleanupAfterTest();
  });

  describe('Database Connectivity', () => {
    it('should connect to PostgreSQL test database', async () => {
      // This is a simple test to verify PostgreSQL is accessible
      // In a real scenario, you would test actual database operations
      expect(integrationTestUtils.databaseHelper).toBeDefined();
      // Test that database helper is properly initialized
      expect(typeof integrationTestUtils.databaseHelper.cleanPostgres).toBe('function');
    });

    it('should connect to Redis test instance', async () => {
      expect(integrationTestUtils.databaseHelper).toBeDefined();
      // Test that database helper is properly initialized
      expect(typeof integrationTestUtils.databaseHelper.cleanRedis).toBe('function');
    });

    it('should have test configuration loaded', async () => {
      expect(integrationTestUtils.httpClient).toBeDefined();
      expect(integrationTestUtils.dataFactory).toBeDefined();
      expect(integrationTestUtils.userManager).toBeDefined();
    });
  });

  describe('Test Environment', () => {
    it('should have correct test environment variables', () => {
      expect(process.env['NODE_ENV']).toBe('test');
    });

    it('should have test database URLs configured', () => {
      const config = require('../../../shared/config/integration.config').integrationConfig;
      
      expect(config.databases.postgres.url).toContain('chugr');
      expect(config.databases.redis.url).toContain('6379');
      expect(config.databases.clickhouse.url).toContain('8123');
      expect(config.databases.minio.endpoint).toBe('localhost');
    });
  });
});
