# Fix: Variant Base Image Tidak Tampil di Frontend - Priority Logic

**Tanggal:** 12 Februari 2026  
**Status:** ✅ SELESAI  
**Severity:** HIGH - Variant-specific base image tidak tampil

---

## Ringkasan Masalah

Setelah upload base image baru untuk variant tertentu (Black) dan save design, frontend customer masih menampilkan base image lama (kaos pink) alih-alih base image baru (front-mask.png) yang di-upload.

### Alur yang Terjadi:
1. Admin upload base image baru via "Change Mockup" → "Manual Upload"
2. Admin assign image ke **variant Black** (ID: 44782851457058)
3. Admin save design → Success
4. Frontend customer pilih variant Black
5. Frontend masih tampil image lama (kaos pink) ❌
6. Seharusnya tampil image baru (front-mask.png) ✅

## Root Cause

### Masalah di Logic Resolusi Base Image

Di `DesignerOpenCore.tsx`, fungsi `resolvedBaseImage` menggunakan prioritas yang salah:

```typescript
// ❌ KODE LAMA (SALAH)
const resolvedBaseImage = useMemo(() => {
    // ...
    
    // 1. Cek initialConfig.variantBaseImages (dari config database)
    const variantSelection = initialConfig?.variantBaseImages?.[rawSelectedId];
    if (variantSelection) {
        // Gunakan ini
    }
    
    // 2. Cek activePage.baseImage (global)
    // ...
}, []);
```

**Masalahnya:**
- `initialConfig.variantBaseImages` berisi `null` (config database tidak ter-update)
- `activePage.variantBaseImages` berisi URL baru (dari design/template yang baru di-save)
- Logic mengecek config dulu, menemukan `null`, lalu fallback ke global baseImage (kaos pink)

### Data yang Ditemukan dari Log:

```javascript
activePage.variantBaseImages: {
  44782851457058: 'https://customfly.us-southeast-1.linodeobjects.com/.../front-mask.png'  // ✅ URL BARU
}

initialConfig.variantBaseImages: {
  44782851457058: null,  // ❌ NULL dari config database
  44782851489826: null,
  44782851522594: null
}

selectedVariantId: "44782851457058"  // ✅ Variant Black dipilih

resolvedBaseImage: "https://cdn.shopify.com/s/files/1/0748/1724/1122/files/pink.png?v=1769648292"  // ❌ URL LAMA
```

## Solusi yang Diimplementasikan

### 1. Update Priority Logic

Ubah prioritas resolusi base image untuk cek `activePage.variantBaseImages` DULU sebelum `initialConfig.variantBaseImages`:

```typescript
// ✅ KODE BARU (BENAR)
const resolvedBaseImage = useMemo(() => {
    const activePage = pages.find(p => p.id === activePageId);
    const rawSelectedId = String(selectedVariantId || '');
    const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

    console.log('[DesignerOpenCore] Base Image Resolution:', {
        selectedVariantId,
        rawSelectedId,
        vKey,
        'activePage.variantBaseImages': activePage?.variantBaseImages,
        'initialConfig.variantBaseImages': initialConfig?.variantBaseImages,
        'activePage.baseImage': activePage?.baseImage,
        'initialConfig.baseImage': initialConfig?.baseImage,
    });

    // 1. ✅ CEK ACTIVEPAGE.VARIANTBASEIMAGES DULU (dari design/template)
    const pageVariantSelection = activePage?.variantBaseImages?.[rawSelectedId] || 
                                  activePage?.variantBaseImages?.[vKey];
    if (pageVariantSelection) {
        const normalized = normalizeBaseImage(pageVariantSelection);
        if (normalized?.url) {
            const processed = processUrl(normalized.url);
            if (processed && !isPlaceholder(processed)) {
                console.log('[DesignerOpenCore] Using page variant-specific selection:', normalized.source, processed);
                return processed;  // ✅ RETURN URL BARU
            }
        }
    }

    // 2. Baru cek initialConfig.variantBaseImages (dari config database)
    const variantSelection = initialConfig?.variantBaseImages?.[rawSelectedId] || 
                             initialConfig?.variantBaseImages?.[vKey];
    if (variantSelection) {
        const normalized = normalizeBaseImage(variantSelection);
        if (normalized?.url) {
            const processed = processUrl(normalized.url);
            if (processed && !isPlaceholder(processed)) {
                console.log('[DesignerOpenCore] Using config variant-specific selection:', normalized.source, processed);
                return processed;
            }
        }
    }

    // 3. Fallback ke global baseImage
    // ...
}, [pages, activePageId, selectedVariantId, initialConfig]);
```

### 2. Tambah Logging untuk Debugging

Tambahkan log untuk melihat data `variantBaseImages`:

```typescript
console.log('[DesignerOpenCore] Base Image Color Debug:', {
    'currentPages.baseImageColor': activePage?.baseImageColor,
    'currentPages.baseImageColorEnabled': activePage?.baseImageColorEnabled,
    'currentPages.baseImageColorMode': activePage?.baseImageColorMode,
    'initialConfig.baseImageColor': initialConfig?.baseImageColor,
    'initialConfig.baseImageColorEnabled': initialConfig?.baseImageColorEnabled,
    'initialConfig.baseImageColorMode': initialConfig?.baseImageColorMode,
    'initialConfig.variantBaseImages': initialConfig?.variantBaseImages,  // ✅ ADDED
    'activePage.variantBaseImages': activePage?.variantBaseImages,        // ✅ ADDED
    'selectedVariantId': selectedVariantId,                               // ✅ ADDED
    'resolvedBaseImage': resolvedBaseImage,
    'resolvedBaseScale': resolvedBaseScale
});
```

## Alur Setelah Perbaikan

### 1. Admin Upload & Save

```
1. Admin buka Mockup Manager
2. Pilih variant "Black" di sidebar kiri
3. Upload image baru via "Manual Upload"
4. Image di-assign ke variant Black (ID: 44782851457058)
5. Klik "Save Design" → "This Product Only"
6. Data tersimpan:
   - SavedDesign.designJson[0].variantBaseImages['44782851457058'] = URL_BARU ✅
   - MerchantConfig.variantBaseImages['44782851457058'] = null (tidak ter-update)
```

### 2. Frontend Load Data

```
1. Frontend fetch data dari /imcst_public_api/product/:shop/:productId
2. Backend merge design + config:
   - design[0].variantBaseImages['44782851457058'] = URL_BARU ✅
   - config.variantBaseImages['44782851457058'] = null
3. Frontend terima:
   - initialConfig.variantBaseImages['44782851457058'] = null
   - initialPages[0].variantBaseImages['44782851457058'] = URL_BARU ✅
4. DesignerOpenCore init:
   - pages = initialPages (berisi URL_BARU) ✅
   - activePage.variantBaseImages['44782851457058'] = URL_BARU ✅
```

### 3. Resolusi Base Image

```
1. Customer pilih variant Black (ID: 44782851457058)
2. resolvedBaseImage logic:
   a. Cek activePage.variantBaseImages['44782851457058']
      → FOUND: URL_BARU ✅
      → RETURN: URL_BARU ✅
   b. (Skip) Cek initialConfig.variantBaseImages (tidak perlu karena sudah found)
   c. (Skip) Fallback ke global baseImage
3. Canvas render dengan URL_BARU ✅
4. Browser load image dari Linode S3 ✅
5. Image baru tampil di frontend ✅
```

## Kenapa Config Tidak Ter-update?

Config (`MerchantConfig.variantBaseImages`) tidak ter-update karena:

1. **Save logic di Designer.tsx** hanya sync `baseImage` global, tidak sync `variantBaseImages`:
   ```typescript
   // Line 207-209
   baseImage: data.designJson[0]?.baseImage || data.config.baseImage,
   baseImageProperties: data.designJson[0]?.baseImageProperties || data.config.baseImageProperties
   // ❌ variantBaseImages tidak di-sync!
   ```

2. **Ini bukan bug**, karena:
   - Design/template adalah source of truth untuk variant-specific images
   - Config hanya untuk global settings
   - Frontend sekarang prioritaskan design/template (activePage) ✅

## Testing

### Test Case 1: Upload untuk Variant Tertentu

```bash
# 1. Buka admin designer
https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/8214119219234

# 2. Buka Mockup Manager
# 3. Pilih variant "Black" di sidebar kiri
# 4. Upload image baru via "Manual Upload"
# 5. Klik "Save Design" → "This Product Only"

# 6. Buka frontend customer
https://uploadfly-lab.myshopify.com/products/test-product

# 7. Pilih variant "Black"
# 8. Verifikasi:
✅ Image baru tampil untuk variant Black
✅ Variant lain (Pink, Blue) masih tampil image global/default
```

### Test Case 2: Upload untuk All Variants (Global)

```bash
# 1. Di Mockup Manager, pilih "All Variants (Global)" di sidebar kiri
# 2. Upload image baru
# 3. Save design

# 4. Di frontend, pilih variant apapun
# 5. Verifikasi:
✅ Image baru tampil untuk semua variant
```

### Test Case 3: Mix Global + Variant-Specific

```bash
# 1. Upload image A untuk "All Variants (Global)"
# 2. Upload image B untuk variant "Black"
# 3. Save design

# 4. Di frontend:
# - Pilih variant Black → Tampil image B ✅
# - Pilih variant Pink → Tampil image A ✅
# - Pilih variant Blue → Tampil image A ✅
```

## File yang Dimodifikasi

| File | Perubahan | Baris |
|------|-----------|-------|
| `frontend/src/components/DesignerOpenCore.tsx` | Update priority logic: cek `activePage.variantBaseImages` dulu | 370-395 |
| `frontend/src/components/DesignerOpenCore.tsx` | Tambah logging untuk `variantBaseImages` dan `selectedVariantId` | 441-453 |
| `doc/fix-variant-base-image-priority-2026-02-12.md` | Dokumentasi lengkap perbaikan (file ini) | - |

## Catatan Penting

### 1. Design/Template adalah Source of Truth

Untuk variant-specific base images:
- ✅ **Design/Template** (`SavedDesign.designJson[0].variantBaseImages`) adalah source of truth
- ⚠️ **Config** (`MerchantConfig.variantBaseImages`) hanya untuk global settings
- Frontend sekarang prioritaskan design/template

### 2. Backward Compatibility

Perbaikan ini backward compatible:
- Kode lama yang hanya menggunakan config tetap berfungsi
- Kode baru prioritaskan design/template untuk variant-specific images
- Fallback ke config jika design/template tidak ada

### 3. Priority Order

Urutan prioritas resolusi base image:
1. `activePage.variantBaseImages[variantId]` (variant-specific dari design)
2. `initialConfig.variantBaseImages[variantId]` (variant-specific dari config)
3. `activePage.baseImage` (global dari design)
4. `initialConfig.baseImage` (global dari config)
5. Shopify variant image
6. Shopify product image
7. System placeholder

## Related Issues

- [fix-base-image-upload-object-error-2026-02-12.md](./fix-base-image-upload-object-error-2026-02-12.md) - Fix [object Object] error
- [fix-500-error-save-config-2026-02-12.md](./fix-500-error-save-config-2026-02-12.md) - Fix 500 error saat save
- [fix-save-logic-custom-elements-2026-02-12.md](./fix-save-logic-custom-elements-2026-02-12.md) - Fix save logic
- [troubleshoot-base-image-not-updating-frontend-2026-02-12.md](./troubleshoot-base-image-not-updating-frontend-2026-02-12.md) - Troubleshooting guide

---

**Dibuat oleh:** Kiro AI Assistant  
**Terakhir diupdate:** 12 Februari 2026  
**Status:** ✅ Selesai dan Tested
