# Fix: Base Image Not Updating - Config/Design Sync Issue (2026-02-16)

**Product ID:** 8232157511714  
**Shop:** uploadfly-lab.myshopify.com  
**Status:** ✅ FIXED  
**Date:** 2026-02-16

---

## Problem Summary

User reported that when updating base image in admin designer, the frontend doesn't show the updated image. The issue was caused by MerchantConfig and SavedDesign being out of sync.

## Root Cause

### Database State Before Fix

**MerchantConfig:**
- `baseImage`: `/images/system-placeholder.png` (placeholder)
- `updatedAt`: 2026-02-16 (TODAY)

**SavedDesign:**
- `baseImage`: `https://cdn.shopify.com/.../iphone_6_mask.png` (real image)
- `updatedAt`: 2026-02-15 (YESTERDAY)

### Why This Happened

1. User uploaded new image in admin designer
2. Design was saved successfully with new image ✅
3. Config was NOT synced with design ❌
4. Config retained placeholder image
5. Frontend prioritizes Design over Config (correct behavior)
6. But when Design is older than Config, frontend shows old image

### Why Config Had Placeholder

Possible causes:
1. AI action error (500 error in console) might have triggered config reset
2. Manual config update that didn't include baseImage
3. Race condition during save

## Solution Implemented

### 1. Created Troubleshooting Script

**File:** `backend/check_base_image_issue.cjs`

This script checks database state and diagnoses sync issues:

```bash
node backend/check_base_image_issue.cjs <productId>
```

Output:
- Shows Config baseImage vs Design baseImage
- Shows variant-specific images
- Identifies mismatches
- Provides recommendations

### 2. Created Sync Script

**File:** `backend/sync_config_with_design.cjs`

This script syncs Config with Design automatically:

```bash
node backend/sync_config_with_design.cjs <productId>
```

What it syncs:
- `baseImage`
- `baseImageScale`
- `variantBaseImages`
- `variantBaseScales`
- `baseImageProperties`
- `baseImageColor`
- `baseImageColorEnabled`
- `baseImageColorMode`
- `baseImageAsMask`
- `baseImageMaskInvert`

### 3. Applied Fix

Ran sync script for product 8232157511714:

```bash
node backend/sync_config_with_design.cjs 8232157511714
```

Result:
- ✅ Config baseImage updated to match Design
- ✅ baseImageProperties synced
- ✅ baseImageAsMask synced
- ✅ Config and Design now in sync

## Database State After Fix

**MerchantConfig:**
- `baseImage`: `https://cdn.shopify.com/.../iphone_6_mask.png` ✅
- `baseImageScale`: 100
- `updatedAt`: 2026-02-16T16:14:44.603Z

**SavedDesign:**
- `baseImage`: `https://cdn.shopify.com/.../iphone_6_mask.png` ✅
- `baseImageScale`: 100
- `updatedAt`: 2026-02-15T01:12:59.852Z

Both now have the same image! ✅

## User Instructions

### To See the Fix

1. **Clear browser cache:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or add `?t=1771258504480` to the URL

2. **Verify in frontend:**
   - Open the product customizer
   - Check that the correct base image is displayed
   - Image should be: `iphone_6_mask.png`

### If Issue Happens Again

1. **Check database state:**
   ```bash
   node backend/check_base_image_issue.cjs <productId>
   ```

2. **Sync Config with Design:**
   ```bash
   node backend/sync_config_with_design.cjs <productId>
   ```

3. **Clear cache:**
   - Add `?t=<timestamp>` to URL
   - Or wait 30 seconds for cache to expire

### When Updating Base Image in Admin

To prevent this issue:

1. Upload new image via "Change Mockup" → "Manual Upload"
2. Click "Save Design" → "This Product Only"
3. Wait for success message
4. Check console for any errors
5. If no errors, frontend should update within 30 seconds

## Prevention

### Long-term Fix Needed

The root cause (Config not syncing with Design) needs investigation:

1. **Check AI actions:**
   - AI action `a4d68063-b52c-4d7b-8ff0-99f31b0afd5c` returned 500 error
   - This might be resetting config
   - Need to investigate AI action logs

2. **Improve save logic:**
   - Ensure Config always syncs with Design on save
   - Add validation to prevent baseImage from being reset to placeholder
   - Add logging to track when Config gets out of sync

3. **Add monitoring:**
   - Alert when Config and Design are out of sync
   - Log all config updates with source (admin save, AI action, etc.)

## Related Files

### Scripts Created
- `backend/check_base_image_issue.cjs` - Troubleshooting script
- `backend/sync_config_with_design.cjs` - Sync script

### Documentation
- `doc/base-image-not-updating-diagnosis-2026-02-16.md` - Diagnosis
- `doc/fix-base-image-sync-issue-2026-02-16.md` - This file

### Related Previous Fixes
- `doc/troubleshoot-base-image-not-updating-frontend-2026-02-12.md`
- `doc/fix-variant-base-image-priority-2026-02-12.md`
- `doc/fix-base-image-display-consistency-2026-02-12.md`
- `doc/fix-shared-cache-2026-02-16.md`

## Testing

### Test Case 1: Verify Fix

1. Open frontend: `https://uploadfly-lab.myshopify.com/products/...`
2. Add `?t=1771258504480` to URL to bypass cache
3. Verify base image shows `iphone_6_mask.png`
4. ✅ PASS if correct image is displayed

### Test Case 2: Update Image

1. Open admin: `https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/8232157511714`
2. Upload new image via "Change Mockup"
3. Save design
4. Run: `node backend/check_base_image_issue.cjs 8232157511714`
5. Verify Config and Design have same image
6. ✅ PASS if both are in sync

### Test Case 3: Sync Script

1. Manually set Config baseImage to placeholder:
   ```sql
   UPDATE MerchantConfig 
   SET baseImage = '/images/system-placeholder.png' 
   WHERE shop = 'uploadfly-lab.myshopify.com' 
   AND shopifyProductId = '8232157511714';
   ```
2. Run: `node backend/sync_config_with_design.cjs 8232157511714`
3. Verify Config is synced with Design
4. ✅ PASS if sync successful

## Summary

- ✅ Issue diagnosed: Config and Design out of sync
- ✅ Scripts created for troubleshooting and fixing
- ✅ Fix applied to product 8232157511714
- ✅ Config and Design now in sync
- ⏳ User needs to clear browser cache to see fix
- ⏳ Long-term prevention needed (investigate AI actions)

---

**Created by:** Kiro AI Assistant  
**Date:** 2026-02-16  
**Status:** ✅ Fixed - Awaiting user verification
