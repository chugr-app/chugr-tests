#!/usr/bin/env node

/**
 * Wait for services to be ready
 * This script waits for all services to be healthy before running tests
 */

const http = require('http');
const https = require('https');

const services = [
  { name: 'PostgreSQL', url: 'http://localhost:5433', timeout: 30000 },
  { name: 'Redis', url: 'http://localhost:6380', timeout: 30000 },
  { name: 'MinIO', url: 'http://localhost:9001', timeout: 30000 },
  { name: 'ClickHouse', url: 'http://localhost:8124/ping', timeout: 30000 },
  { name: 'API Gateway', url: 'http://localhost:3000/health', timeout: 60000 },
  { name: 'User Service', url: 'http://localhost:3001/health', timeout: 60000 },
  { name: 'Matching Service', url: 'http://localhost:3002/health', timeout: 60000 },
  { name: 'Chat Service', url: 'http://localhost:3003/health', timeout: 60000 },
  { name: 'Event Service', url: 'http://localhost:3004/health', timeout: 60000 },
  { name: 'Notification Service', url: 'http://localhost:3005/health', timeout: 60000 },
  { name: 'ML Service', url: 'http://localhost:8001/health', timeout: 60000 }
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, { timeout }, (response) => {
      resolve(response.statusCode);
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function waitForService(service) {
  const startTime = Date.now();
  const timeout = service.timeout || 30000;
  
  log(`⏳ Waiting for ${service.name}...`, 'yellow');
  
  while (Date.now() - startTime < timeout) {
    try {
      const statusCode = await makeRequest(service.url, 5000);
      if (statusCode >= 200 && statusCode < 400) {
        const elapsed = Date.now() - startTime;
        log(`✅ ${service.name} is ready (${elapsed}ms)`, 'green');
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const elapsed = Date.now() - startTime;
  log(`❌ ${service.name} failed to start within ${elapsed}ms`, 'red');
  return false;
}

async function waitForAllServices() {
  log('🚀 Starting service health checks...', 'cyan');
  log('', 'reset');
  
  const results = [];
  
  for (const service of services) {
    const success = await waitForService(service);
    results.push({ service: service.name, success });
    
    if (!success) {
      log(`\n❌ Service ${service.name} failed to start`, 'red');
      log('Check Docker logs for more information:', 'yellow');
      log(`docker-compose -f docker-compose.integration.yml logs ${service.name.toLowerCase().replace(/\s+/g, '-')}`, 'blue');
      process.exit(1);
    }
  }
  
  log('', 'reset');
  log('🎉 All services are ready!', 'green');
  log('', 'reset');
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  log(`✅ ${successful}/${total} services are healthy`, 'green');
  
  // Additional health check for API Gateway
  try {
    const response = await makeRequest('http://localhost:3000/health');
    if (response === 200) {
      log('🔍 API Gateway health check passed', 'green');
    }
  } catch (error) {
    log('⚠️  API Gateway health check failed', 'yellow');
  }
  
  log('', 'reset');
  log('Ready to run integration tests!', 'bright');
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Service health check interrupted', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n🛑 Service health check terminated', 'yellow');
  process.exit(1);
});

// Run the health checks
if (require.main === module) {
  waitForAllServices().catch((error) => {
    log(`\n💥 Error during service health checks: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { waitForAllServices, waitForService };
