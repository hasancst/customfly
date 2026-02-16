# Fix: Shared Cache for All AI Updates

**Date**: 2026-02-16  
**Status**: ✅ Complete  
**Related**: Task 6 - AssetDetail auto-reload issue

## Problem

When AI executed UPDATE_ASSET or other update actions:
- Backend updated the database successfully
- But frontend showed stale/cached data
- User had to wait 30 seconds (cache TTL) or manually refresh to see changes
- Root cause: Multiple separate cache instances across different files

### Cache Instance Problem

Each file created its own `NodeCache` instance:
- `backend/routes/assets.routes.js` - Own cache instance
- `backend/services/ai/executors/assetExecutor.js` - Own cache instance  
- `backend/routes/products.routes.js` - Own cache instance
- Other routes and executors - Own cache instances

When AI executor cleared "its" cache, it didn't affect the route's cache, so API still returned stale data.

## Solution

Created a shared cache module that all files import:

### 1. Created Shared Cache Module

**File**: `backend/config/cache.js`

```javascript
import NodeCache from 'node-cache';

// Shared cache instance for assets and products
// Reduced TTL to 30 seconds for faster updates in production
const cache = new NodeCache({ stdTTL: 30, checkperiod: 10 });

export default cache;
```

### 2. Updated All Files to Use Shared Cache

**Routes updated:**
- `backend/routes/assets.routes.js` - Import shared cache
- `backend/routes/products.routes.js` - Import shared cache

**Executors updated:**
- `backend/services/ai/executors/assetExecutor.js` - Import shared cache, clear on create/update/delete
- `backend/services/ai/executors/productExecutor.js` - Import shared cache, clear on addElement/removeElement
- `backend/services/ai/executors/configExecutor.js` - Import shared cache, clear on applyChanges
- `backend/services/ai/executors/designExecutor.js` - Import shared cache, clear on addSide/removeSide

### 3. Cache Clearing Strategy

Each executor now clears relevant cache keys after updates:

**Asset operations:**
```javascript
cache.del(`assets_${shop}_all`);
cache.del(`assets_${shop}_${type}`); // type: font, color, gallery, option, shape
```

**Product operations:**
```javascript
cache.del(`product_${shopId}_${productId}`);
cache.del(`pub_prod_${shopId}_${productId}`);
cache.del(`assets_${shopId}_all`); // When creating option assets
cache.del(`assets_${shopId}_option`);
```

## Files Modified

1. `backend/config/cache.js` - NEW: Shared cache module
2. `backend/routes/assets.routes.js` - Use shared cache
3. `backend/routes/products.routes.js` - Use shared cache
4. `backend/services/ai/executors/assetExecutor.js` - Use shared cache (already had clearing logic)
5. `backend/services/ai/executors/productExecutor.js` - Use shared cache + add clearing
6. `backend/services/ai/executors/configExecutor.js` - Use shared cache + add clearing
7. `backend/services/ai/executors/designExecutor.js` - Use shared cache + add clearing

## Testing

1. Use AI to update a color palette
2. Verify AssetDetail page refreshes immediately (no 30-second wait)
3. Use AI to add element to product
4. Verify product config updates immediately
5. Use AI to add side to design
6. Verify design updates immediately

## Benefits

- Immediate cache invalidation across all AI operations
- Consistent cache behavior throughout the application
- Single source of truth for cache configuration
- Easier to debug cache issues
- Better user experience (no waiting for cache expiry)

## Related Issues Fixed

- AssetDetail showing empty after AI UPDATE_ASSET (Task 6)
- Product config not updating after AI ADD_ELEMENT
- Design not refreshing after AI ADD_SIDE
- Any other AI operation that modifies data

## Backend Restart

Backend restarted successfully at 02:21 UTC.

## Notes

- Cache TTL remains 30 seconds as fallback
- But explicit cache clearing ensures immediate updates
- BulkExecutor uses configExecutor, so it inherits cache clearing
- Rate limit cache (`backend/middleware/aiRateLimit.js`) kept separate (different TTL and purpose)
- Public routes cache (`backend/routes/public.routes.js`) kept separate (different TTL)
- Designs routes cache (`backend/routes/designs.routes.js`) doesn't use cache currently
