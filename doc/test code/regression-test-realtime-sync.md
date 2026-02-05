# Regression Test Suite - Real-Time Synchronization
# Admin Designer ↔ Public Designer Data Consistency

## Test Environment Setup

### Prerequisites
- Backend server running on port 3011
- Frontend admin running on port 3006
- Test shop domain: `test-shop.myshopify.com`
- Test product ID: `9876543210`
- Valid Shopify session token

### Test Data Preparation
```sql
-- Clear existing test data
DELETE FROM "SavedDesign" WHERE shop = 'test-shop.myshopify.com' AND shopifyProductId = '9876543210';
DELETE FROM "MerchantConfig" WHERE shop = 'test-shop.myshopify.com' AND shopifyProductId = '9876543210';

-- Insert baseline config
INSERT INTO "MerchantConfig" (id, shop, shopifyProductId, printArea, baseImage, createdAt, updatedAt)
VALUES (
  'test-config-001',
  'test-shop.myshopify.com',
  '9876543210',
  '{}',
  'https://example.com/base.png',
  NOW(),
  NOW()
);
```

---

## Test Cases

### 1. Basic Synchronization Tests

#### TC-001: Fresh Product Load
**Objective:** Verify both Admin and Public load the same initial state

**Steps:**
1. Clear all designs for test product
2. Open Admin Designer for product `9876543210`
3. Note the initial canvas state (should be empty or from config)
4. Open Public Designer for same product
5. Compare canvas states

**Expected Result:**
- ✅ Both show identical canvas
- ✅ Both show same base image from config
- ✅ Both show same safe area settings

**API Calls to Monitor:**
```
Admin: GET /imcst_api/design/product/9876543210
Public: GET /imcst_public_api/product/test-shop.myshopify.com/9876543210
```

**Assertion:**
```javascript
assert(adminDesign.designJson === publicDesign.design);
assert(adminConfig.baseImage === publicConfig.baseImage);
```

---

#### TC-002: Save Design in Admin → Verify in Public
**Objective:** Verify design changes propagate to public immediately

**Steps:**
1. Open Admin Designer
2. Add text element: "Test Real-Time Sync"
3. Click "Save Design"
4. Wait for save confirmation
5. Open Public Designer (new session)
6. Verify text element exists

**Expected Result:**
- ✅ Public shows the new text element
- ✅ Text content matches exactly
- ✅ Element position matches
- ✅ No cache delay (immediate visibility)

**API Sequence:**
```
1. POST /imcst_api/design
   Body: { designJson: [{ elements: [{ type: 'text', content: 'Test Real-Time Sync' }] }] }
   
2. Cache invalidation triggered:
   - cache.del('pub_prod_test-shop.myshopify.com_9876543210')
   
3. GET /imcst_public_api/product/test-shop.myshopify.com/9876543210
   Response: { design: [{ elements: [{ type: 'text', content: 'Test Real-Time Sync' }] }] }
```

**Assertion:**
```javascript
const adminElement = adminDesign.designJson[0].elements[0];
const publicElement = publicDesign.design[0].elements[0];

assert.equal(adminElement.type, publicElement.type);
assert.equal(adminElement.content, publicElement.content);
assert.equal(adminElement.x, publicElement.x);
assert.equal(adminElement.y, publicElement.y);
```

---

#### TC-003: Update Existing Design
**Objective:** Verify design updates propagate correctly

**Steps:**
1. Load existing design in Admin
2. Modify text: "Updated Content"
3. Move element to new position (x: 100, y: 200)
4. Save design
5. Refresh Public Designer
6. Verify changes

**Expected Result:**
- ✅ Text content updated
- ✅ Position updated
- ✅ All other elements unchanged
- ✅ updatedAt timestamp reflects latest save

**Assertion:**
```javascript
assert.equal(publicElement.content, 'Updated Content');
assert.equal(publicElement.x, 100);
assert.equal(publicElement.y, 200);
assert(new Date(publicDesign.updatedAt) > originalTimestamp);
```

---

### 2. Configuration Synchronization Tests

#### TC-004: Update Base Image in Admin
**Objective:** Verify config changes sync to public

**Steps:**
1. Open Admin Designer
2. Change base image to new URL
3. Save configuration
4. Open Public Designer
5. Verify base image changed

**Expected Result:**
- ✅ Public shows new base image
- ✅ Base image properties (scale, position) preserved
- ✅ Cache invalidated correctly

**API Calls:**
```
POST /imcst_api/config
Body: { 
  productId: '9876543210',
  baseImage: 'https://example.com/new-base.png'
}

Cache invalidation:
- cache.del('config_test-shop.myshopify.com_9876543210')
- cache.del('pub_config_test-shop.myshopify.com_9876543210')
- cache.del('pub_prod_test-shop.myshopify.com_9876543210')
```

---

#### TC-005: Update Designer Layout Setting
**Objective:** Verify global settings sync

**Steps:**
1. Change Designer Layout from "redirect" to "modal"
2. Save shop config
3. Verify public designer respects new layout
4. Change button text to "Customize Now"
5. Verify button text updates

**Expected Result:**
- ✅ Layout mode changes
- ✅ Button text updates
- ✅ Global cache invalidated

**API Calls:**
```
POST /imcst_api/shop_config
Body: {
  designerLayout: 'modal',
  buttonText: 'Customize Now'
}

Cache invalidation:
- cache.del('config_test-shop.myshopify.com_GLOBAL')
- cache.del('pub_config_test-shop.myshopify.com_GLOBAL')
```

---

### 3. Cache Behavior Tests

#### TC-006: Cache Invalidation on Save
**Objective:** Verify cache is properly cleared

**Steps:**
1. Load public designer (cache miss → DB query)
2. Load again (cache hit → no DB query)
3. Save design in admin
4. Load public designer again (cache miss → DB query with new data)

**Expected Result:**
- ✅ First load: Cache miss, DB query
- ✅ Second load: Cache hit, no DB query
- ✅ After save: Cache miss, DB query with updated data
- ✅ Fourth load: Cache hit with new data

**Monitoring:**
```javascript
// Monitor backend logs
console.log('[CACHE HIT] Config for 9876543210'); // Should appear on 2nd load
console.log('[CACHE MISS] Config for 9876543210'); // Should appear on 1st and 3rd load
```

---

#### TC-007: Cache TTL Behavior
**Objective:** Verify cache expires after 5 minutes

**Steps:**
1. Load public designer (cache set)
2. Wait 4 minutes
3. Load again (should be cache hit)
4. Wait 2 more minutes (total 6 minutes)
5. Load again (should be cache miss)

**Expected Result:**
- ✅ Cache hit within 5 minutes
- ✅ Cache miss after 5 minutes
- ✅ Fresh data loaded from DB

---

### 4. Multi-Product Isolation Tests

#### TC-008: Product A Changes Don't Affect Product B
**Objective:** Verify cache isolation between products

**Steps:**
1. Save design for Product A (ID: 111)
2. Save design for Product B (ID: 222)
3. Update Product A design
4. Verify Product B design unchanged

**Expected Result:**
- ✅ Product A cache invalidated
- ✅ Product B cache NOT invalidated
- ✅ Product B still serves from cache
- ✅ No cross-contamination

**Cache Keys:**
```
Product A: pub_prod_test-shop.myshopify.com_111
Product B: pub_prod_test-shop.myshopify.com_222
```

---

### 5. Fallback Logic Tests

#### TC-009: No Product Design → Global Template
**Objective:** Verify fallback to global template

**Steps:**
1. Delete all designs for product 9876543210
2. Create global template (shopifyProductId: 'GLOBAL', isTemplate: true)
3. Open Public Designer for product 9876543210
4. Verify global template loaded

**Expected Result:**
- ✅ Public loads global template
- ✅ Admin shows empty state (no product-specific design)
- ✅ Fallback logic works correctly

**Database Query:**
```sql
-- First query (product-specific)
SELECT * FROM "SavedDesign" 
WHERE shop = 'test-shop.myshopify.com' 
  AND shopifyProductId = '9876543210'
ORDER BY updatedAt DESC LIMIT 1;
-- Result: NULL

-- Second query (global fallback)
SELECT * FROM "SavedDesign"
WHERE shop = 'test-shop.myshopify.com'
  AND shopifyProductId = 'GLOBAL'
  AND isTemplate = true
ORDER BY updatedAt DESC LIMIT 1;
-- Result: Global template
```

---

#### TC-010: Multiple Designs → Latest Wins
**Objective:** Verify latest design is always selected

**Steps:**
1. Create Design A at 10:00 AM
2. Create Design B at 10:05 AM
3. Create Design C at 10:10 AM
4. Load Public Designer
5. Verify Design C is loaded (latest)

**Expected Result:**
- ✅ Design C loaded (updatedAt: 10:10)
- ✅ Designs A and B ignored
- ✅ ORDER BY updatedAt DESC works correctly

---

### 6. Edge Cases & Error Handling

#### TC-011: Concurrent Saves
**Objective:** Verify behavior with rapid successive saves

**Steps:**
1. Save Design A
2. Immediately save Design B (within 1 second)
3. Load Public Designer
4. Verify Design B is shown (latest)

**Expected Result:**
- ✅ Both saves succeed
- ✅ Latest save wins
- ✅ No race conditions
- ✅ Cache invalidated correctly for both

---

#### TC-012: Invalid Cache Key Handling
**Objective:** Verify graceful handling of cache errors

**Steps:**
1. Manually corrupt cache (if possible)
2. Load Public Designer
3. Verify fallback to database

**Expected Result:**
- ✅ No application crash
- ✅ Database query executed
- ✅ Valid data returned
- ✅ Cache re-populated

---

### 7. Performance Tests

#### TC-013: Response Time Comparison
**Objective:** Measure cache performance benefit

**Test:**
```javascript
// Cache Miss (First Load)
const start1 = Date.now();
await fetch('/imcst_public_api/product/shop/product');
const cacheMissTime = Date.now() - start1;

// Cache Hit (Second Load)
const start2 = Date.now();
await fetch('/imcst_public_api/product/shop/product');
const cacheHitTime = Date.now() - start2;

console.log(`Cache Miss: ${cacheMissTime}ms`);
console.log(`Cache Hit: ${cacheHitTime}ms`);
console.log(`Speedup: ${(cacheMissTime / cacheHitTime).toFixed(2)}x`);
```

**Expected Result:**
- ✅ Cache hit < 50ms
- ✅ Cache miss < 500ms
- ✅ Speedup > 5x

---

## Automated Test Script

### Node.js Test Runner

```javascript
// test/regression/realtime-sync.test.js
const assert = require('assert');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3011';
const SHOP = 'test-shop.myshopify.com';
const PRODUCT_ID = '9876543210';

describe('Real-Time Synchronization Tests', function() {
  this.timeout(10000);

  let authToken;

  before(async () => {
    // Get auth token
    authToken = process.env.TEST_AUTH_TOKEN;
  });

  describe('TC-002: Save Design in Admin → Verify in Public', () => {
    it('should sync design from admin to public immediately', async () => {
      // 1. Save design in admin
      const designData = {
        shopifyProductId: PRODUCT_ID,
        name: 'Test Design',
        designJson: [{
          id: 'page1',
          elements: [{
            id: 'text1',
            type: 'text',
            content: 'Test Real-Time Sync',
            x: 50,
            y: 100
          }]
        }]
      };

      const saveRes = await fetch(`${BASE_URL}/imcst_api/design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(designData)
      });

      assert.ok(saveRes.ok, 'Design save should succeed');
      const savedDesign = await saveRes.json();

      // 2. Load from public API
      const publicRes = await fetch(
        `${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`
      );

      assert.ok(publicRes.ok, 'Public API should respond');
      const publicData = await publicRes.json();

      // 3. Verify sync
      assert.ok(publicData.design, 'Public should have design');
      assert.equal(
        publicData.design[0].elements[0].content,
        'Test Real-Time Sync',
        'Content should match'
      );
      assert.equal(
        publicData.design[0].elements[0].x,
        50,
        'X position should match'
      );
    });
  });

  describe('TC-006: Cache Invalidation on Save', () => {
    it('should invalidate cache when design is saved', async () => {
      // 1. First load (cache miss)
      const start1 = Date.now();
      await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
      const time1 = Date.now() - start1;

      // 2. Second load (cache hit - should be faster)
      const start2 = Date.now();
      await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
      const time2 = Date.now() - start2;

      assert.ok(time2 < time1, 'Second load should be faster (cache hit)');

      // 3. Save design (invalidates cache)
      await fetch(`${BASE_URL}/imcst_api/design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          shopifyProductId: PRODUCT_ID,
          name: 'Updated',
          designJson: [{ id: 'page1', elements: [] }]
        })
      });

      // 4. Third load (cache miss after invalidation)
      const start3 = Date.now();
      await fetch(`${BASE_URL}/imcst_public_api/product/${SHOP}/${PRODUCT_ID}`);
      const time3 = Date.now() - start3;

      assert.ok(time3 > time2, 'Third load should be slower (cache miss)');
    });
  });
});
```

---

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Backend server running and healthy
- [ ] Frontend admin accessible
- [ ] Test shop authenticated
- [ ] Database accessible for verification
- [ ] Browser DevTools open for network monitoring

### Test Execution
- [ ] TC-001: Fresh Product Load
- [ ] TC-002: Save Design in Admin → Verify in Public
- [ ] TC-003: Update Existing Design
- [ ] TC-004: Update Base Image in Admin
- [ ] TC-005: Update Designer Layout Setting
- [ ] TC-006: Cache Invalidation on Save
- [ ] TC-007: Cache TTL Behavior
- [ ] TC-008: Product A Changes Don't Affect Product B
- [ ] TC-009: No Product Design → Global Template
- [ ] TC-010: Multiple Designs → Latest Wins
- [ ] TC-011: Concurrent Saves
- [ ] TC-012: Invalid Cache Key Handling
- [ ] TC-013: Response Time Comparison

### Post-Test Verification
- [ ] No errors in backend logs
- [ ] No console errors in frontend
- [ ] Database state consistent
- [ ] Cache behavior as expected
- [ ] All assertions passed

---

## Regression Test Schedule

### When to Run
1. **Before every deployment** to production
2. **After any changes** to:
   - `/backend/server.js` (design/config endpoints)
   - `/frontend/src/pages/Designer.tsx`
   - `/frontend/src/pages/DesignerPublic.tsx`
   - Cache logic
   - Database schema

### Continuous Integration
```yaml
# .github/workflows/regression-test.yml
name: Regression Tests

on:
  pull_request:
    paths:
      - 'backend/server.js'
      - 'frontend/src/pages/Designer*.tsx'
      - 'backend/prisma/schema.prisma'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '22'
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install
      - name: Run regression tests
        run: npm run test:regression
        env:
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}
```

---

## Success Criteria

All tests must pass with:
- ✅ 100% pass rate
- ✅ No console errors
- ✅ Response times within acceptable limits
- ✅ Cache behavior correct
- ✅ Data consistency verified

## Failure Handling

If any test fails:
1. **Stop deployment** immediately
2. **Review backend logs** for errors
3. **Check database state** for inconsistencies
4. **Verify cache invalidation** logic
5. **Fix root cause** before proceeding
6. **Re-run full test suite**

---

## Test Report Template

```markdown
# Regression Test Report
**Date:** 2026-02-02
**Tester:** [Name]
**Environment:** Production/Staging
**Build:** [Git commit hash]

## Summary
- Total Tests: 13
- Passed: X
- Failed: Y
- Skipped: Z

## Failed Tests
[List any failures with details]

## Performance Metrics
- Average cache hit time: Xms
- Average cache miss time: Yms
- Cache hit rate: Z%

## Recommendations
[Any recommendations for improvement]

## Sign-off
- [ ] All critical tests passed
- [ ] Performance acceptable
- [ ] Ready for deployment
```
