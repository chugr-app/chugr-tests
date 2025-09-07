# Integration Tests

Integration tests verify the interaction between different services and components of the chugr application.

## Overview

Integration tests use a hybrid approach:
- **Test services** run in Docker containers
- **Real databases** (PostgreSQL, Redis, MinIO, ClickHouse)
- **Mocked external APIs** (payments, SMS, email)
- **Isolated test environment** for each test run

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  User Service   │────│   PostgreSQL    │
│   (Test)        │    │   (Test)        │    │   (Test)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│ Matching Service│──────────────┘
                        │   (Test)        │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │     Redis       │
                        │    (Test)       │
                        └─────────────────┘
```

## Test Structure

### API Gateway Tests
- **Location**: `api-gateway/`
- **Purpose**: Test API Gateway routing, authentication, and service discovery
- **Files**:
  - `routing.test.ts` - Request routing and service discovery
  - `authentication.test.ts` - JWT authentication middleware
  - `circuit-breakers.test.ts` - Circuit breaker functionality

### Service-to-Service Tests
- **Location**: `service-to-service/`
- **Purpose**: Test communication between microservices
- **Files**:
  - `auth-flow.test.ts` - Complete authentication flow
  - `matching-flow.test.ts` - User matching workflow
  - `chat-flow.test.ts` - Chat functionality
  - `event-flow.test.ts` - Event creation and participation

### Database Tests
- **Location**: `database/`
- **Purpose**: Test database operations and data consistency
- **Files**:
  - `postgres.test.ts` - PostgreSQL CRUD operations
  - `redis.test.ts` - Redis caching and sessions
  - `minio.test.ts` - File storage operations
  - `clickhouse.test.ts` - Analytics data operations

### External API Tests
- **Location**: `external-apis/`
- **Purpose**: Test integration with external services
- **Files**:
  - `ml-service.test.ts` - ML Service integration
  - `notification.test.ts` - Notification delivery
  - `file-upload.test.ts` - File upload functionality

### End-to-End Flow Tests
- **Location**: `end-to-end-flows/`
- **Purpose**: Test complete user workflows
- **Files**:
  - `user-registration.test.ts` - Complete user registration flow
  - `complete-matching.test.ts` - Full matching workflow
  - `event-creation.test.ts` - Event creation and participation

## Running Tests

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ installed
- All backend services built and available

### Quick Start
```bash
# Run all integration tests (with setup and teardown)
npm run test:integration:full

# Or run step by step:
npm run setup:integration    # Start test infrastructure
npm run wait-for-services    # Wait for services to be ready
npm run test:integration     # Run integration tests
npm run teardown:integration # Clean up
```

### Individual Test Categories
```bash
# Run specific test categories
npm run test:integration -- --testPathPattern=api-gateway
npm run test:integration -- --testPathPattern=service-to-service
npm run test:integration -- --testPathPattern=database
npm run test:integration -- --testPathPattern=end-to-end-flows
```

### Watch Mode
```bash
# Run tests in watch mode
npm run test:integration:watch
```

### Coverage
```bash
# Run tests with coverage
npm run test:integration:coverage
```

## Test Configuration

### Environment Variables
```bash
NODE_ENV=test
LOG_LEVEL=error
JWT_SECRET=test-jwt-secret-key
```

### Service URLs
- API Gateway: `http://localhost:3000`
- User Service: `http://localhost:3001`
- Matching Service: `http://localhost:3002`
- Chat Service: `http://localhost:3003`
- Event Service: `http://localhost:3004`
- Notification Service: `http://localhost:3005`
- ML Service: `http://localhost:8001`

### Database URLs
- PostgreSQL: `postgresql://test_user:test_password@localhost:5433/chugr_test`
- Redis: `redis://localhost:6380`
- ClickHouse: `http://localhost:8124`
- MinIO: `http://localhost:9001`

## Test Utilities

### IntegrationHttpClient
```typescript
import { integrationTestUtils } from '@helpers/integration-helpers';

// Make HTTP requests
const response = await integrationTestUtils.httpClient.get('/api/v1/users/profile');
const response = await integrationTestUtils.httpClient.post('/api/v1/auth/login', data);
```

### TestUserManager
```typescript
// Create test users
const { user, token } = await integrationTestUtils.userManager.createUser();

// Create authenticated client
const client = await integrationTestUtils.userManager.createAuthenticatedClient(user.id);
```

### TestDataFactory
```typescript
// Create test data
const userData = integrationTestUtils.dataFactory.createUser({ email: 'test@example.com' });
const eventData = integrationTestUtils.dataFactory.createEvent({ title: 'Test Event' });
```

### TestAssertions
```typescript
// Assert response structure
TestAssertions.assertSuccessResponse(response, 200);
TestAssertions.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
TestAssertions.assertUserData(user, expectedData);
```

## Test Lifecycle

### Before All Tests
1. Start Docker Compose with test services
2. Wait for all services to be healthy
3. Run database migrations
4. Load test fixtures

### Before Each Test
1. Clean test databases
2. Reset caches
3. Prepare test data
4. Reset mocks

### After Each Test
1. Clean up created data
2. Reset service states
3. Check for memory leaks

### After All Tests
1. Stop Docker Compose
2. Clean temporary files
3. Generate test reports

## Best Practices

### Test Isolation
- Each test should be independent
- Clean up data after each test
- Use unique test data for each test
- Don't rely on test execution order

### Test Data Management
- Use factories for test data creation
- Use fixtures for common test data
- Generate random data when possible
- Clean up test data after tests

### Error Handling
- Test both success and error scenarios
- Verify error codes and messages
- Test edge cases and boundary conditions
- Handle timeouts and network issues

### Performance
- Keep tests fast (< 30 seconds each)
- Use parallel execution when possible
- Monitor test execution time
- Optimize database operations

## Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check Docker logs
docker-compose -f docker-compose.integration.yml logs

# Check service health
npm run wait-for-services
```

#### Database Connection Issues
```bash
# Check database containers
docker-compose -f docker-compose.integration.yml ps

# Check database logs
docker-compose -f docker-compose.integration.yml logs postgres-test
```

#### Test Timeouts
```bash
# Increase timeout in test configuration
# Check service response times
# Verify network connectivity
```

#### Port Conflicts
```bash
# Check if ports are already in use
lsof -i :3000
lsof -i :5433

# Stop conflicting services
# Use different ports in test configuration
```

### Debug Mode
```bash
# Run tests with debug output
npm run test:integration -- --verbose

# Run specific test file
npm run test:integration -- --testPathPattern=auth-flow

# Run tests matching pattern
npm run test:integration -- --testNamePattern="should complete"
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Start test infrastructure
        run: npm run setup:integration
      - name: Wait for services
        run: npm run wait-for-services
      - name: Run integration tests
        run: npm run test:integration
      - name: Generate reports
        run: npm run test:integration:coverage
      - name: Cleanup
        if: always()
        run: npm run teardown:integration
```

## Metrics and Reporting

### Test Metrics
- Test execution time
- Success/failure rates
- Service response times
- Database query performance

### Reports
- HTML coverage reports
- JSON test results
- Performance metrics
- Error logs and screenshots

## Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Follow naming conventions (`*.test.ts`)
3. Use existing utilities and helpers
4. Add proper cleanup and setup
5. Update documentation

### Code Review Checklist
- [ ] Tests are isolated and independent
- [ ] Proper cleanup after tests
- [ ] Error scenarios are tested
- [ ] Test data is properly managed
- [ ] Performance is acceptable
- [ ] Documentation is updated
