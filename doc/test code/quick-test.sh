#!/bin/bash

# Quick Regression Test Runner
# Usage: ./quick-test.sh [shop] [product_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Quick Regression Test - Real-Time Synchronization        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.test exists
if [ ! -f .env.test ]; then
    echo -e "${YELLOW}⚠ .env.test not found${NC}"
    echo -e "${BLUE}ℹ Creating from template...${NC}"
    cp .env.test.example .env.test
    echo -e "${GREEN}✓ Created .env.test${NC}"
    echo -e "${YELLOW}⚠ Please edit .env.test with your test credentials${NC}"
    echo ""
    exit 1
fi

# Load environment variables
echo -e "${BLUE}ℹ Loading test configuration...${NC}"
export $(cat .env.test | grep -v '^#' | xargs)

# Override with command line arguments if provided
if [ ! -z "$1" ]; then
    export TEST_SHOP="$1"
    echo -e "${BLUE}ℹ Using shop from argument: $TEST_SHOP${NC}"
fi

if [ ! -z "$2" ]; then
    export TEST_PRODUCT_ID="$2"
    echo -e "${BLUE}ℹ Using product ID from argument: $TEST_PRODUCT_ID${NC}"
fi

# Validate required variables
if [ -z "$TEST_AUTH_TOKEN" ]; then
    echo -e "${RED}✗ TEST_AUTH_TOKEN is required${NC}"
    echo -e "${YELLOW}  Please set it in .env.test file${NC}"
    exit 1
fi

if [ -z "$TEST_SHOP" ]; then
    echo -e "${RED}✗ TEST_SHOP is required${NC}"
    echo -e "${YELLOW}  Usage: ./quick-test.sh your-shop.myshopify.com 123456${NC}"
    exit 1
fi

if [ -z "$TEST_PRODUCT_ID" ]; then
    echo -e "${RED}✗ TEST_PRODUCT_ID is required${NC}"
    echo -e "${YELLOW}  Usage: ./quick-test.sh your-shop.myshopify.com 123456${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Configuration loaded${NC}"
echo -e "${BLUE}  Shop: ${TEST_SHOP}${NC}"
echo -e "${BLUE}  Product ID: ${TEST_PRODUCT_ID}${NC}"
echo -e "${BLUE}  Base URL: ${BASE_URL:-http://localhost:3011}${NC}"
echo ""

# Check if backend is running
echo -e "${BLUE}ℹ Checking backend status...${NC}"
if curl -s "${BASE_URL:-http://localhost:3011}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend might not be running${NC}"
    echo -e "${BLUE}  Checking systemctl...${NC}"
    
    if systemctl is-active --quiet imcst-backend.service; then
        echo -e "${GREEN}✓ Backend service is active${NC}"
    else
        echo -e "${RED}✗ Backend service is not running${NC}"
        echo -e "${YELLOW}  Start it with: systemctl start imcst-backend.service${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Running Tests...                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Run the test (from backend directory)
cd ../backend && npm run test:regression

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}║  ✓ ALL TESTS PASSED                                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✨ Real-time synchronization is working correctly!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}║  ✗ SOME TESTS FAILED                                       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}❌ Tests failed. Please review the output above.${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting tips:${NC}"
    echo -e "${BLUE}  1. Check backend logs: journalctl -u imcst-backend.service -n 50${NC}"
    echo -e "${BLUE}  2. Verify auth token is valid${NC}"
    echo -e "${BLUE}  3. Ensure product exists in shop${NC}"
    echo -e "${BLUE}  4. Check database connectivity${NC}"
    echo ""
    echo -e "${BLUE}For detailed help, see: TEST-README.md${NC}"
    echo ""
    exit 1
fi
