# Troubleshooting: Base Image Tidak Update di Frontend Setelah Save

**Tanggal:** 12 Februari 2026  
**Status:** 🔍 INVESTIGATING  

---

## Masalah

Setelah ganti base image via "Change Mockup" → "Manual Upload" dan klik "Save Design", frontend customer masih menampilkan image lama alih-alih image baru yang di-upload.

### Alur yang Terjadi:
1. **Awalnya:** Kaos pink (tersimpan di database)
2. **Admin ganti:** Via "Change Mockup" → Manual Upload → Upload mug kuning
3. **Admin save:** Klik "Save Design" → "This Product Only"
4. **Frontend masih tampil:** Kaos pink ❌
5. **Seharusnya tampil:** Mug kuning ✅

## Kemungkinan Penyebab

### 1. Data Tidak Tersimpan ke Database

**Cek:**
- Apakah `baseImage` di-save ke `SavedDesign` table?
- Apakah `baseImage` di-save ke `MerchantConfig` table?
- Apakah `variantBaseImages` di-save jika upload untuk variant tertentu?

**Logging yang Ditambahkan:**

Frontend (`Designer.tsx`):
```javascript
console.log('[Designer] Saving design:', {
  saveType: data.saveType,
  isTemplate: data.isTemplate,
  shopifyProductId: finalShopifyProductId,
  productId,
  'designJson[0].baseImage': data.designJson[0]?.baseImage,
  'designJson[0].variantBaseImages': data.designJson[0]?.variantBaseImages,
  'config.baseImage': data.config.baseImage,
  'config.variantBaseImages': data.config.variantBaseImages
});
```

Backend (`products.routes.js`):
```javascript
console.log('[Config Save] Data to save:', {
  productId,
  'cleanData.baseImage': cleanData.baseImage,
  'cleanData.variantBaseImages': cleanData.variantBaseImages,
  'cleanData.baseImageScale': cleanData.baseImageScale,
  'cleanData.variantBaseScales': cleanData.variantBaseScales
});
```

### 2. Cache Tidak Di-Clear

**Cek:**
- Apakah cache di-clear setelah save config?
- Apakah cache key benar?

**Sudah Diperbaiki:**
```javascript
// backend/routes/products.routes.js line 97-99
const cacheKey = `pub_prod_${shop}_${productId}`;
cache.del(cacheKey);
```

### 3. Frontend Tidak Reload Data

**Cek:**
- Apakah `loadData(true)` dipanggil setelah save?
- Apakah frontend re-fetch data dari backend?

**Sudah Ada:**
```javascript
// frontend/src/pages/Designer.tsx line 212
if (designRes.ok && configRes.ok) {
  loadData(true); // ✅ Reload data
  return await designRes.json();
}
```

### 4. Field Tidak Masuk ke allowedFields

**Sudah Diperbaiki:**
```javascript
// backend/routes/products.routes.js
const allowedFields = [
  // ... existing fields
  'variantBaseImages',      // ✅ Added
  'variantBaseScales',      // ✅ Added
  'baseImageScale',         // ✅ Added
  'baseImageColorMode',     // ✅ Added
  'baseImageMaskInvert',    // ✅ Added
  // ...
];
```

## Langkah Debugging

### Step 1: Cek Console Log Saat Save

1. Buka admin designer
2. Upload base image baru via "Change Mockup" → "Manual Upload"
3. Klik "Save Design" → "This Product Only"
4. Cek console browser untuk log:

```
[Designer] Saving design: {
  saveType: 'product',
  isTemplate: true,
  shopifyProductId: '8214119219234',
  productId: '8214119219234',
  'designJson[0].baseImage': 'https://customfly.../mug-kuning.png',  ← Harus URL baru
  'designJson[0].variantBaseImages': {...},
  'config.baseImage': 'https://customfly.../mug-kuning.png',  ← Harus URL baru
  'config.variantBaseImages': {...}
}
```

**Jika baseImage masih URL lama:**
- Masalah di frontend - baseImage tidak ter-update di state
- Cek apakah `onSelectImage` di `DesignerCore.tsx` berfungsi

**Jika baseImage sudah URL baru:**
- Lanjut ke Step 2

### Step 2: Cek Backend Log

Cek server console untuk log:

```
[Config Save] Data to save: {
  productId: '8214119219234',
  'cleanData.baseImage': 'https://customfly.../mug-kuning.png',  ← Harus URL baru
  'cleanData.variantBaseImages': {...},
  'cleanData.baseImageScale': 80,
  'cleanData.variantBaseScales': {...}
}
```

**Jika baseImage masih URL lama:**
- Masalah di payload yang dikirim frontend
- Cek `Designer.tsx` line 207-209

**Jika baseImage sudah URL baru:**
- Lanjut ke Step 3

### Step 3: Cek Database

```sql
-- Cek MerchantConfig
SELECT 
  shop,
  shopifyProductId,
  baseImage,
  variantBaseImages,
  updatedAt
FROM MerchantConfig
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND shopifyProductId = '8214119219234';

-- Expected: baseImage harus URL baru (mug kuning)

-- Cek SavedDesign
SELECT 
  id,
  name,
  shopifyProductId,
  isTemplate,
  designJson->>'$[0].baseImage' as baseImage,
  updatedAt
FROM SavedDesign
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND shopifyProductId = '8214119219234'
  AND isTemplate = true
ORDER BY updatedAt DESC
LIMIT 1;

-- Expected: baseImage harus URL baru (mug kuning)
```

**Jika database masih URL lama:**
- Masalah di backend save logic
- Cek `products.routes.js` dan `designs.routes.js`

**Jika database sudah URL baru:**
- Lanjut ke Step 4

### Step 4: Cek Frontend Load Data

1. Buka frontend customer
2. Cek console untuk log:

```
[DesignerPublic] Base Image Configuration: {
  'design[0].baseImage': 'https://customfly.../mug-kuning.png',  ← Harus URL baru
  'config.baseImage': 'https://customfly.../mug-kuning.png',  ← Harus URL baru
  ...
}
```

**Jika baseImage masih URL lama:**
- Masalah di backend public API
- Cache mungkin tidak ter-clear
- Cek `public.routes.js` line 97-99

**Jika baseImage sudah URL baru tapi image tidak tampil:**
- Masalah di Canvas rendering
- Cek `Canvas.tsx` dan `DesignerOpenCore.tsx`

### Step 5: Force Clear Cache

Jika semua sudah benar tapi frontend masih tampil lama:

```bash
# Option 1: Clear cache via URL parameter
https://uploadfly-lab.myshopify.com/products/test-product?t=1234567890

# Option 2: Restart backend server
cd backend
npm run dev

# Option 3: Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)
- Clear site data di DevTools
```

## Solusi Berdasarkan Penyebab

### Jika baseImage Tidak Ter-update di State (Frontend)

**Problem:** `onSelectImage` tidak update state dengan benar

**Fix:**
```typescript
// frontend/src/components/DesignerCore.tsx
onSelectImage={(url, source, targetVariantId) => {
    const normalizedUrl = (!url || url === 'none') ? 'none' : url;
    
    // Pastikan URL string, bukan object
    console.log('[DesignerCore] Base image selected:', {
        url: normalizedUrl,
        type: typeof normalizedUrl  // Harus "string"
    });
    
    // Update state dengan URL string
    setPages(prev => {
        const updated = prev.map(p => ({
            ...p,
            baseImage: normalizedUrl  // String URL
        }));
        addToHistory(updated);
        return updated;
    });
}}
```

### Jika Data Tidak Tersimpan ke Database

**Problem:** Field tidak masuk ke allowedFields atau payload salah

**Fix:**
```javascript
// backend/routes/products.routes.js
const allowedFields = [
    'baseImage',           // ✅ Must be included
    'variantBaseImages',   // ✅ Must be included
    'baseImageScale',      // ✅ Must be included
    'variantBaseScales',   // ✅ Must be included
    // ... other fields
];
```

### Jika Cache Tidak Ter-clear

**Problem:** Cache masih menyimpan data lama

**Fix:**
```javascript
// backend/routes/products.routes.js
// Setelah save config
const cacheKey = `pub_prod_${shop}_${productId}`;
cache.del(cacheKey);
console.log('[Config Save] Cache cleared:', cacheKey);
```

### Jika Frontend Tidak Reload

**Problem:** `loadData` tidak dipanggil atau tidak berfungsi

**Fix:**
```javascript
// frontend/src/pages/Designer.tsx
if (designRes.ok && configRes.ok) {
    await loadData(true);  // ✅ Reload data
    toast.success('Design saved successfully');
    return await designRes.json();
}
```

## Checklist Perbaikan

- [x] Frontend: Simpan baseImage sebagai string URL (bukan object)
- [x] Backend: Extract URL string dari object (bukan normalize ke object)
- [x] Backend: Tambah field ke allowedFields (variantBaseScales, baseImageScale, dll)
- [x] Backend: Clear cache setelah save
- [x] Frontend: Reload data setelah save
- [x] Logging: Tambah console.log untuk debugging
- [ ] Test: Upload image baru dan verifikasi tampil di frontend
- [ ] Test: Cek database untuk memastikan data tersimpan
- [ ] Test: Clear cache dan reload frontend

## Next Steps

1. **Test upload image baru:**
   - Upload via "Change Mockup" → "Manual Upload"
   - Save dengan "This Product Only"
   - Cek console logs
   - Cek database
   - Reload frontend dan verifikasi image baru tampil

2. **Jika masih tidak berfungsi:**
   - Share console logs dari Step 1-4
   - Share database query results
   - Share Network tab untuk request/response

3. **Dokumentasi hasil:**
   - Update file ini dengan hasil testing
   - Tambahkan solusi final jika ditemukan masalah lain

---

**Dibuat oleh:** Kiro AI Assistant  
**Terakhir diupdate:** 12 Februari 2026  
**Status:** 🔍 Investigating - Menunggu hasil testing
