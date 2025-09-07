# chugr Tests

Comprehensive test suite for the chugr project - a social app for finding drinking buddies and companions.

## 🎯 Overview

This repository contains all tests for the chugr project, including:
- **Unit Tests** - Individual service testing
- **Integration Tests** - Service-to-service communication
- **End-to-End Tests** - Complete user workflows
- **Performance Tests** - Load and stress testing
- **Security Tests** - Security vulnerability scanning

## 📁 Structure

```
chugr-tests/
├── backend/                    # Backend tests
│   ├── unit/                  # Unit tests for each service
│   │   ├── api-gateway/       # API Gateway unit tests
│   │   ├── user-service/      # User Service unit tests
│   │   ├── matching-service/  # Matching Service unit tests
│   │   ├── ml-service/        # ML Service unit tests
│   │   ├── chat-service/      # Chat Service unit tests
│   │   ├── event-service/     # Event Service unit tests
│   │   └── notification-service/ # Notification Service unit tests
│   ├── integration/           # Integration tests
│   │   ├── service-to-service/ # Inter-service communication
│   │   ├── database/          # Database integration tests
│   │   └── external-apis/     # External API integration tests
│   ├── e2e/                   # End-to-end tests
│   │   ├── user-flows/        # User registration, login, profile
│   │   ├── matching-flows/    # Matching algorithm testing
│   │   ├── chat-flows/        # Real-time chat functionality
│   │   └── event-flows/       # Event creation and management
│   ├── performance/           # Performance and load tests
│   │   ├── load-tests/        # Normal load testing
│   │   ├── stress-tests/      # Stress testing
│   │   └── scenarios/         # Artillery test scenarios
│   └── security/              # Security tests
│       ├── authentication/    # Auth security tests
│       ├── authorization/     # Authorization tests
│       ├── input-validation/  # Input validation tests
│       └── vulnerability/     # Vulnerability scanning
├── shared/                    # Shared test utilities
│   ├── fixtures/              # Test data and fixtures
│   ├── helpers/               # Test helper functions
│   └── config/                # Test configuration
├── reports/                   # Test reports and coverage
└── .github/workflows/         # CI/CD workflows
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/chugr-app/chugr-tests.git
cd chugr-tests

# Install dependencies
npm install

# Start test infrastructure
npm run setup
```

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only
npm run test:security     # Security tests only

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

## 🧪 Test Types

### Unit Tests
Test individual functions, classes, and modules in isolation.

**Coverage:**
- Service business logic
- Utility functions
- Data validation
- Error handling

### Integration Tests
Test interactions between services and external dependencies.

**Coverage:**
- Service-to-service communication
- Database operations
- External API calls
- Message queue interactions

### End-to-End Tests
Test complete user workflows from start to finish.

**Coverage:**
- User registration and authentication
- Profile creation and updates
- Matching algorithm
- Real-time chat
- Event management
- Notification delivery

### Performance Tests
Test system performance under various load conditions.

**Coverage:**
- API response times
- Database query performance
- Memory usage
- Concurrent user handling
- Stress testing

### Security Tests
Test security vulnerabilities and compliance.

**Coverage:**
- Authentication bypass attempts
- Authorization checks
- Input validation
- SQL injection prevention
- XSS protection
- OWASP Top 10 compliance

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Test Environment
NODE_ENV=test
LOG_LEVEL=debug

# Database URLs
POSTGRES_URL=postgresql://test_user:test_password@localhost:5433/chugr_test
REDIS_URL=redis://localhost:6380
CLICKHOUSE_URL=http://localhost:8124

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9001
MINIO_ACCESS_KEY=test_access_key
MINIO_SECRET_KEY=test_secret_key

# JWT Configuration
JWT_SECRET=test_jwt_secret
JWT_EXPIRES_IN=1h

# Service URLs
API_GATEWAY_URL=http://localhost:3000
USER_SERVICE_URL=http://localhost:3001
MATCHING_SERVICE_URL=http://localhost:3002
ML_SERVICE_URL=http://localhost:3003
CHAT_SERVICE_URL=http://localhost:3004
EVENT_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3006
```

### Jest Configuration

Jest is configured in `package.json` with:
- TypeScript support via `ts-jest`
- Coverage reporting
- Test timeout of 30 seconds
- Maximum 4 workers for parallel execution

## 📊 Test Reports

Test reports are generated in the `reports/` directory:

- **Coverage Reports** - `reports/coverage/`
- **Performance Reports** - `reports/performance/`
- **Security Reports** - `reports/security/`
- **JUnit Reports** - `reports/junit/`

## 🔄 CI/CD Integration

Tests are automatically run on:
- Pull requests
- Main branch pushes
- Scheduled runs (nightly)

### GitHub Actions Workflows

- `backend-tests.yml` - Backend test execution
- `performance-tests.yml` - Performance test execution
- `security-tests.yml` - Security test execution

## 🛠 Development

### Adding New Tests

1. **Unit Tests**: Add to appropriate service directory in `backend/unit/`
2. **Integration Tests**: Add to `backend/integration/`
3. **E2E Tests**: Add to `backend/e2e/`
4. **Performance Tests**: Add scenarios to `backend/performance/scenarios/`
5. **Security Tests**: Add to `backend/security/`

### Test Data Management

- Use fixtures from `shared/fixtures/` for consistent test data
- Clean up test data after each test
- Use factories for dynamic test data generation

### Best Practices

- Write descriptive test names
- Use AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and failure scenarios
- Keep tests independent and isolated
- Use meaningful assertions

## 📚 Documentation

- [API Documentation](https://github.com/chugr-app/chugr-docs/blob/main/API.md)
- [Architecture Overview](https://github.com/chugr-app/chugr-docs/blob/main/ARCHITECTURE.md)
- [Service Integrations](https://github.com/chugr-app/chugr-docs/blob/main/INTEGRATIONS.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
