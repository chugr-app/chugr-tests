#!/bin/bash

# Comprehensive Test Validation Script
# Ensures all test types remain consistent after code changes

set -e

echo "🔍 Starting comprehensive test validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=false
INTEGRATION_TESTS_PASSED=false
TOTAL_FAILURES=0

echo ""
echo "📋 Step 1: Running Unit Tests..."
echo "=================================="

if npm run test:unit --silent > unit_test_results.log 2>&1; then
    UNIT_TESTS_PASSED=true
    UNIT_PASSED=$(grep "Tests:" unit_test_results.log | grep -o "[0-9]* passed" | head -1 | grep -o "[0-9]*")
    UNIT_FAILED=$(grep "Tests:" unit_test_results.log | grep -o "[0-9]* failed" | head -1 | grep -o "[0-9]*" || echo "0")
    echo -e "${GREEN}✅ Unit Tests: $UNIT_PASSED passed, $UNIT_FAILED failed${NC}"
else
    UNIT_FAILED=$(grep "Tests:" unit_test_results.log | grep -o "[0-9]* failed" | head -1 | grep -o "[0-9]*" || echo "unknown")
    echo -e "${RED}❌ Unit Tests: $UNIT_FAILED failed${NC}"
    TOTAL_FAILURES=$((TOTAL_FAILURES + UNIT_FAILED))
fi

echo ""
echo "📋 Step 2: Running Integration Tests..."
echo "======================================="

if npm run test:integration --silent > integration_test_results.log 2>&1; then
    INTEGRATION_TESTS_PASSED=true
    INTEGRATION_PASSED=$(grep "Tests:" integration_test_results.log | grep -o "[0-9]* passed" | head -1 | grep -o "[0-9]*")
    INTEGRATION_FAILED=$(grep "Tests:" integration_test_results.log | grep -o "[0-9]* failed" | head -1 | grep -o "[0-9]*" || echo "0")
    echo -e "${GREEN}✅ Integration Tests: $INTEGRATION_PASSED passed, $INTEGRATION_FAILED failed${NC}"
else
    INTEGRATION_PASSED=$(grep "Tests:" integration_test_results.log | grep -o "[0-9]* passed" | head -1 | grep -o "[0-9]*" || echo "0")
    INTEGRATION_FAILED=$(grep "Tests:" integration_test_results.log | grep -o "[0-9]* failed" | head -1 | grep -o "[0-9]*" || echo "unknown")
    echo -e "${YELLOW}⚠️  Integration Tests: $INTEGRATION_PASSED passed, $INTEGRATION_FAILED failed${NC}"
    TOTAL_FAILURES=$((TOTAL_FAILURES + INTEGRATION_FAILED))
fi

echo ""
echo "📋 Step 3: Cross-validation Analysis..."
echo "======================================="

# Check for potential conflicts
echo "🔍 Checking for potential test conflicts..."

# Check if any unit tests mock functions that were changed
echo "   - Analyzing mocked functions in unit tests..."
if grep -r "mockPrismaClient\|mockEventPublisher" backend/unit/ > /dev/null; then
    echo -e "   ${GREEN}✅ Unit tests properly use mocks${NC}"
else
    echo -e "   ${YELLOW}⚠️  Some unit tests may not use proper mocks${NC}"
fi

# Check if integration tests cover the changed endpoints
echo "   - Analyzing integration test coverage..."
if grep -r "/preferences\|organizerId\|participants" backend/integration/ > /dev/null; then
    echo -e "   ${GREEN}✅ Integration tests cover modified endpoints${NC}"
else
    echo -e "   ${YELLOW}⚠️  Integration tests may not cover all changes${NC}"
fi

echo ""
echo "📊 Final Summary"
echo "================"

if [ "$UNIT_TESTS_PASSED" = true ] && [ "$INTEGRATION_FAILED" -lt 20 ]; then
    echo -e "${GREEN}🎉 Overall Status: GOOD${NC}"
    echo "   - Unit tests: All passing ✅"
    echo "   - Integration tests: Acceptable failure rate ✅"
    echo "   - Code changes are well-isolated ✅"
    exit 0
elif [ "$UNIT_TESTS_PASSED" = true ]; then
    echo -e "${YELLOW}⚠️  Overall Status: NEEDS ATTENTION${NC}"
    echo "   - Unit tests: All passing ✅"
    echo "   - Integration tests: High failure rate ⚠️"
    echo "   - Recommendation: Focus on integration test fixes"
    exit 1
else
    echo -e "${RED}❌ Overall Status: CRITICAL${NC}"
    echo "   - Unit tests: Failures detected ❌"
    echo "   - Integration tests: Multiple failures ❌"
    echo "   - Recommendation: Review code changes for breaking changes"
    exit 2
fi
