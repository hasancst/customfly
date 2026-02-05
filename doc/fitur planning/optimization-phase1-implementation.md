# Phase 1 Optimization - Implementation Guide

## Overview

This document outlines the detailed implementation steps for Phase 1 optimization: Backend Modularization and Frontend Lazy Loading.

**Goal**: Reduce initial load time by 50%+ through code splitting and modularization.

---

## Backend Modularization

### Current State
- Single file: `backend/server.js` (2,585 lines)
- All routes, middleware, and config in one file
- Hard to maintain and test

### Target State
- Modular structure with separate files for routes, config, and middleware
- Main `server.js` reduced to ~150 lines
- Clear separation of concerns

---

## Step-by-Step Implementation

### 1. Create Directory Structure

```bash
backend/
├── config/
│   ├── database.js      # Prisma client singleton
│   ├── s3.js           # S3 client config
│   └── shopify.js      # Shopify app config
├── middleware/
│   ├── auth.js         # Authentication middleware
│   ├── proxy.js        # Shopify proxy verification
│   └── rateLimit.js    # Rate limiting config
├── routes/
│   ├── upload.routes.js    # S3 upload endpoints
│   ├── assets.routes.js    # Asset management
│   ├── products.routes.js  # Product API
│   ├── designs.routes.js   # Design save/load
│   └── webhooks.routes.js  # Shopify webhooks
└── server.js           # Main entry point (~150 lines)
```

### 2. Config Files

#### `config/database.js`
```javascript
import { PrismaClient } from "@prisma/client";

let prisma;

export function getPrismaClient() {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

export default getPrismaClient();
```

#### `config/s3.js`
```javascript
import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME;
export default s3Client;
```

#### `config/shopify.js`
```javascript
import { shopifyApp } from "@shopify/shopify-app-express";
import { restResources } from "@shopify/shopify-api/rest/admin/2026-01";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./database.js";

// Session storage with logging
const baseStorage = new PrismaSessionStorage(prisma);
const loggingStorage = {
    async storeSession(session) { /* ... */ },
    async loadSession(id) { /* ... */ },
    async deleteSession(id) { /* ... */ },
    async deleteSessions(ids) { /* ... */ },
    async findSessionsByShop(shop) { /* ... */ }
};

export const shopify = shopifyApp({
    api: {
        apiVersion: "2026-01",
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
        scopes: process.env.SCOPES?.split(",") || [],
        hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, "") || "",
        restResources,
    },
    auth: {
        path: "/api/auth",
        callbackPath: "/api/auth/callback",
    },
    webhooks: {
        path: "/api/webhooks",
    },
    sessionStorage: loggingStorage,
    isEmbeddedApp: true,
    useOnlineTokens: false,
    exitIframePath: "/exitiframe",
});
```

### 3. Middleware Files

#### `middleware/auth.js`
```javascript
export function validateShopParam(req, res, next) {
    const shop = req.query.shop;
    if (!shop || shop === 'undefined' || shop === 'null') {
        return res.status(400).json({
            error: "No shop provided",
            message: "Authentication requires a valid shop parameter."
        });
    }
    next();
}
```

#### `middleware/proxy.js`
```javascript
import crypto from "crypto";

export function verifyShopifyProxy(req, res, next) {
    const { signature, ...params } = req.query;
    
    if (!signature) {
        console.warn("[PROXY] Missing signature");
        return next();
    }
    
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('');
    
    const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(sortedParams)
        .digest('hex');
    
    if (hash !== signature) {
        console.error("[PROXY] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
    }
    
    next();
}
```

#### `middleware/rateLimit.js`
```javascript
import rateLimit from "express-rate-limit";

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: "Too many uploads, please try again later" }
});
```

### 4. Route Files

#### `routes/upload.routes.js`
Extract all upload-related routes:
- `POST /imcst_api/public/upload/image`
- `POST /imcst_api/public/upload/base64`

#### `routes/assets.routes.js`
Extract all asset-related routes:
- `GET /imcst_api/assets`
- `POST /imcst_api/assets`
- `PUT /imcst_api/assets/:id`
- `DELETE /imcst_api/assets/:id`

#### `routes/products.routes.js`
Extract all product-related routes:
- `GET /imcst_api/products`
- `GET /imcst_api/products/:id`
- `GET /imcst_api/configured-products`

#### `routes/designs.routes.js`
Extract all design-related routes:
- `POST /imcst_api/public/design`
- `GET /imcst_api/public/design/:id`
- `POST /imcst_api/design`
- `GET /imcst_api/designs`

#### `routes/webhooks.routes.js`
Extract webhook handling:
- `POST /api/webhooks`

### 5. Updated server.js Structure

```javascript
import "dotenv/config";
import express from "express";
import compression from "compression";
import { shopify } from "./config/shopify.js";
import { verifyShopifyProxy } from "./middleware/proxy.js";
import uploadRoutes from "./routes/upload.routes.js";
import assetsRoutes from "./routes/assets.routes.js";
import productsRoutes from "./routes/products.routes.js";
import designsRoutes from "./routes/designs.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Shopify auth routes
app.get(shopify.config.auth.path, validateShopParam, shopify.auth.begin());
app.get(shopify.config.auth.callbackPath, shopify.auth.callback(), shopify.redirectToShopifyOrAppRoot());

// Shopify proxy
app.use("/imcst_api/proxy", verifyShopifyProxy);

// API routes
app.use("/imcst_api", uploadRoutes);
app.use("/imcst_api", assetsRoutes);
app.use("/imcst_api", productsRoutes);
app.use("/imcst_api", designsRoutes);
app.use("/api", webhooksRoutes);

// Static files
app.use(express.static(STATIC_PATH));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

## Frontend Lazy Loading

### 1. Lazy Load Tool Components

**File**: `frontend/src/pages/Designer.tsx`

```typescript
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy tool components
const ImageTool = lazy(() => import('../components/ImageTool'));
const TextTool = lazy(() => import('../components/TextTool'));
const SwatchTool = lazy(() => import('../components/SwatchTool'));
const PricingTab = lazy(() => import('../components/PricingTab'));
const Summary = lazy(() => import('../components/Summary'));

// Loading fallback
const ToolLoader = () => (
    <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
    </div>
);

// Usage in component
<Suspense fallback={<ToolLoader />}>
    {selectedTool === 'image' && <ImageTool {...props} />}
    {selectedTool === 'text' && <TextTool {...props} />}
    {selectedTool === 'swatch' && <SwatchTool {...props} />}
</Suspense>
```

### 2. Dynamic Import Heavy Libraries

**File**: `frontend/src/components/DesignerCore.tsx`

```typescript
// Instead of importing at top
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';

// Use dynamic imports
const exportDesign = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).jsPDF;
    // ... export logic
};

const importPDF = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    // ... import logic
};
```

### 3. Route-based Code Splitting

**File**: `frontend/src/App.tsx`

```typescript
import { lazy, Suspense } from 'react';

const ProductsPage = lazy(() => import('./pages/Products'));
const AssetsPage = lazy(() => import('./pages/Assets'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const DesignerPage = lazy(() => import('./pages/Designer'));
const SettingsPage = lazy(() => import('./pages/Settings'));

<Routes>
    <Route path="/products" element={
        <Suspense fallback={<PageLoader />}>
            <ProductsPage />
        </Suspense>
    } />
    {/* ... other routes */}
</Routes>
```

### 4. Optimize Vite Config

**File**: `frontend/vite.config.ts`

```typescript
manualChunks: (id) => {
    // Core React (always loaded)
    if (id.includes('/node_modules/react/') ||
        id.includes('/node_modules/react-dom/')) {
        return 'vendor-react';
    }
    
    // Shopify admin libs (admin only)
    if (id.includes('@shopify/polaris') ||
        id.includes('@shopify/app-bridge')) {
        return 'vendor-admin';
    }
    
    // Heavy graphics libs (lazy loaded)
    if (id.includes('html2canvas')) return 'vendor-export';
    if (id.includes('jspdf')) return 'vendor-pdf';
    if (id.includes('pdfjs-dist')) return 'vendor-pdf-reader';
    
    // UI component libs
    if (id.includes('@radix-ui')) return 'vendor-ui';
    if (id.includes('lucide-react')) return 'vendor-icons';
    
    // Tool components (lazy loaded)
    if (id.includes('components/ImageTool')) return 'tool-image';
    if (id.includes('components/TextTool')) return 'tool-text';
    if (id.includes('components/SwatchTool')) return 'tool-swatch';
    if (id.includes('components/PricingTab')) return 'tool-pricing';
}
```

---

## Testing Checklist

### Backend
- [ ] Server starts without errors
- [ ] All routes respond correctly
- [ ] Authentication still works
- [ ] Uploads still work
- [ ] Webhooks still work
- [ ] No circular dependencies

### Frontend
- [ ] Initial page loads faster
- [ ] Tools load when selected
- [ ] Export functionality works
- [ ] PDF import works
- [ ] No console errors
- [ ] Bundle size reduced

### Performance
- [ ] Initial bundle < 1MB
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 2s
- [ ] Lighthouse score > 85

---

## Rollback Plan

If issues occur:
1. Keep original `server.js` as `server.js.backup`
2. Revert to backup: `mv server.js.backup server.js`
3. Restart server: `pm2 restart backend`

---

## Next Steps After Review

1. Review this plan
2. Approve or request changes
3. Create backup of current code
4. Implement changes incrementally
5. Test after each major change
6. Monitor performance metrics

---

## Estimated Impact

**Before:**
- Initial bundle: ~2.5MB
- Server file: 2,585 lines
- Load time: ~4s

**After:**
- Initial bundle: ~800KB (-68%)
- Server file: ~150 lines (-94%)
- Load time: ~1.5s (-62%)

**Benefits:**
- ✅ Faster initial load
- ✅ Better code organization
- ✅ Easier maintenance
- ✅ Better testability
- ✅ Improved developer experience
