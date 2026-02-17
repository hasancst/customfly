# Diagnosis: Base Image Not Updating in Frontend (2026-02-16)

**Product ID:** 8232157511714  
**Shop:** uploadfly-lab.myshopify.com  
**Status:** 🔍 DIAGNOSED  

---

## Problem Summary

User reports that when updating base image in admin designer, the frontend doesn't show the updated image.

## Error from Console

```
shop=uploadfly-lab.myshopify.com 
Objectcustom.duniasantri.com/imcst_api/actions/a4d68063-b52c-4d7b-8ff0-99f31b0afd5c/execute?shop=uploadfly-lab.myshopify.com:1  
Failed to load resource: the server responded with a status of 500 ()

Understand this erroradmin-DTwUo-3C.js?v=1771257502844:7 
[AUTH] Response from /imcst_api/actions/a4d68063-b52c-4d7b-8ff0-99f31b0afd5c/execute?shop=uploadfly-lab.myshopify.com: Object

admin-DTwUo-3C.js?v=1771257502844:52 
Execution error: Error: Failed to execute action
at U (admin-DTwUo-3C.js?v=1771257502844:52:29662)
```

This is an AI action execution error, NOT a designer save error.

## Database Analysis

Running `node backend/check_base_image_issue.cjs 8232157511714`:

### MerchantConfig
```
baseImage: /images/system-placeholder.png
baseImageScale: 100
variantBaseImages: null
variantBaseScales: null
updatedAt: 2026-02-16T16:08:38.694Z (TODAY)
```

### SavedDesign (Template)
```
id: 7925fc6a-f419-4ee5-a49e-313e6a8b5bbe
name: Untitled Design
updatedAt: 2026-02-15T01:12:59.852Z (YESTERDAY)
designJson[0].baseImage: https://cdn.shopify.com/s/files/1/0748/1724/1122/files/iphone_6_mask.png?v=1770767994
designJson[0].baseImageScale: 100
```

## Root Cause Analysis

### Issue 1: Config vs Design Mismatch
- **Config** has placeholder image (updated TODAY)
- **Design** has real image (updated YESTERDAY)
- Frontend prioritizes Design over Config (correct behavior per fix-variant-base-image-priority-2026-02-12.md)
- **Result:** Frontend shows the YESTERDAY image, not TODAY's update

### Issue 2: Save Logic Not Syncing
Looking at `Designer.tsx` line 207-209:
```typescript
baseImage: data.designJson[0]?.baseImage || data.config.baseImage,
baseImageProperties: data.designJson[0]?.baseImageProperties || data.config.baseImageProperties
// ❌ variantBaseImages NOT synced!
```

The save logic syncs `baseImage` from designJson to config, but:
1. If user uploads new image, it updates `pages` state (which becomes `designJson`)
2. Save syncs `designJson[0].baseImage` to config ✅
3. BUT if config save fails or returns placeholder, design still has old image
4. Next load: Frontend gets Design (old) + Config (placeholder) = Shows old image

### Issue 3: Possible Race Condition
- User uploads image → Updates `pages` state
- User clicks Save → Saves Design + Config
- Design save succeeds with new image ✅
- Config save might fail or get overwritten with placeholder ❌
- Result: Design has new image, Config has placeholder

## Why Frontend Shows Old Image

Based on `DesignerOpenCore.tsx` resolution logic:

```typescript
// 1. Check activePage.variantBaseImages (from design)
// 2. Check initialConfig.variantBaseImages (from config)
// 3. Check activePage.baseImage (from design) ← USED HERE
// 4. Check initialConfig.baseImage (from config)
// 5. System placeholder
```

Frontend uses `activePage.baseImage` from Design, which has the YESTERDAY image.

## Why Config Has Placeholder

Possible reasons:
1. **AI Action Overwrote It:** The 500 error from AI action might have triggered a config save that reset baseImage to placeholder
2. **Manual Reset:** Someone manually reset the config
3. **Save Logic Bug:** Config save logic might be resetting baseImage under certain conditions

Looking at `products.routes.js` line 97-99:
```javascript
const cacheKey = `pub_prod_${shop}_${productId}`;
cache.del(cacheKey);
```

Cache is cleared correctly. But the config data itself might be wrong.

## Solution

### Immediate Fix: Re-save from Admin

User needs to:
1. Open admin designer: https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/8232157511714
2. Upload the correct base image via "Change Mockup" → "Manual Upload"
3. Click "Save Design" → "This Product Only"
4. Verify in console that both Design and Config are saved with correct image

### Long-term Fix: Investigate AI Action

The 500 error from AI action needs investigation:
- Action ID: `a4d68063-b52c-4d7b-8ff0-99f31b0afd5c`
- This might be an AI action that modifies config
- Need to check if AI actions are accidentally resetting baseImage

### Verification Steps

After re-save:
1. Run: `node backend/check_base_image_issue.cjs 8232157511714`
2. Verify both Config and Design have same baseImage
3. Clear browser cache: Ctrl+Shift+R
4. Or add `?t=1771258369858` to frontend URL
5. Verify frontend shows correct image

## Related Documentation

- `doc/troubleshoot-base-image-not-updating-frontend-2026-02-12.md` - Troubleshooting guide
- `doc/fix-variant-base-image-priority-2026-02-12.md` - Priority logic fix
- `doc/fix-base-image-display-consistency-2026-02-12.md` - Explicit selection system
- `doc/fix-shared-cache-2026-02-16.md` - Cache clearing fix

## Next Steps

1. ✅ Diagnosis complete - Config has placeholder, Design has old image
2. ⏳ User needs to re-save from admin with correct image
3. ⏳ Investigate AI action 500 error to prevent future overwrites
4. ⏳ Consider adding validation to prevent baseImage from being reset to placeholder

---

**Created:** 2026-02-16  
**Status:** Diagnosed - Awaiting user re-save
