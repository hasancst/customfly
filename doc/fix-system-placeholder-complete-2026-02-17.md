# Fix System Placeholder - Complete Solution (2026-02-17)

## Problem
System placeholder image (`/images/system-placeholder.png`) was only accessible from admin frontend, causing 404 errors on customer storefront. Additionally, database kept reverting to local path because not all frontend files were updated.

## Root Cause
1. Local path `/images/system-placeholder.png` only works in admin app context
2. Customer storefront (Shopify) cannot access local paths
3. Multiple frontend files still had hardcoded local paths
4. When admin saves, hardcoded paths were being written back to database

## Solution Implemented

### 1. Upload to S3
```bash
node backend/upload_system_placeholder_to_s3.cjs
```
- Uploaded to: `https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png`
- Publicly accessible from anywhere

### 2. Create Constants File
Created `frontend/src/constants/images.ts`:
```typescript
export const SYSTEM_PLACEHOLDER_URL = 'https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png';
export const LEGACY_PLACEHOLDER_PATH = '/images/system-placeholder.png';
```

### 3. Update ALL Frontend Files
Updated the following files to use constants:

#### Files Updated:
1. **frontend/src/components/BaseImageModal.tsx**
   - Import: `SYSTEM_PLACEHOLDER_URL, LEGACY_PLACEHOLDER_PATH`
   - Changed `onClick` handler to use `SYSTEM_PLACEHOLDER_URL`
   - Changed `<img src>` to use `SYSTEM_PLACEHOLDER_URL`
   - Updated comparison logic to check both old and new URLs

2. **frontend/src/components/Summary.tsx**
   - Import: `SYSTEM_PLACEHOLDER_URL, LEGACY_PLACEHOLDER_PATH`
   - Replaced `const systemPlaceholder = '/images/system-placeholder.png'`
   - Updated comparison to check both paths

3. **frontend/src/pages/GlobalSettingsDesigner.tsx**
   - Import: `SYSTEM_PLACEHOLDER_URL, LEGACY_PLACEHOLDER_PATH`
   - Changed `DUMMY_PRODUCT.variants[0].image` to use `SYSTEM_PLACEHOLDER_URL`
   - Changed `DUMMY_PRODUCT.images` to use `SYSTEM_PLACEHOLDER_URL`
   - Changed `DUMMY_BASE_IMAGE` to use `SYSTEM_PLACEHOLDER_URL`

4. **frontend/src/components/DesignerCore.tsx** (already updated)
   - Uses `SYSTEM_PLACEHOLDER_URL` for fallback

5. **frontend/src/components/DesignerOpenCore.tsx** (already updated)
   - Uses `SYSTEM_PLACEHOLDER_URL` for fallback

6. **frontend/src/pages/DirectProductDesigner.tsx** (already updated)
   - Uses `SYSTEM_PLACEHOLDER_URL` for fallback

### 4. Database Migration
```bash
node backend/replace_placeholder_urls.cjs
```
Results:
- MerchantConfig: 1 record updated
- SavedDesign: 1 record updated
- Total: 2 records updated

### 5. Rebuild & Restart
```bash
cd frontend && npm run build
sudo systemctl restart imcst-backend.service
```

## Verification

### Database Check
```bash
node backend/check_base_image_issue.cjs 8232157511714
```

Results:
- ✅ Config baseImage: `https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png`
- ✅ Design baseImage: `https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png`
- ✅ All variant images properly set

### Frontend Check
1. Admin designer: Image loads correctly
2. Customer storefront: Image loads correctly (no 404)
3. Browser console: No errors

## Files Modified

### Frontend
- `frontend/src/constants/images.ts` (created)
- `frontend/src/components/BaseImageModal.tsx`
- `frontend/src/components/Summary.tsx`
- `frontend/src/pages/GlobalSettingsDesigner.tsx`
- `frontend/src/components/DesignerCore.tsx` (already done)
- `frontend/src/components/DesignerOpenCore.tsx` (already done)
- `frontend/src/pages/DirectProductDesigner.tsx` (already done)

### Backend Scripts
- `backend/upload_system_placeholder_to_s3.cjs` (created)
- `backend/replace_placeholder_urls.cjs` (created)

### Documentation
- `doc/fix-system-placeholder-s3-2026-02-16.md` (initial)
- `doc/fix-system-placeholder-complete-2026-02-17.md` (this file)

## Key Learnings

1. **Centralize Constants**: Using a constants file prevents hardcoded paths scattered across codebase
2. **Complete Updates**: Must update ALL files that reference the path, not just some
3. **Backward Compatibility**: Keep legacy path constant for comparison logic
4. **Database Migration**: After code changes, must migrate existing database records
5. **S3 for Public Assets**: System assets that need to be accessible from storefront must be on S3

## Testing Checklist

- [x] Admin designer loads system placeholder correctly
- [x] Customer storefront loads system placeholder correctly
- [x] No 404 errors in browser console
- [x] Database has S3 URL (not local path)
- [x] Saving from admin preserves S3 URL
- [x] All variants work correctly
- [x] BaseImageModal shows correct preview
- [x] Summary panel shows correct preview

## Status
✅ COMPLETE - All files updated, database migrated, system working correctly
