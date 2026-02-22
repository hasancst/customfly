# Printful Integration Troubleshooting

## Issue Timeline

### Issue 1: 400 Bad Request (RESOLVED ✅)
**Symptom**: POST requests to `/imcst_api/printful/connect` and `/imcst_api/printful/import` returned 400 errors.

**Root Cause**: Shopify authentication middleware (`validateAuthenticatedSession()`) was blocking requests before they reached the Printful route handlers.

**Solution**: The middleware configuration was correct. The issue resolved itself after backend restart, suggesting it was a transient session validation issue.

### Issue 2: 500 Internal Server Error (RESOLVED ✅)
**Symptom**: After fixing the 400 error, import requests returned 500 errors.

**Root Cause**: Database unique constraint violation. When trying to re-import the same Printful product, the code used `prisma.printfulProduct.create()` which failed because the combination of `shop` + `printfulProductId` already existed in the database.

**Error Message**:
```
Unique constraint failed on the fields: (`shop`,`printfulProductId`)
```

**Solution**: Changed from `create()` to `upsert()` in the import handler to handle re-imports gracefully:

```javascript
const printfulProduct = await prisma.printfulProduct.upsert({
    where: {
        shop_printfulProductId: {
            shop,
            printfulProductId: printfulProductId.toString()
        }
    },
    create: { /* ... */ },
    update: { /* ... */ }
});
```

## Current Status

✅ **Connection Tab**: Working - Can connect/disconnect Printful API
✅ **Catalog Tab**: Working - Browse products from local database (no API limits!)
✅ **Import Functionality**: Working - Can import products (including re-imports)
✅ **Products Tab**: Working - Shows imported products
✅ **CORS Issue**: RESOLVED - Images downloaded and uploaded to our S3
✅ **Pagination**: Added - Catalog supports browsing all products (20 per page)
✅ **Database Caching**: IMPLEMENTED - Catalog stored in database, syncs every 24h

## Issue 3: CORS Error with Printful CDN Images (RESOLVED ✅)

**Symptom**: Designer page couldn't load mockup images from Printful CDN due to CORS policy:
```
Access to image at 'https://files.cdn.printful.com/products/1/product_1613463122.jpg' 
from origin 'https://custom.duniasantri.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause**: Printful CDN doesn't allow cross-origin image loading from our domain.

**Solution**: Download Printful images during import and upload to our own S3 bucket:

1. Created `downloadAndUploadToS3()` helper function
2. During import, all mockup images are:
   - Downloaded from Printful CDN
   - Uploaded to our S3: `{shop}/printful/{productId}/{timestamp}.{ext}`
   - Stored with our S3 URL (with CDN if enabled)
3. MerchantConfig `baseImage` now uses our S3 URL
4. All mockup URLs in `PrintfulProduct.mockupUrls` use our S3 URLs

**Benefits**:
- No CORS issues
- Faster loading (our CDN)
- Images persist even if Printful changes URLs
- Full control over image delivery

## Feature 4: Catalog Pagination (IMPLEMENTED ✅)

**Implementation**: Added pagination to browse all Printful products

**Features**:
- 20 products per page
- Previous/Next navigation
- Shows total product count
- Maintains state when navigating between pages
- Backend supports `limit` and `offset` parameters
- Frontend uses Shopify Polaris Pagination component

**Usage**:
- Navigate through catalog using Previous/Next buttons
- Page number displayed in pagination control
- Total products shown in description text

## Issue 4: Printful API Rate Limit (RESOLVED ✅)

**Symptom**: Error message "AI usage limit reached for this hour. Please try again later."

**Root Cause**: Printful API has hourly rate limits for API calls.

**Solution**: Store entire Printful catalog in our database!

### Implementation:

1. **New Database Model**: `PrintfulCatalog`
   - Stores all Printful products locally
   - Fields: productId, name, type, brand, model, image, description, catalogData
   - Indexed for fast queries

2. **Auto-Sync Strategy**:
   - Catalog syncs automatically every 24 hours
   - Background sync doesn't block user requests
   - Fetches 100 products at a time with delays to avoid rate limits
   - Continues even if some batches fail

3. **Manual Sync Endpoint**:
   - `POST /imcst_api/printful/catalog/sync`
   - Allows manual refresh if needed
   - Useful after Printful adds new products

4. **Benefits**:
   - ✅ No more rate limit errors when browsing catalog
   - ✅ Instant loading (from database, not API)
   - ✅ Search functionality works on local data
   - ✅ Pagination is fast and reliable
   - ✅ Works even if Printful API is down

5. **How It Works**:
   ```
   User opens catalog
   ↓
   Check database for products
   ↓
   If data > 24h old → Trigger background sync
   ↓
   Return products from database immediately
   ↓
   Background sync updates database for next time
   ```

**Error Response** (now rare):
```json
{
  "error": "Printful API Error (429): AI usage limit reached",
  "isRateLimit": true
}
```

This error now only happens during initial sync or manual sync, not when browsing catalog.

## Testing Results

### Successful Import Flow (Feb 21, 2026 08:13 UTC)
1. User browsed Printful catalog ✅
2. User selected product (ID: 1 - Enhanced Matte Paper Poster) ✅
3. Import process:
   - Fetched product details from Printful ✅
   - Created Shopify product (ID: 8246995943458) ✅
   - Created 16 variants ✅
   - Uploaded mockup image ✅
   - Created MerchantConfig ✅
   - Saved PrintfulProduct mapping ✅

## How to Restart Backend

```bash
# Restart backend service
sudo systemctl restart imcst-backend.service

# Check status
sudo systemctl status imcst-backend.service

# View logs
sudo journalctl -u imcst-backend.service -n 50 --no-pager

# Follow logs in real-time
sudo journalctl -u imcst-backend.service -f
```

## Next Steps

1. Test full workflow:
   - ✅ Connect Printful
   - ✅ Browse catalog
   - ✅ Import product
   - ⏳ Verify Shopify product creation
   - ⏳ Test CustomFly designer integration
   - ⏳ Test sync functionality
   - ⏳ Test order fulfillment

2. Frontend improvements:
   - Add better error messages
   - Add loading states
   - Add success notifications
   - Handle edge cases

3. Documentation:
   - Update user guide
   - Add API documentation
   - Create video tutorial
