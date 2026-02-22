# Printful Integration - Complete Implementation Guide

## Overview

The Printful integration is fully implemented and operational. This document provides a complete overview of all features, architecture, and usage instructions.

## Status: ✅ PRODUCTION READY

All features have been implemented, tested, and are working correctly:

- ✅ Connection Management
- ✅ Catalog Browsing with Pagination
- ✅ Product Import to Shopify
- ✅ Order Sync (Automatic)
- ✅ Database Storage
- ✅ CORS Resolution (S3 Upload)
- ✅ UI Integration in Settings

---

## Architecture

### Backend Components

#### 1. **PrintfulService** (`backend/services/printfulService.js`)
- Handles all Printful API v2 communication
- Methods:
  - `getStoreInfo()` - Validate API key
  - `getCatalogProducts()` - Fetch catalog with pagination
  - `getCatalogProduct(id)` - Get product details
  - `getCatalogVariants(id)` - Get product variants
  - `getProductTechniques(id)` - Get print areas
  - `getMockupTemplates(id)` - Get mockup images (v1 API)
  - `createOrder()` - Submit order to Printful
  - `getOrder(id)` - Get order status

#### 2. **Printful Routes** (`backend/routes/printful.routes.js`)
API endpoints:
- `GET /imcst_api/printful/status` - Connection status
- `POST /imcst_api/printful/connect` - Connect API key
- `DELETE /imcst_api/printful/disconnect` - Disconnect
- `GET /imcst_api/printful/catalog` - Browse catalog (paginated)
- `POST /imcst_api/printful/catalog/sync` - Manual catalog sync
- `GET /imcst_api/printful/catalog/:id` - Product details
- `GET /imcst_api/printful/catalog/:id/mockups` - Mockup templates
- `POST /imcst_api/printful/import` - Import product to Shopify
- `GET /imcst_api/printful/products` - List imported products
- `POST /imcst_api/printful/sync/:productId` - Re-sync pricing
- `DELETE /imcst_api/printful/products/:id` - Remove mapping
- `GET /imcst_api/printful/orders` - List Printful orders
- `GET /imcst_api/printful/orders/:orderId` - Order details
- `POST /imcst_api/printful/orders/sync/:orderId` - Manual order sync

#### 3. **Order Handler** (`backend/handlers/printfulOrderHandler.js`)
Webhook handlers:
- `handleOrderCreate()` - Process new orders
- `handleOrderUpdate()` - Handle order updates
- `handleOrderCancel()` - Handle cancellations

#### 4. **Database Models** (`backend/prisma/schema.prisma`)

**PrintfulConnection**
```prisma
model PrintfulConnection {
  id          String   @id @default(uuid())
  shop        String   @unique
  accessToken String
  storeId     String?
  connected   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**PrintfulCatalog**
```prisma
model PrintfulCatalog {
  id          Int      @id @default(autoincrement())
  productId   Int      @unique
  name        String
  type        String?
  brand       String?
  model       String?
  image       String?
  description String?
  catalogData Json
  syncedAt    DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**PrintfulProduct**
```prisma
model PrintfulProduct {
  id                String   @id @default(uuid())
  shop              String
  printfulProductId String
  printfulVariantId String?
  shopifyProductId  String?
  status            String   @default("synced")
  printArea         Json?
  mockupUrls        Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**PrintfulOrder**
```prisma
model PrintfulOrder {
  id              String   @id @default(uuid())
  shop            String
  shopifyOrderId  String
  printfulOrderId String?
  status          String   @default("pending")
  orderData       Json?
  errorMessage    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Frontend Components

#### 1. **Settings Page** (`frontend/src/pages/Settings.tsx`)
- Printful connection UI integrated
- Located under "Canvas Defaults" section
- Features:
  - Connection status badge
  - API key input (password field)
  - Connect/Disconnect buttons
  - Link to Printful dashboard
  - Link to browse catalog
  - Error/success banners

#### 2. **Printful Page** (`frontend/src/pages/PrintfulPage.tsx`)
Full-featured Printful management:
- Connection tab (now in Settings)
- Catalog tab with pagination
- Products tab (imported products)

#### 3. **Printful Components** (`frontend/src/components/printful/`)
- `ConnectionTab.tsx` - Connection management
- `CatalogTab.tsx` - Browse catalog with pagination
- `ProductsTab.tsx` - View imported products
- `ProductCard.tsx` - Product display card
- `ImportModal.tsx` - Import configuration modal

---

## Features

### 1. Connection Management

**Setup Process:**
1. Navigate to Settings page
2. Scroll to "Printful Integration" section
3. Click "Get your API key from Printful →"
4. Copy API key from Printful dashboard
5. Paste into "Printful API Key" field
6. Click "Connect Printful"

**Validation:**
- API key validated against Printful API
- Tries `/stores` endpoint first (requires store_management scope)
- Falls back to `/catalog-products` (public access)
- Stores connection in database

**Status Display:**
- Badge: "Connected" (green) or "Not Connected" (gray)
- Store ID shown when connected
- Last updated timestamp

### 2. Catalog Browsing

**Features:**
- Browse 71+ Printful products
- Pagination: 20 products per page
- Product cards show:
  - Product image
  - Name
  - Type (e.g., "T-Shirt")
  - Brand
  - Model
- "View Details" and "Import" buttons

**Auto-Sync:**
- Catalog stored in database
- Auto-syncs every 24 hours
- Background sync (non-blocking)
- Fetches 100 products per batch
- 500ms delay between batches (rate limit protection)

**Manual Sync:**
- "Sync Catalog" button
- Forces immediate refresh
- Shows sync progress

### 3. Product Import

**Import Process:**
1. Click "Import" on product card
2. Modal opens with:
   - Product details
   - Variant selection
   - Margin configuration (default: 50%)
   - Custom product title
3. Click "Import Product"
4. System creates:
   - Shopify product with variants
   - MerchantConfig for customization
   - PrintfulProduct mapping

**What Gets Created:**

**Shopify Product:**
- Title: Product name or custom title
- Description: From Printful
- Product Type: From Printful
- Vendor: "Printful"
- Tags: "printful", "customizable"
- Status: Active

**Variants:**
- All selected variants imported
- Price: Base price + margin
- SKU: Printful SKU
- Inventory: Continue selling when out of stock

**Images:**
- Mockup images downloaded from Printful CDN
- Uploaded to Linode S3 (CORS resolution)
- Set as product images in Shopify

**MerchantConfig:**
- Print area from Printful techniques
- Base image: Mockup URL (from S3)
- Canvas size: Default 1000x1000px
- Enabled tools: Text, Image, Shape, Clipart
- Designer layout: Redirect
- Button text: "Customize Your Design"

### 4. Order Sync (Automatic)

**Webhook Flow:**
```
Customer Places Order
        ↓
Shopify Webhook: ORDERS_CREATE
        ↓
Check if order contains Printful products
        ↓
Get customer's design (if exists)
        ↓
Format order for Printful API
        ↓
Submit to Printful
        ↓
Save PrintfulOrder record
        ↓
Update design status to "ordered"
```

**Order Data Sent to Printful:**
- Recipient information (name, address, email, phone)
- Line items with quantities and prices
- Design files (if available)
- Retail costs (subtotal, discount, shipping, tax)
- External ID (Shopify order ID)

**Order Status Tracking:**
- Stored in `PrintfulOrder` table
- Status: pending, processing, fulfilled, cancelled, failed
- Error messages saved for debugging
- Linked to Shopify order ID

**Webhook Handlers:**
- `ORDERS_CREATE` - New order processing
- `ORDERS_UPDATED` - Order status updates
- `ORDERS_CANCELLED` - Cancellation handling

**Auto-Registration:**
- Webhooks registered automatically after auth
- Configured in `backend/config/shopify.js`
- Uses `afterAuth` hook

### 5. CORS Resolution

**Problem:**
- Printful CDN images blocked by CORS policy
- Browser couldn't load images from `files.cdn.printful.com`

**Solution:**
- Download images from Printful CDN
- Upload to Linode S3 bucket
- Use S3 URLs (same origin)
- Implemented in `downloadAndUploadToS3()` function

**Benefits:**
- No CORS errors
- Faster loading (CDN)
- Images persist even if Printful changes URLs
- Full control over image hosting

### 6. Database Storage

**Catalog Caching:**
- Reduces API calls to Printful
- Faster catalog browsing
- 24-hour sync interval
- Stores full product data in JSON

**Tenant Isolation:**
- All models (except PrintfulCatalog) are shop-scoped
- Prisma middleware enforces isolation
- PrintfulCatalog excluded (global catalog)
- Added to skip list in `backend/config/database.js`

---

## API Reference

### Connection Endpoints

#### Check Status
```http
GET /imcst_api/printful/status
```

**Response:**
```json
{
  "connected": true,
  "storeId": "12345",
  "connectedAt": "2024-02-15T10:00:00Z",
  "lastUpdated": "2024-02-15T10:00:00Z"
}
```

#### Connect
```http
POST /imcst_api/printful/connect
Content-Type: application/json

{
  "accessToken": "your-printful-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Printful connected successfully",
  "storeId": "12345"
}
```

#### Disconnect
```http
DELETE /imcst_api/printful/disconnect
```

**Response:**
```json
{
  "success": true,
  "message": "Printful disconnected successfully"
}
```

### Catalog Endpoints

#### Browse Catalog
```http
GET /imcst_api/printful/catalog?limit=20&offset=0&search=shirt
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Unisex Heavy Cotton Tee",
      "type": "T-Shirt",
      "brand": "Gildan",
      "model": "5000",
      "image": "https://customfly.us-southeast-1.linodeobjects.com/...",
      "description": "..."
    }
  ],
  "paging": {
    "total": 71,
    "offset": 0,
    "limit": 20
  }
}
```

#### Product Details
```http
GET /imcst_api/printful/catalog/1
```

**Response:**
```json
{
  "product": { ... },
  "variants": [ ... ],
  "techniques": [ ... ]
}
```

#### Import Product
```http
POST /imcst_api/printful/import
Content-Type: application/json

{
  "printfulProductId": 1,
  "margin": 50,
  "productTitle": "Custom T-Shirt",
  "selectedVariants": [4011, 4012, 4013]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product imported successfully",
  "shopifyProductId": "8247026647074",
  "printfulProductId": "uuid",
  "designerUrl": "/designer/8247026647074",
  "product": {
    "id": "8247026647074",
    "title": "Custom T-Shirt",
    "variantCount": 3
  }
}
```

### Order Endpoints

#### List Orders
```http
GET /imcst_api/printful/orders
```

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "shop": "uploadfly-lab.myshopify.com",
      "shopifyOrderId": "5678",
      "printfulOrderId": "1234",
      "status": "pending",
      "createdAt": "2024-02-15T10:00:00Z"
    }
  ]
}
```

#### Manual Order Sync
```http
POST /imcst_api/printful/orders/sync/5678
```

**Response:**
```json
{
  "success": true,
  "message": "Order synced to Printful",
  "printfulOrderId": "1234"
}
```

---

## Configuration

### Environment Variables

**Backend** (`.env`):
```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_products,write_orders,read_customers
SHOPIFY_APP_URL=https://custom.duniasantri.com
DATABASE_URL=postgresql://...
```

### Printful API Key

**Required Scopes:**
- `catalog` - Browse products (public)
- `store_management` - Get store info (optional)
- `orders` - Create and manage orders

**Get API Key:**
1. Go to [Printful Dashboard](https://www.printful.com/dashboard/store)
2. Navigate to Settings → API
3. Create new Private Token
4. Copy token (starts with `pf_...`)
5. Paste in app Settings page

---

## Troubleshooting

### Connection Issues

**Error: "Invalid Printful API key"**
- Check API key is correct
- Ensure key has required scopes
- Try regenerating key in Printful dashboard

**Error: "Printful API: No response received"**
- Check internet connection
- Verify Printful API is not down
- Check firewall settings

### Import Issues

**Error: "Failed to create Shopify product"**
- Check Shopify API scopes include `write_products`
- Verify session is valid
- Check backend logs for details

**Error: "Failed to download/upload image"**
- Check S3 credentials are correct
- Verify Linode Object Storage is accessible
- Check image URL is valid

### Order Sync Issues

**Orders not syncing automatically**
- Verify webhooks are registered: Check Shopify Admin → Settings → Notifications
- Check webhook endpoint is accessible: `https://custom.duniasantri.com/api/webhooks`
- Review backend logs for webhook errors

**Error: "No shipping address found in order"**
- Ensure customer provided shipping address
- Check order data in Shopify Admin

---

## Best Practices

### 1. API Rate Limits
- Printful: 120 requests per minute
- Catalog sync uses 500ms delay between batches
- Avoid manual sync too frequently

### 2. Image Handling
- Always use S3 URLs (not Printful CDN)
- Images cached permanently in S3
- No CORS issues

### 3. Order Processing
- Designs should be saved before order
- Link designs to line items
- Check design status before fulfillment

### 4. Error Handling
- All errors logged to console
- Failed orders saved with error message
- Retry logic for transient failures

---

## Future Enhancements

### Planned Features
1. **Bulk Import** - Import multiple products at once
2. **Price Sync** - Auto-update prices when Printful changes
3. **Inventory Sync** - Track Printful stock levels
4. **Order Tracking** - Show fulfillment status in app
5. **Shipping Estimates** - Display shipping costs before order
6. **Multi-Store Support** - Connect multiple Printful stores
7. **Product Templates** - Save import configurations
8. **Analytics** - Track sales by Printful product

### Possible Integrations
- Printify (alternative POD service)
- Gooten (another POD service)
- Custom fulfillment providers

---

## Testing Checklist

### Connection
- [x] Connect with valid API key
- [x] Connect with invalid API key (error handling)
- [x] Disconnect
- [x] Status check after connect/disconnect

### Catalog
- [x] Browse catalog (pagination)
- [x] Search products
- [x] View product details
- [x] Manual sync
- [x] Auto-sync (24 hours)

### Import
- [x] Import single product
- [x] Import with custom title
- [x] Import with margin
- [x] Import selected variants only
- [x] Import all variants
- [x] Mockup image upload to S3
- [x] MerchantConfig creation

### Orders
- [x] Automatic order sync on create
- [x] Manual order sync
- [x] Order with design
- [x] Order without design
- [x] Order cancellation
- [x] Error handling

### UI
- [x] Settings page integration
- [x] Connection status display
- [x] Error messages
- [x] Success messages
- [x] Loading states
- [x] Navigation

---

## Support

### Documentation
- [Printful API Docs](https://developers.printful.com/docs/)
- [Shopify API Docs](https://shopify.dev/docs/api)

### Logs
- Backend: `backend/out.log` and `backend/err.log`
- Frontend: Browser console
- Systemd: `sudo journalctl -u imcst-backend.service -f`

### Common Commands
```bash
# Restart backend
sudo systemctl restart imcst-backend.service

# View logs
sudo journalctl -u imcst-backend.service -f

# Check status
sudo systemctl status imcst-backend.service

# Rebuild frontend
cd frontend && npm run build
```

---

## Summary

The Printful integration is fully functional and production-ready. All major features have been implemented:

✅ **Connection Management** - Secure API key storage and validation
✅ **Catalog Browsing** - 71+ products with pagination and search
✅ **Product Import** - Automatic Shopify product creation with variants
✅ **Order Sync** - Automatic fulfillment via webhooks
✅ **Image Handling** - CORS-free S3 storage
✅ **Database Storage** - Efficient caching and tenant isolation
✅ **UI Integration** - Clean Settings page integration

The system is ready for production use and can handle the complete product lifecycle from browsing to fulfillment.
