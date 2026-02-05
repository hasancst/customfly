# Regression Testing Guide - Real-Time Synchronization

## Overview

Test suite ini memverifikasi bahwa data antara **Admin Designer** dan **Public Designer** selalu tersinkronisasi secara real-time untuk produk yang sama.

## Quick Start

### 1. Setup Environment

```bash
cd /www/wwwroot/custom.local/doc

# Copy template environment file
cp .env.test.example .env.test

# Edit .env.test dengan nilai yang sesuai
nano .env.test
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

```bash
# Load environment variables dan jalankan test
export $(cat .env.test | xargs) && cd ../backend && npm run test:regression
```

Atau dengan satu command:

```bash
# Linux/Mac (from doc directory)
cd /www/wwwroot/custom.local/doc
TEST_SHOP=your-shop.myshopify.com \
TEST_PRODUCT_ID=123456 \
TEST_AUTH_TOKEN=your_token \
../backend/npm run test:regression

# Windows PowerShell
$env:TEST_SHOP="your-shop.myshopify.com"; $env:TEST_PRODUCT_ID="123456"; $env:TEST_AUTH_TOKEN="your_token"; npm run test:regression
```

## Test Cases

Test suite ini mencakup 6 test cases utama:

1. **TC-001: Fresh Product Load**
   - Memverifikasi Admin dan Public memuat state yang sama

2. **TC-002: Save Design in Admin → Verify in Public**
   - Memverifikasi design yang disimpan di Admin langsung terlihat di Public

3. **TC-003: Update Existing Design**
   - Memverifikasi update design tersinkronisasi

4. **TC-004: Update Base Image**
   - Memverifikasi perubahan konfigurasi tersinkronisasi

5. **TC-006: Cache Invalidation**
   - Memverifikasi cache di-invalidate saat save

6. **TC-013: Performance Test**
   - Memverifikasi response time dalam batas acceptable

## Expected Output

### Success Case

```
============================================================
  REGRESSION TEST SUITE - REAL-TIME SYNCHRONIZATION
============================================================

ℹ Base URL: http://localhost:3011
ℹ Shop: test-shop.myshopify.com
ℹ Product ID: 9876543210
ℹ Auth Token: Provided

▶ Running: TC-001: Fresh Product Load
ℹ TC-001: Fresh Product Load - Verify Admin and Public load same state
✓ Admin and Public states are synchronized
✓ PASSED: TC-001: Fresh Product Load

▶ Running: TC-002: Save Design in Admin → Verify in Public
ℹ TC-002: Save Design in Admin → Verify in Public
ℹ Design saved with ID: abc123
✓ Design synchronized from Admin to Public successfully
✓ PASSED: TC-002: Save Design in Admin → Verify in Public

...

============================================================
  TEST SUMMARY
============================================================
Total Tests:   6
Passed:        6
Failed:        0
Skipped:       0
============================================================

✓ All tests passed! ✨
```

### Failure Case

```
✗ FAILED: TC-002: Save Design in Admin → Verify in Public
  Error: Content should match

============================================================
  TEST SUMMARY
============================================================
Total Tests:   6
Passed:        5
Failed:        1
Skipped:       0
============================================================

FAILED TESTS:
  ✗ TC-002: Save Design in Admin → Verify in Public
    Content should match

✗ Some tests failed. Please review and fix.
```

## Getting Test Auth Token

### Method 1: From Browser DevTools

1. Login ke Shopify Admin
2. Buka Developer Tools (F12)
3. Go to **Network** tab
4. Refresh halaman atau buat API request
5. Cari request ke `/imcst_api/*`
6. Lihat **Request Headers**
7. Copy value dari `Authorization: Bearer <token>`

### Method 2: From Backend Logs

1. Enable debug logging di backend
2. Login ke Admin
3. Check backend logs untuk session token
4. Copy token value

## Troubleshooting

### Error: "TEST_AUTH_TOKEN environment variable is required"

**Solution:** Set environment variable sebelum run test:

```bash
export TEST_AUTH_TOKEN="your_token_here"
npm run test:regression
```

### Error: "Admin API should respond successfully"

**Possible causes:**
- Backend tidak running
- Auth token expired atau invalid
- Product ID tidak ada

**Solution:**
1. Pastikan backend running: `systemctl status imcst-backend.service`
2. Generate fresh auth token
3. Verify product ID exists di shop

### Error: "Content should match"

**Possible causes:**
- Cache tidak di-invalidate dengan benar
- Database query salah
- Race condition

**Solution:**
1. Check backend logs untuk errors
2. Verify cache invalidation logic
3. Run test lagi untuk confirm

### Test Timeout

**Solution:**
- Increase timeout di test script
- Check network latency
- Verify database performance

## Manual Testing

Jika automated test gagal, lakukan manual testing:

### Step 1: Verify Admin Save

1. Buka Admin Designer
2. Tambah text element: "Manual Test"
3. Click Save
4. Verify success message

### Step 2: Verify Public Load

1. Buka Public Designer (new browser tab/incognito)
2. Load produk yang sama
3. Verify text element "Manual Test" muncul
4. Verify posisi dan styling sama

### Step 3: Check Backend Logs

```bash
# Real-time logs
journalctl -u imcst-backend.service -f

# Recent logs
journalctl -u imcst-backend.service -n 100
```

Look for:
- `[Public API] Fetching variants for product...`
- Cache hit/miss messages
- Any error messages

### Step 4: Check Database

```bash
# Connect to database
psql $DATABASE_URL

# Check latest design
SELECT id, name, "shopifyProductId", "updatedAt", "isTemplate"
FROM "SavedDesign"
WHERE shop = 'your-shop.myshopify.com'
  AND "shopifyProductId" = 'your-product-id'
ORDER BY "updatedAt" DESC
LIMIT 1;

# Check config
SELECT "baseImage", "designerLayout", "updatedAt"
FROM "MerchantConfig"
WHERE shop = 'your-shop.myshopify.com'
  AND "shopifyProductId" = 'your-product-id';
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/regression-test.yml`:

```yaml
name: Regression Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Setup database
        run: |
          cd backend
          npx prisma migrate deploy
      
      - name: Start backend
        run: |
          cd backend
          npm start &
          sleep 5
      
      - name: Run regression tests
        env:
          BASE_URL: http://localhost:3011
          TEST_SHOP: ${{ secrets.TEST_SHOP }}
          TEST_PRODUCT_ID: ${{ secrets.TEST_PRODUCT_ID }}
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}
        run: |
          cd backend
          npm run test:regression
```

### Pre-commit Hook

Create `.git/hooks/pre-push`:

```bash
#!/bin/bash

echo "Running regression tests before push..."

cd backend
export $(cat .env.test | xargs)
npm run test:regression

if [ $? -ne 0 ]; then
  echo "❌ Regression tests failed. Push aborted."
  exit 1
fi

echo "✅ All tests passed. Proceeding with push."
exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-push
```

## Best Practices

1. **Run tests before every deployment**
2. **Update tests when adding new features**
3. **Keep test data isolated** (use dedicated test shop)
4. **Monitor test execution time** (should be < 30 seconds)
5. **Review failed tests immediately** (don't ignore failures)

## Support

Jika ada masalah dengan test suite:

1. Check dokumentasi lengkap: `/doc/regression-test-realtime-sync.md`
2. Review fix documentation: `/doc/realtime-sync-fix.md`
3. Check backend logs
4. Verify database state

## Changelog

### 2026-02-02
- ✅ Initial test suite created
- ✅ 6 core test cases implemented
- ✅ Automated test script ready
- ✅ Documentation complete
