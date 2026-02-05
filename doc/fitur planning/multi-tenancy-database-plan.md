# Multi-Tenancy Database Isolation Plan

## Overview

Rencana untuk memastikan setiap store (tenant) memiliki data yang terisolasi dengan baik di database, termasuk settings, products, sessions, designs, dan assets.

---

## Current State Analysis

### Existing Multi-Tenancy Implementation

Saat ini aplikasi sudah menggunakan **Row-Level Multi-Tenancy** dengan field `shop` sebagai tenant identifier:

```prisma
model Session {
  id          String   @id
  shop        String   // Tenant identifier
  state       String
  isOnline    Boolean  @default(false)
  scope       String?
  accessToken String
  // ...
}

model SavedDesign {
  id                String   @id @default(uuid())
  shop              String   // Tenant identifier
  shopifyProductId  String
  // ...
}

model MerchantConfig {
  id                String   @id @default(uuid())
  shop              String   // Tenant identifier
  shopifyProductId  String
  // ...
}
```

**Kelebihan**:
- ✅ Sederhana dan mudah diimplementasikan
- ✅ Efisien untuk jumlah tenant menengah
- ✅ Satu database untuk semua tenant

**Kekurangan**:
- ⚠️ Risiko data leak jika query tidak filter `shop`
- ⚠️ Performa menurun saat data besar
- ⚠️ Tidak ada physical isolation

---

## Proposed Enhancements

### 1. Database Schema Improvements

#### A. Add Composite Indexes for Performance

```prisma
model SavedDesign {
  id                String   @id @default(uuid())
  shop              String
  shopifyProductId  String
  // ... other fields
  
  @@index([shop, shopifyProductId])  // Composite index
  @@index([shop, updatedAt])         // For sorting
  @@index([shop, isTemplate])        // For template queries
}

model MerchantConfig {
  id                String   @id @default(uuid())
  shop              String
  shopifyProductId  String
  // ... other fields
  
  @@unique([shop, shopifyProductId])  // Ensure one config per product per shop
  @@index([shop])
}

model Asset {
  id          String   @id @default(uuid())
  shop        String
  type        String
  // ... other fields
  
  @@index([shop, type])
  @@index([shop, createdAt])
}
```

#### B. Add Shop Configuration Table

```prisma
model ShopConfig {
  id                  String   @id @default(uuid())
  shop                String   @unique  // One config per shop
  
  // Subscription & Limits
  plan                String   @default("free")  // free, basic, pro, enterprise
  maxProducts         Int      @default(10)
  maxAssets           Int      @default(100)
  maxDesigns          Int      @default(50)
  storageLimit        BigInt   @default(1073741824)  // 1GB in bytes
  
  // Feature Flags
  enableWebP          Boolean  @default(false)
  enableCDN           Boolean  @default(false)
  enableAdvancedTools Boolean  @default(false)
  
  // Branding
  customDomain        String?
  logoUrl             String?
  primaryColor        String?
  
  // Settings
  timezone            String   @default("UTC")
  currency            String   @default("USD")
  
  // Metadata
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  lastActiveAt        DateTime @default(now())
  
  @@index([shop])
  @@index([plan])
}
```

#### C. Add Usage Tracking Table

```prisma
model ShopUsage {
  id              String   @id @default(uuid())
  shop            String
  
  // Current Usage
  productCount    Int      @default(0)
  assetCount      Int      @default(0)
  designCount     Int      @default(0)
  storageUsed     BigInt   @default(0)  // bytes
  
  // Monthly Stats
  monthlyUploads  Int      @default(0)
  monthlyOrders   Int      @default(0)
  
  // Timestamps
  month           String   // YYYY-MM format
  updatedAt       DateTime @updatedAt
  
  @@unique([shop, month])
  @@index([shop])
}
```

#### D. Add Audit Log Table

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  shop        String
  
  // Event Details
  action      String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  resource    String   // design, asset, config, etc.
  resourceId  String?
  
  // User Info
  userId      String?
  userEmail   String?
  ipAddress   String?
  
  // Changes
  before      Json?
  after       Json?
  
  // Metadata
  createdAt   DateTime @default(now())
  
  @@index([shop, createdAt])
  @@index([shop, action])
  @@index([shop, resource])
}
```

---

### 2. Data Isolation Middleware

#### A. Automatic Shop Filter Middleware

```javascript
// backend/middleware/tenantIsolation.js

export function ensureTenantIsolation(req, res, next) {
    // Extract shop from various sources
    const shop = req.query.shop || 
                 req.body.shop || 
                 req.headers['x-shop-domain'] ||
                 req.session?.shop;
    
    if (!shop) {
        return res.status(400).json({ 
            error: 'Shop parameter required for tenant isolation' 
        });
    }
    
    // Attach to request for use in queries
    req.tenant = {
        shop,
        validated: true
    };
    
    next();
}

// Apply to all protected routes
app.use('/imcst_api/*', ensureTenantIsolation);
```

#### B. Prisma Query Extension for Auto-Filtering

```javascript
// backend/config/database.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient().$extends({
    query: {
        // Auto-inject shop filter for all queries
        $allModels: {
            async findMany({ args, query, model }) {
                // Get shop from context (set by middleware)
                const shop = global.currentShop;
                
                if (shop && !args.where?.shop) {
                    args.where = {
                        ...args.where,
                        shop
                    };
                }
                
                return query(args);
            },
            
            async findFirst({ args, query }) {
                const shop = global.currentShop;
                
                if (shop && !args.where?.shop) {
                    args.where = {
                        ...args.where,
                        shop
                    };
                }
                
                return query(args);
            }
        }
    }
});

export default prisma;
```

---

### 3. Session Management Improvements

#### A. Shop-Specific Session Storage

```javascript
// backend/config/shopify.js

const sessionStorage = {
    async storeSession(session) {
        await prisma.session.upsert({
            where: { id: session.id },
            create: {
                id: session.id,
                shop: session.shop,  // Tenant isolation
                state: session.state,
                isOnline: session.isOnline,
                scope: session.scope,
                accessToken: session.accessToken,
                expiresAt: session.expires
            },
            update: {
                state: session.state,
                accessToken: session.accessToken,
                expiresAt: session.expires
            }
        });
    },
    
    async loadSession(id) {
        const session = await prisma.session.findUnique({
            where: { id }
        });
        
        if (!session) return undefined;
        
        // Verify session belongs to correct shop
        if (global.currentShop && session.shop !== global.currentShop) {
            console.warn(`Session shop mismatch: ${session.shop} vs ${global.currentShop}`);
            return undefined;
        }
        
        return session;
    },
    
    async deleteSession(id) {
        await prisma.session.delete({
            where: { id }
        });
    },
    
    async deleteSessions(ids) {
        await prisma.session.deleteMany({
            where: { id: { in: ids } }
        });
    },
    
    async findSessionsByShop(shop) {
        return await prisma.session.findMany({
            where: { shop }  // Tenant-specific sessions
        });
    }
};
```

---

### 4. Product & Asset Isolation

#### A. Product Scoping

```javascript
// backend/routes/products.routes.js

// Get products for current shop only
app.get('/imcst_api/products', async (req, res) => {
    const { shop } = req.tenant;
    
    // Fetch from Shopify API for this shop
    const session = await loadSession(shop);
    const client = new shopify.api.clients.Rest({ session });
    
    const products = await client.get({
        path: 'products'
    });
    
    res.json(products.body.products);
});
```

#### B. Asset Scoping

```javascript
// backend/routes/assets.routes.js

// Get assets for current shop only
app.get('/imcst_api/assets', async (req, res) => {
    const { shop } = req.tenant;
    
    const assets = await prisma.asset.findMany({
        where: { shop },  // Automatic tenant filter
        orderBy: { createdAt: 'desc' }
    });
    
    res.json(assets);
});

// Create asset with shop isolation
app.post('/imcst_api/assets', async (req, res) => {
    const { shop } = req.tenant;
    
    // Check usage limits
    const usage = await checkShopUsage(shop);
    if (usage.assetCount >= usage.maxAssets) {
        return res.status(403).json({ 
            error: 'Asset limit reached for your plan' 
        });
    }
    
    const asset = await prisma.asset.create({
        data: {
            ...req.body,
            shop  // Force shop from tenant context
        }
    });
    
    // Update usage
    await incrementAssetCount(shop);
    
    res.json(asset);
});
```

---

### 5. Design & Config Isolation

#### A. Design Scoping

```javascript
// backend/routes/designs.routes.js

// Save design with shop isolation
app.post('/imcst_api/design', async (req, res) => {
    const { shop } = req.tenant;
    const { shopifyProductId, designJson, name } = req.body;
    
    // Check design limit
    const usage = await checkShopUsage(shop);
    if (usage.designCount >= usage.maxDesigns) {
        return res.status(403).json({ 
            error: 'Design limit reached for your plan' 
        });
    }
    
    const design = await prisma.savedDesign.create({
        data: {
            shop,  // Tenant isolation
            shopifyProductId,
            designJson,
            name,
            updatedAt: new Date()
        }
    });
    
    // Invalidate cache for this shop's product
    cache.del(`pub_prod_${shop}_${shopifyProductId}`);
    
    // Audit log
    await logAudit({
        shop,
        action: 'CREATE',
        resource: 'design',
        resourceId: design.id
    });
    
    res.json(design);
});
```

---

### 6. Storage & S3 Isolation

Already implemented via shop-based S3 organization:

```
s3-bucket/
├── shop1.myshopify.com/
│   ├── gallery/
│   ├── base-images/
│   └── ...
└── shop2.myshopify.com/
    ├── gallery/
    ├── base-images/
    └── ...
```

**Additional**: Track storage usage per shop

```javascript
// backend/utils/storage.js

export async function trackStorageUsage(shop, fileSize) {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    await prisma.shopUsage.upsert({
        where: {
            shop_month: {
                shop,
                month: currentMonth
            }
        },
        create: {
            shop,
            month: currentMonth,
            storageUsed: fileSize
        },
        update: {
            storageUsed: {
                increment: fileSize
            }
        }
    });
}
```

---

## Implementation Checklist

### Phase 1: Database Schema (Week 1)
- [ ] Add composite indexes to existing models
- [ ] Create `ShopConfig` table
- [ ] Create `ShopUsage` table
- [ ] Create `AuditLog` table
- [ ] Run migrations
- [ ] Seed initial shop configs for existing shops

### Phase 2: Middleware & Isolation (Week 2)
- [ ] Create tenant isolation middleware
- [ ] Implement Prisma query extensions
- [ ] Update session management
- [ ] Add shop validation to all routes
- [ ] Test data isolation

### Phase 3: Usage Tracking (Week 3)
- [ ] Implement usage tracking functions
- [ ] Add limit checks to create operations
- [ ] Create usage dashboard endpoint
- [ ] Add storage tracking to S3 uploads
- [ ] Test limit enforcement

### Phase 4: Audit Logging (Week 4)
- [ ] Implement audit log functions
- [ ] Add logging to critical operations
- [ ] Create audit log viewer endpoint
- [ ] Add log retention policy
- [ ] Test audit trail

### Phase 5: Testing & Verification (Week 5)
- [ ] Test multi-shop data isolation
- [ ] Verify no cross-shop data leaks
- [ ] Performance testing with indexes
- [ ] Load testing with multiple shops
- [ ] Security audit

---

## Security Considerations

### 1. Query Validation

```javascript
// Always validate shop parameter
function validateShopAccess(requestShop, sessionShop) {
    if (requestShop !== sessionShop) {
        throw new Error('Unauthorized shop access');
    }
}
```

### 2. Prevent Cross-Shop Access

```javascript
// Middleware to prevent shop spoofing
app.use('/imcst_api/*', (req, res, next) => {
    const requestShop = req.query.shop || req.body.shop;
    const sessionShop = req.session?.shop;
    
    if (requestShop && sessionShop && requestShop !== sessionShop) {
        return res.status(403).json({ 
            error: 'Cross-shop access denied' 
        });
    }
    
    next();
});
```

### 3. Data Export Isolation

```javascript
// Ensure exports only include shop's own data
app.get('/imcst_api/export', async (req, res) => {
    const { shop } = req.tenant;
    
    const data = {
        designs: await prisma.savedDesign.findMany({ where: { shop } }),
        assets: await prisma.asset.findMany({ where: { shop } }),
        configs: await prisma.merchantConfig.findMany({ where: { shop } })
    };
    
    res.json(data);
});
```

---

## Performance Optimizations

### 1. Database Indexes

```sql
-- Composite indexes for common queries
CREATE INDEX idx_saved_design_shop_product ON "SavedDesign"(shop, "shopifyProductId");
CREATE INDEX idx_saved_design_shop_updated ON "SavedDesign"(shop, "updatedAt" DESC);
CREATE INDEX idx_merchant_config_shop_product ON "MerchantConfig"(shop, "shopifyProductId");
CREATE INDEX idx_asset_shop_type ON "Asset"(shop, type);
CREATE INDEX idx_session_shop ON "Session"(shop);
```

### 2. Query Optimization

```javascript
// Use select to reduce data transfer
const designs = await prisma.savedDesign.findMany({
    where: { shop },
    select: {
        id: true,
        name: true,
        shopifyProductId: true,
        updatedAt: true
        // Don't fetch large designJson unless needed
    }
});
```

### 3. Caching Strategy

```javascript
// Cache shop config (rarely changes)
const getShopConfig = async (shop) => {
    const cacheKey = `shop_config_${shop}`;
    let config = cache.get(cacheKey);
    
    if (!config) {
        config = await prisma.shopConfig.findUnique({
            where: { shop }
        });
        cache.set(cacheKey, config, 3600); // 1 hour
    }
    
    return config;
};
```

---

## Monitoring & Alerts

### 1. Usage Alerts

```javascript
// Alert when shop approaches limits
async function checkUsageLimits(shop) {
    const config = await getShopConfig(shop);
    const usage = await getCurrentUsage(shop);
    
    const warnings = [];
    
    if (usage.assetCount >= config.maxAssets * 0.9) {
        warnings.push('Asset limit at 90%');
    }
    
    if (usage.storageUsed >= config.storageLimit * 0.9) {
        warnings.push('Storage limit at 90%');
    }
    
    if (warnings.length > 0) {
        await sendAlertEmail(shop, warnings);
    }
}
```

### 2. Performance Monitoring

```javascript
// Track query performance per shop
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const shop = req.tenant?.shop;
        
        if (shop && duration > 1000) {
            console.warn(`Slow query for ${shop}: ${duration}ms`);
        }
    });
    
    next();
});
```

---

## Migration Strategy

### 1. Existing Data

```javascript
// Migrate existing data to add shop configs
async function migrateShopConfigs() {
    const shops = await prisma.session.findMany({
        select: { shop: true },
        distinct: ['shop']
    });
    
    for (const { shop } of shops) {
        await prisma.shopConfig.upsert({
            where: { shop },
            create: {
                shop,
                plan: 'free',
                maxProducts: 10,
                maxAssets: 100,
                maxDesigns: 50
            },
            update: {}
        });
    }
}
```

### 2. Backward Compatibility

- Keep existing queries working
- Add new isolation gradually
- Test thoroughly before enforcing strict isolation

---

## Documentation

- [s3-shop.md](file:///www/wwwroot/custom.local/doc/s3-shop.md) - S3 isolation already implemented
- [realtime-sync-fix.md](file:///www/wwwroot/custom.local/doc/realtime-sync-fix.md) - Cache invalidation per shop
- Prisma schema documentation
- API endpoint documentation with shop parameter requirements
