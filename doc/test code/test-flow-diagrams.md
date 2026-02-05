# Real-Time Synchronization - Test Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHOPIFY CUSTOM DESIGNER                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐                    ┌──────────────────────┐
│   ADMIN DESIGNER     │                    │   PUBLIC DESIGNER    │
│  (Merchant View)     │                    │  (Customer View)     │
└──────────┬───────────┘                    └──────────┬───────────┘
           │                                           │
           │ POST /imcst_api/design                    │ GET /imcst_public_api/
           │ POST /imcst_api/config                    │     product/:shop/:id
           │                                           │
           ▼                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVER                           │
│                      (Node.js + Express)                         │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                 │
│  │  Admin Routes  │         │  Public Routes │                 │
│  │  (Protected)   │         │  (Open)        │                 │
│  └────────┬───────┘         └────────┬───────┘                 │
│           │                          │                          │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌──────────────────────────────────────────────┐              │
│  │          CACHE LAYER (NodeCache)             │              │
│  │  • 5 minute TTL                              │              │
│  │  • Invalidated on save                       │              │
│  │  • Keys: pub_prod_{shop}_{productId}         │              │
│  └──────────────────┬───────────────────────────┘              │
│                     │                                           │
│                     ▼                                           │
│  ┌──────────────────────────────────────────────┐              │
│  │         DATABASE (PostgreSQL)                │              │
│  │  • SavedDesign table                         │              │
│  │  • MerchantConfig table                      │              │
│  └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Save Design

```
┌──────────────┐
│ Merchant     │
│ clicks SAVE  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. POST /imcst_api/design                                   │
│    Body: { designJson: [...], shopifyProductId: "123" }    │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend: Save to Database                                │
│    INSERT/UPDATE SavedDesign                                │
│    SET updatedAt = NOW()                                    │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend: Invalidate Cache                                │
│    cache.del('pub_prod_shop_123')                           │
│    cache.del('config_shop_123')                             │
│    cache.del('pub_config_shop_123')                         │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Response: { id: "abc", updatedAt: "2026-02-02..." }     │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│ Admin UI     │
│ shows saved  │
└──────────────┘
```

---

## Data Flow - Load Public Designer

```
┌──────────────┐
│ Customer     │
│ opens page   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. GET /imcst_public_api/product/shop/123                  │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend: Check Cache                                     │
│    cached = cache.get('pub_prod_shop_123')                  │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─── Cache HIT ────┐
       │                  │
       │                  ▼
       │         ┌──────────────────────┐
       │         │ Return cached data   │
       │         │ (Fast: ~20ms)        │
       │         └──────────────────────┘
       │
       └─── Cache MISS ───┐
                          │
                          ▼
       ┌─────────────────────────────────────────────────────┐
       │ 3. Query Database                                   │
       │    SELECT * FROM SavedDesign                        │
       │    WHERE shop = 'shop' AND shopifyProductId = '123' │
       │    ORDER BY updatedAt DESC LIMIT 1                  │
       └──────┬──────────────────────────────────────────────┘
              │
              ▼
       ┌─────────────────────────────────────────────────────┐
       │ 4. Set Cache                                        │
       │    cache.set('pub_prod_shop_123', data, 300)        │
       │    (TTL: 5 minutes)                                 │
       └──────┬──────────────────────────────────────────────┘
              │
              ▼
       ┌─────────────────────────────────────────────────────┐
       │ 5. Response: { design: [...], config: {...} }      │
       │    (Slower: ~200ms)                                 │
       └──────┬──────────────────────────────────────────────┘
              │
              ▼
       ┌──────────────┐
       │ Public UI    │
       │ renders      │
       └──────────────┘
```

---

## Test Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    REGRESSION TEST SUITE                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Developer    │
│ runs test    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ ./quick-test.sh                                             │
│ OR                                                          │
│ npm run test:regression                                     │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Load .env.test                                           │
│    - TEST_SHOP                                              │
│    - TEST_PRODUCT_ID                                        │
│    - TEST_AUTH_TOKEN                                        │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Validate Environment                                     │
│    ✓ Backend running?                                       │
│    ✓ Auth token valid?                                      │
│    ✓ Product exists?                                        │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Run Test Cases                                           │
│                                                             │
│    TC-001: Fresh Product Load                               │
│    ├─ GET /imcst_api/design/product/123                    │
│    ├─ GET /imcst_public_api/product/shop/123               │
│    └─ Assert: Admin === Public                             │
│                                                             │
│    TC-002: Save Design → Verify Public                     │
│    ├─ POST /imcst_api/design (save new design)             │
│    ├─ Wait 100ms                                            │
│    ├─ GET /imcst_public_api/product/shop/123               │
│    └─ Assert: Public has new design                        │
│                                                             │
│    TC-003: Update Design                                    │
│    ├─ POST /imcst_api/design (update existing)             │
│    ├─ Wait 100ms                                            │
│    ├─ GET /imcst_public_api/product/shop/123               │
│    └─ Assert: Public has updated design                    │
│                                                             │
│    TC-004: Update Base Image                                │
│    ├─ POST /imcst_api/config (new base image)              │
│    ├─ Wait 100ms                                            │
│    ├─ GET /imcst_public_api/product/shop/123               │
│    └─ Assert: Public has new base image                    │
│                                                             │
│    TC-006: Cache Invalidation                               │
│    ├─ GET (cache miss/hit)                                  │
│    ├─ GET (cache hit - fast)                                │
│    ├─ POST /imcst_api/design (invalidate)                  │
│    ├─ GET (cache miss - slower)                             │
│    └─ Assert: Cache behavior correct                       │
│                                                             │
│    TC-013: Performance                                      │
│    ├─ GET x5 times                                          │
│    ├─ Measure response times                                │
│    └─ Assert: Avg < 1s, Min < 500ms                        │
│                                                             │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Generate Report                                          │
│    Total: 6                                                 │
│    Passed: X                                                │
│    Failed: Y                                                │
│    Skipped: Z                                               │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─── All Pass ────┐
       │                 │
       │                 ▼
       │        ┌──────────────────┐
       │        │ Exit Code: 0     │
       │        │ ✓ All tests pass │
       │        └──────────────────┘
       │
       └─── Some Fail ───┐
                         │
                         ▼
                ┌──────────────────┐
                │ Exit Code: 1     │
                │ ✗ Review failures│
                └──────────────────┘
```

---

## Cache Invalidation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  BEFORE FIX (BROKEN)                         │
└─────────────────────────────────────────────────────────────┘

Admin Save → cache.del('pub_prod_shop_123')  ❌ Wrong key!
                                             
Public Load → cache.get('pub_config_shop_123')  ✓ Cache hit
              Returns OLD data (not invalidated)


┌─────────────────────────────────────────────────────────────┐
│                  AFTER FIX (WORKING)                         │
└─────────────────────────────────────────────────────────────┘

Admin Save → cache.del('pub_prod_shop_123')     ✓ Correct!
          → cache.del('config_shop_123')        ✓ Admin cache
          → cache.del('pub_config_shop_123')    ✓ Public config
                                             
Public Load → cache.get('pub_prod_shop_123')  ✗ Cache miss
           → Query database
           → Returns NEW data ✓
```

---

## Design Selection Priority

```
┌─────────────────────────────────────────────────────────────┐
│              PUBLIC DESIGNER - DESIGN SELECTION              │
└─────────────────────────────────────────────────────────────┘

Customer opens Public Designer for Product 123
                    │
                    ▼
         ┌──────────────────────┐
         │ Query 1: Latest      │
         │ design for this      │
         │ product              │
         └──────┬───────────────┘
                │
         ┌──────▼───────┐
         │ Found?       │
         └──────┬───────┘
                │
        YES ────┤──── NO
                │      │
                │      ▼
                │   ┌──────────────────────┐
                │   │ Query 2: Global      │
                │   │ template             │
                │   │ (shopifyProductId    │
                │   │  = 'GLOBAL')         │
                │   └──────┬───────────────┘
                │          │
                │   ┌──────▼───────┐
                │   │ Found?       │
                │   └──────┬───────┘
                │          │
                │   YES ───┤──── NO
                │          │      │
                ▼          ▼      ▼
         ┌──────────┐ ┌────────┐ ┌────────┐
         │ Use      │ │ Use    │ │ Empty  │
         │ Product  │ │ Global │ │ Canvas │
         │ Design   │ │ Templ. │ │        │
         └──────────┘ └────────┘ └────────┘

IMPORTANT: This matches Admin logic exactly!
Admin also gets latest design for product.
```

---

## File Structure

```
/www/wwwroot/custom.local/
│
├── backend/
│   ├── server.js                    ← Fixed endpoints
│   └── package.json                 ← Added test:regression script
│
└── doc/
    ├── test-realtime-sync.js        ← Automated test suite ⭐
    ├── quick-test.sh                ← Quick test runner ⭐
    ├── .env.test.example            ← Test config template ⭐
    ├── TEST-README.md               ← User guide ⭐
    ├── realtime-sync-fix.md         ← Technical fix docs ⭐
    ├── regression-test-realtime-sync.md  ← Test specification ⭐
    ├── regression-testing-summary.md     ← Summary ⭐
    ├── test-flow-diagrams.md        ← This file ⭐
    └── developer-checklist.md       ← Checklist ⭐

⭐ = New files created
```

---

## Quick Reference Commands

```bash
# Setup (first time)
cd /www/wwwroot/custom.local/doc
cp .env.test.example .env.test
nano .env.test  # Edit credentials

# Run tests
./quick-test.sh

# Or with npm
cd /www/wwwroot/custom.local/backend
npm run test:regression

# With custom parameters
cd /www/wwwroot/custom.local/doc
./quick-test.sh your-shop.myshopify.com 123456

# Check backend
systemctl status imcst-backend.service

# View logs
journalctl -u imcst-backend.service -f

# Database check
psql $DATABASE_URL -c "SELECT * FROM \"SavedDesign\" ORDER BY \"updatedAt\" DESC LIMIT 5;"
```

---

## Success Indicators

✅ **Test passes when:**
- All 6 test cases return PASSED
- No console errors
- Response times < 1 second
- Cache invalidation works
- Admin and Public show same data

❌ **Test fails when:**
- Any assertion fails
- Backend not responding
- Auth token invalid
- Database query errors
- Cache not invalidating

---

**Legend:**
- ✓ = Success/Correct
- ✗ = Failure/Incorrect
- ⭐ = New file
- ❌ = Broken/Wrong
- ⚠️ = Warning
