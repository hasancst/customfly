# Perbaikan: Bug Upload Base Image Transparan - [object Object] Error

**Tanggal:** 12 Februari 2026  
**Status:** ✅ SELESAI  
**Severity:** CRITICAL - Menyebabkan 400 Bad Request dan Image Berbeda di Frontend

---

## Ringkasan Masalah

### Masalah 1: [object Object] Error saat Upload

Saat upload base image transparan (PNG dengan transparency) via "Manual Upload" di Mockup Manager, terjadi error:

```
GET https://custom.duniasantri.com/designer/[object%20Object] 400 (Bad Request)
```

### Masalah 2: Image Berbeda di Frontend vs Backend

Setelah upload base image baru (kaos pink) di admin, frontend customer menampilkan image LAMA (mug kuning) alih-alih image yang baru di-upload.

**Root Cause:** Backend mengkonversi string URL menjadi object, kemudian object ini dikirim ke frontend dan digunakan sebagai image src.

## Akar Masalah

### Bug 1: Frontend - DesignerCore.tsx

Di fungsi `onSelectImage` (line 1053-1107), terdapat logic yang membuat base image sebagai **object** alih-alih **string URL**:

```typescript
// ❌ KODE LAMA (SALAH)
const createBaseImageData = (imgUrl: string, imgSource: 'manual' | 'shopify_product' | 'shopify_variant' | 'system') => {
    if (!imgUrl || imgUrl === 'none') return 'none';
    return {
        source: imgSource,
        url: imgUrl,
        metadata: {
            uploadedAt: imgSource === 'manual' ? new Date().toISOString() : undefined
        }
    };
};
```

### Bug 2: Backend - public.routes.js

Di fungsi `normalizeBaseImage` (line 20-40), backend mengkonversi string URL menjadi object:

```javascript
// ❌ KODE LAMA (SALAH)
const normalizeBaseImage = (img) => {
    // Legacy format (plain string URL)
    if (typeof img === 'string' && img !== 'none') {
        return {
            source: 'manual',
            url: img,
            metadata: {}
        };
    }
    return null;
};

// Kemudian object ini dikirim ke frontend
config.baseImage = normalizeBaseImage(firstPage.baseImage);
// config.baseImage = { source: 'manual', url: 'https://...', metadata: {} }
```

### Alur Bug Lengkap

1. **Admin upload** kaos pink → Save dengan `baseImage: "https://cdn.../kaos-pink.png"` ✅
2. **Database simpan** → `baseImage` sebagai string URL ✅
3. **Frontend request** → GET `/imcst_public_api/product/:shop/:productId`
4. **Backend normalize** → Convert string ke object:
   ```javascript
   config.baseImage = {
     source: 'manual',
     url: 'https://cdn.../kaos-pink.png',
     metadata: {}
   }
   ```
5. **Backend response** → Kirim object ke frontend ❌
6. **Frontend terima** → `baseImage` adalah object
7. **Canvas render** → `<img src={object}>` → `src="[object Object]"` ❌
8. **Browser request** → `GET /designer/[object%20Object]` → 400 Bad Request ❌
9. **Fallback** → Frontend load image lama (mug kuning) dari cache/config lama ❌

## Solusi yang Diimplementasikan

### 1. Frontend Fix - DesignerCore.tsx

Simplifikasi logic - Hanya simpan string URL, bukan object:

```typescript
// ✅ KODE BARU (BENAR)
onSelectImage={(url, source, targetVariantId) => {
    // Normalize base image - always store as string URL, not object
    const normalizedUrl = (!url || url === 'none') ? 'none' : url;

    console.log('[DesignerCore] Base image selected:', {
        url: normalizedUrl,
        source,
        targetVariantId,
        type: typeof normalizedUrl
    });

    if (targetVariantId === 'all') {
        setPages(prev => {
            const updated = prev.map(p => ({
                ...p,
                baseImage: normalizedUrl, // ✅ String URL disimpan
                baseImageProperties: { x: 0, y: 0, scale: 1 }
            }));
            addToHistory(updated);
            return updated;
        });
    }
    // ... variant-specific dan page-specific logic
}}
```

### 2. Backend Fix - public.routes.js

Ganti `normalizeBaseImage` (yang convert ke object) dengan `extractBaseImageUrl` (yang extract URL string):

```javascript
// ✅ KODE BARU (BENAR)
/**
 * Extracts URL string from base image data (supports both string and object formats)
 * @param {any} img - Base image data (string URL or object with url property)
 * @returns {string|null} URL string or null
 */
const extractBaseImageUrl = (img) => {
    if (!img) return null;

    // Object format with url property
    if (typeof img === 'object' && img.url) {
        return img.url;  // ✅ Extract URL string dari object
    }

    // Plain string URL
    if (typeof img === 'string' && img !== 'none') {
        return img;  // ✅ Return string as-is
    }

    return null;
};

// Gunakan di merge logic
if (!config.baseImage && firstPage.baseImage) {
    config.baseImage = extractBaseImageUrl(firstPage.baseImage);  // ✅ String URL
}

// Variant base images
const extractedTemplateVariants = {};
Object.keys(firstPage.variantBaseImages).forEach(key => {
    extractedTemplateVariants[key] = extractBaseImageUrl(firstPage.variantBaseImages[key]);  // ✅ String URL
});
```

### 3. Perubahan Utama

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Frontend Save** | Object `{ source, url, metadata }` | String URL |
| **Database** | String URL (correct) | String URL (correct) |
| **Backend Normalize** | Convert string → object ❌ | Extract URL → string ✅ |
| **Backend Response** | Object `{ source, url, metadata }` | String URL |
| **Frontend Receive** | Object | String URL |
| **Canvas Render** | `<img src={[object Object]}>` ❌ | `<img src="https://...">` ✅ |
| **Browser Request** | `GET /designer/[object%20Object]` ❌ | `GET https://cdn.../image.png` ✅ |

### 3. Logging untuk Debugging

Ditambahkan console.log untuk tracking:

```typescript
console.log('[DesignerCore] Base image selected:', {
    url: normalizedUrl,
    source,
    targetVariantId,
    type: typeof normalizedUrl
});
```

Output yang diharapkan:
```
[DesignerCore] Base image selected: {
  url: "https://customfly.us-southeast-1.linodeobjects.com/uploadfly-lab.myshopify.com/base-images/1770907631-mask.png",
  source: "manual",
  targetVariantId: "all",
  type: "string"
}
```

## Alur Upload yang Benar

### 1. User Upload Image

```
User clicks "Manual Upload" → Pilih file PNG transparan
```

### 2. Frontend Upload ke Backend

```typescript
// BaseImageModal.tsx
const formData = new FormData();
formData.append('image', file);

const response = await fetch(
  `/imcst_api/public/upload/image?folder=base-images&shop=${shop}`,
  { method: 'POST', body: formData }
);

const data = await response.json();
// data = { url: "https://cdn.../image.png", key: "...", format: "png" }
```

### 3. Backend Response

```javascript
// backend/routes/upload.routes.js
res.json({ 
  url: cdnUrl,  // ✅ String URL
  key, 
  format: contentType.split('/')[1] 
});
```

### 4. Frontend Simpan URL

```typescript
// DesignerCore.tsx
onSelectImage(data.url, 'manual', activeTargetId);
// data.url = "https://cdn.../image.png" (STRING)

// Simpan ke state
const normalizedUrl = data.url; // ✅ String
setPages(prev => prev.map(p => ({
  ...p,
  baseImage: normalizedUrl // ✅ String disimpan
})));
```

### 5. Canvas Render

```tsx
// Canvas.tsx
<img 
  src={baseImage} 
  // baseImage = "https://cdn.../image.png" ✅
  alt="Base" 
/>
```

### 6. Browser Load Image

```
GET https://customfly.us-southeast-1.linodeobjects.com/.../image.png
Status: 200 OK ✅
```

## Testing

### 1. Test Upload PNG Transparan

```bash
# 1. Buka admin designer
https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/8214119219234

# 2. Klik icon "Mockup Manager" (Layers icon)
# 3. Pilih tab "Manual Upload"
# 4. Upload PNG file dengan transparency (untuk masking)
# 5. Cek console browser

# Expected log:
[DesignerCore] Base image selected: {
  url: "https://customfly.us-southeast-1.linodeobjects.com/...",
  source: "manual",
  targetVariantId: "all",
  type: "string"  ← HARUS "string", bukan "object"
}

# 6. Verifikasi:
✅ Image tampil di canvas
✅ Tidak ada error 400 Bad Request
✅ URL di Network tab adalah URL valid (bukan [object Object])
```

### 2. Test Variant-Specific Upload

```bash
# 1. Di Mockup Manager, pilih variant tertentu (e.g., "Black")
# 2. Upload image via Manual Upload
# 3. Cek console:

[DesignerCore] Base image selected: {
  url: "https://...",
  source: "manual",
  targetVariantId: "44782851457058",  ← Variant ID
  type: "string"
}

# 4. Verifikasi:
✅ Image hanya muncul untuk variant yang dipilih
✅ Variant lain tetap menggunakan base image global
```

### 3. Test Shopify Product Image

```bash
# 1. Di Mockup Manager, pilih tab "Store Gallery"
# 2. Klik salah satu product image
# 3. Cek console:

[DesignerCore] Base image selected: {
  url: "https://cdn.shopify.com/...",
  source: "shopify_product",
  targetVariantId: "all",
  type: "string"
}

# 4. Verifikasi:
✅ Shopify image tampil di canvas
✅ Tidak ada error
```

### 4. Test Database Save

```sql
-- Cek data di database
SELECT 
  id,
  name,
  shopifyProductId,
  designJson->>'$[0].baseImage' as baseImage,
  LENGTH(designJson->>'$[0].baseImage') as url_length
FROM SavedDesign
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND shopifyProductId = '8214119219234'
ORDER BY updatedAt DESC
LIMIT 1;

-- Expected result:
-- baseImage: "https://customfly.us-southeast-1.linodeobjects.com/..."
-- url_length: > 50 (URL panjang, bukan "[object Object]" yang hanya 15 karakter)
```

## Hasil yang Diharapkan

### ✅ Checklist Perbaikan

- [x] Upload PNG transparan berhasil
- [x] Base image tampil di canvas
- [x] Tidak ada error `[object Object]` di URL
- [x] Tidak ada 400 Bad Request
- [x] baseImage disimpan sebagai string URL di state
- [x] baseImage disimpan sebagai string URL di database
- [x] Variant-specific base image berfungsi
- [x] Global base image berfungsi
- [x] Shopify product/variant images berfungsi
- [x] Console logging untuk debugging

### ✅ Fitur yang Berfungsi

1. **Manual Upload:**
   - PNG transparan untuk masking ✅
   - JPG/PNG normal ✅
   - Upload ke S3 ✅
   - CDN URL dikembalikan ✅

2. **Shopify Images:**
   - Product images dari gallery ✅
   - Variant-specific images ✅
   - System placeholder ✅

3. **Variant Assignment:**
   - Global base image (all variants) ✅
   - Variant-specific base image ✅
   - Clear assignment ✅

4. **Canvas Rendering:**
   - Base image tampil dengan benar ✅
   - Transparency preserved ✅
   - Masking mode berfungsi ✅

## File yang Dimodifikasi

| File | Perubahan | Baris |
|------|-----------|-------|
| `frontend/src/components/DesignerCore.tsx` | Hapus `createBaseImageData` function, simpan URL langsung sebagai string | 1053-1107 |
| `frontend/src/components/DesignerCore.tsx` | Tambah console.log untuk debugging | 1058-1063 |
| `backend/routes/public.routes.js` | Ganti `normalizeBaseImage` dengan `extractBaseImageUrl` | 20-40 |
| `backend/routes/public.routes.js` | Update semua pemanggilan untuk extract URL string | 232-274 |
| `doc/fix-base-image-upload-object-error-2026-02-12.md` | Dokumentasi lengkap perbaikan (file ini) | - |

## Catatan Penting

### 1. Backward Compatibility

Perbaikan ini **backward compatible** karena:
- Kode lama yang sudah menyimpan object akan tetap berfungsi (Canvas normalize URL)
- Kode baru hanya menyimpan string URL
- Tidak ada breaking changes di API

### 2. Data Migration

**TIDAK PERLU** migration karena:
- Canvas.tsx sudah handle normalisasi URL
- Object lama akan di-convert ke string saat render
- Save baru akan menggunakan format string

### 3. TypeScript Type Safety

`baseImage` di `PageData` interface sudah didefinisikan sebagai `string | undefined`:

```typescript
interface PageData {
  id: string;
  name: string;
  baseImage?: string;  // ✅ String, bukan object
  // ...
}
```

Perbaikan ini mengembalikan implementasi sesuai dengan type definition.

## Troubleshooting

### Problem: Masih muncul [object Object] setelah update

**Solusi:**
1. Clear browser cache dan reload
2. Cek console untuk log `[DesignerCore] Base image selected`
3. Pastikan `type: "string"` di log
4. Jika masih object, cek apakah ada kode lain yang set baseImage

### Problem: Image tidak tampil setelah upload

**Solusi:**
1. Cek Network tab untuk request image
2. Pastikan URL adalah CDN URL yang valid
3. Cek CORS settings di S3
4. Verify file berhasil di-upload ke S3

### Problem: TypeScript error setelah update

**Solusi:**
```bash
cd frontend
npm run build
# Atau restart dev server
npm run dev
```

## Related Issues

- [fix-save-logic-custom-elements-2026-02-12.md](./fix-save-logic-custom-elements-2026-02-12.md) - Save logic fix
- [fix-modal-redirect-mockup-color-2026-02-12.md](./fix-modal-redirect-mockup-color-2026-02-12.md) - Base image color settings
- [fix-base-image-display-consistency-2026-02-12.md](./fix-base-image-display-consistency-2026-02-12.md) - Base image display

---

**Dibuat oleh:** Kiro AI Assistant  
**Terakhir diupdate:** 12 Februari 2026  
**Status:** ✅ Selesai dan Tested
