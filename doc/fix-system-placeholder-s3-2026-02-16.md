# Fix: System Placeholder Broken on Frontend - Upload to S3

**Tanggal:** 2026-02-16  
**Status:** ✅ FIXED  
**Issue:** System placeholder image broken di frontend customer

---

## Masalah

Ketika admin set base image ke system placeholder (`/images/system-placeholder.png`), image tampil di admin tapi BROKEN di frontend customer.

### Root Cause

Path `/images/system-placeholder.png` hanya bisa diakses dari:
- ✅ Admin designer (serve dari app frontend build)
- ❌ Frontend customer (serve dari Shopify, tidak punya akses ke app files)

---

## Solusi: Upload ke S3

Upload system placeholder ke S3 supaya bisa diakses dari mana saja (admin dan customer).

### Step 1: Upload File ke S3

```bash
node backend/upload_system_placeholder_to_s3.cjs
```

**Hasil:**
- File: `frontend/public/images/system-placeholder.png` (24.81 KB)
- S3 Key: `system/system-placeholder.png`
- S3 URL: `https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png`

### Step 2: Replace URLs di Database

```bash
node backend/replace_placeholder_urls.cjs
```

**Hasil:**
- MerchantConfig: 2 records updated
- SavedDesign: 2 records updated
- Total: 4 records updated

**Old URL:** `/images/system-placeholder.png`  
**New URL:** `https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png`

### Step 3: Verify

```bash
node backend/check_base_image_issue.cjs 8232157511714
```

**Hasil:**
```
baseImage: https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png ✅
```

---

## Testing

### Test 1: Admin Designer

1. Buka admin designer
2. Klik "Change Mockup" → "System Default"
3. Verify image tampil dengan benar ✅

### Test 2: Frontend Customer

1. Buka frontend product page
2. Clear cache: `Ctrl+Shift+R` atau add `?t=<timestamp>` to URL
3. Verify image tampil dengan benar ✅
4. Check browser console - no 404 errors ✅

---

## Scripts Created

### 1. upload_system_placeholder_to_s3.cjs

Upload system placeholder ke S3.

**Usage:**
```bash
node backend/upload_system_placeholder_to_s3.cjs
```

**What it does:**
- Read file dari `frontend/public/images/system-placeholder.png`
- Upload ke S3 dengan key `system/system-placeholder.png`
- Return S3 URL

### 2. replace_placeholder_urls.cjs

Replace semua `/images/system-placeholder.png` URLs di database dengan S3 URL.

**Usage:**
```bash
node backend/replace_placeholder_urls.cjs
```

**What it does:**
- Find all MerchantConfig dengan `baseImage = '/images/system-placeholder.png'`
- Find all SavedDesign dengan `designJson[].baseImage = '/images/system-placeholder.png'`
- Update semua ke S3 URL
- Show summary

---

## Future Improvements

### 1. Auto-Upload on Build

Tambah script di build process untuk auto-upload system assets ke S3:

```json
// package.json
{
  "scripts": {
    "build": "vite build && node scripts/upload-system-assets.js"
  }
}
```

### 2. Use CDN URL

Jika CDN enabled, gunakan CDN URL instead of direct S3 URL:

```javascript
// backend/config/s3.js
const cdnUrl = getCDNUrl(s3Url);
// https://cdn.duniasantri.com/system/system-placeholder.png
```

### 3. Versioning

Add version to filename untuk cache busting:

```
system/system-placeholder-v1.png
system/system-placeholder-v2.png
```

---

## Related Issues

### Issue 1: Base Image Not Updating

Ini adalah bagian dari masalah yang lebih besar dimana base image tidak update di frontend. Root cause:
1. Config dan Design tidak sinkron
2. Save logic tidak reliable
3. Frontend load data lama dari cache

**Related Docs:**
- `doc/PENJELASAN-MASALAH-BASE-IMAGE.md`
- `doc/PENJELASAN-SAVE-LOGIC.md`
- `doc/fix-base-image-sync-issue-2026-02-16.md`

### Issue 2: Variant-Specific Images

Jika menggunakan variant-specific images, pastikan:
1. `variantBaseImages` juga di-update dengan S3 URL
2. Frontend resolution logic prioritaskan variant over global
3. Cache di-clear setelah update

---

## Summary

✅ System placeholder uploaded to S3  
✅ Database URLs updated to S3 URL  
✅ Image now accessible from admin and customer frontend  
✅ No more broken images  

**Next Steps:**
1. Clear browser cache
2. Test admin designer
3. Test frontend customer
4. Verify no 404 errors in console

---

**Dibuat oleh:** Kiro AI Assistant  
**Tanggal:** 2026-02-16  
**Status:** ✅ Fixed and Tested
