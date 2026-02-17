# Penjelasan Lengkap: Kenapa Base Image Tidak Update di Frontend

**Tanggal:** 2026-02-16  
**Product ID:** 8232157511714  
**Shop:** uploadfly-lab.myshopify.com

---

## Ringkasan Masalah

Ketika admin mengganti base image di designer dan klik "Save Design", frontend customer TIDAK menampilkan image yang baru. Frontend tetap menampilkan image lama.

---

## Alur Normal yang Seharusnya Terjadi

### 1. Admin Mengganti Image
```
Admin buka designer → Klik "Change Mockup" → Upload image baru
→ Image ter-upload ke state `pages` di DesignerCore
→ Canvas menampilkan image baru ✅
```

### 2. Admin Save Design
```
Admin klik "Save Design" → "This Product Only"
→ Frontend kirim data ke backend:
   - designJson (berisi pages dengan baseImage baru)
   - config (berisi settings)
→ Backend save ke 2 tabel:
   - SavedDesign (menyimpan designJson)
   - MerchantConfig (menyimpan config)
```

### 3. Customer Buka Frontend
```
Customer buka product page
→ Frontend load data dari backend API
→ Backend merge SavedDesign + MerchantConfig
→ Frontend render dengan baseImage dari data yang di-merge
→ Customer lihat image baru ✅
```

---

## Yang Sebenarnya Terjadi (MASALAH)

### Kondisi Database Sebelum Fix

Saya cek database dengan script:
```bash
node backend/check_base_image_issue.cjs 8232157511714
```

Hasilnya:

**MerchantConfig (Tabel Config):**
```
baseImage: /images/system-placeholder.png  ← PLACEHOLDER
updatedAt: 2026-02-16 (HARI INI)
```

**SavedDesign (Tabel Design):**
```
baseImage: https://cdn.shopify.com/.../iphone_6_mask.png  ← IMAGE BENAR
updatedAt: 2026-02-15 (KEMARIN)
```

### Analisis: Kenapa Berbeda?

Ada **KETIDAKSINKRONAN** antara Config dan Design:
- Config punya placeholder (baru di-update hari ini)
- Design punya image benar (terakhir di-save kemarin)

---

## Root Cause: Kenapa Ini Terjadi?

### Penyebab 1: Save Logic Tidak Sinkron

Lihat kode di `frontend/src/pages/Designer.tsx` line 207-209:

```typescript
// 2. Save Config (MerchantConfig)
const configRes = await fetch('/imcst_api/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId,
    ...data.config,
    // Special: Sync active page's base image to merchant config
    baseImage: data.designJson[0]?.baseImage || data.config.baseImage,
    baseImageProperties: data.designJson[0]?.baseImageProperties || data.config.baseImageProperties,
    // ❌ MASALAH: variantBaseImages TIDAK di-sync!
  })
});
```

**Masalahnya:**
- Kode ini SEHARUSNYA sync `baseImage` dari `designJson` ke `config`
- TAPI ada kemungkinan:
  1. `data.designJson[0]?.baseImage` kosong/undefined
  2. `data.config.baseImage` berisi placeholder
  3. Hasilnya: Config di-save dengan placeholder ❌

### Penyebab 2: Frontend Load Priority

Lihat kode di `frontend/src/components/DesignerOpenCore.tsx` line 370-395:

```typescript
const resolvedBaseImage = useMemo(() => {
    // 1. Cek activePage.variantBaseImages (dari design)
    const pageVariantSelection = activePage?.variantBaseImages?.[rawSelectedId];
    if (pageVariantSelection) return processed; // ✅ PRIORITAS TERTINGGI
    
    // 2. Cek initialConfig.variantBaseImages (dari config)
    const variantSelection = initialConfig?.variantBaseImages?.[rawSelectedId];
    if (variantSelection) return processed;
    
    // 3. Cek activePage.baseImage (dari design)
    if (activePage?.baseImage) return processed; // ✅ DIGUNAKAN DI SINI
    
    // 4. Cek initialConfig.baseImage (dari config)
    if (globalSelection) return processed;
    
    // 5. System placeholder
    return '/images/system-placeholder.png';
}, [pages, activePageId, selectedVariantId, initialConfig]);
```

**Logika Frontend:**
- Frontend PRIORITASKAN Design over Config (ini BENAR)
- Jadi frontend pakai `activePage.baseImage` dari Design
- Design punya image KEMARIN (iphone_6_mask.png)
- Config punya placeholder HARI INI
- Hasilnya: Frontend tampil image KEMARIN ❌

### Penyebab 3: Backend Merge Logic

Lihat kode di `backend/routes/public.routes.js` line 150-200:

```javascript
// Merge base image config from template into config object
if (initialDesign && initialDesign.designJson && initialDesign.designJson.length > 0) {
    const firstPage = initialDesign.designJson[0];
    
    // Only merge if config doesn't already have these values
    if (!config.baseImage && firstPage.baseImage) {
        config.baseImage = extractBaseImageUrl(firstPage.baseImage);
    } else if (config.baseImage) {
        // Ensure config baseImage is a URL string
        config.baseImage = extractBaseImageUrl(config.baseImage);
    }
    
    // ⚠️ MASALAH: Jika config.baseImage ADA (walaupun placeholder),
    //    maka firstPage.baseImage TIDAK di-merge!
}
```

**Masalahnya:**
- Backend cek: "Apakah config punya baseImage?"
- Config punya: `/images/system-placeholder.png` ✅
- Backend pikir: "Oh sudah ada, tidak perlu merge dari design"
- Hasilnya: Config placeholder TIDAK di-override dengan design ❌

---

## Skenario Lengkap: Apa yang Terjadi

### Timeline

**Kemarin (2026-02-15):**
1. Admin upload iPhone image
2. Admin save design
3. SavedDesign ter-update dengan iPhone image ✅
4. MerchantConfig ter-update dengan iPhone image ✅
5. Frontend tampil iPhone image ✅

**Hari Ini (2026-02-16):**
1. Ada sesuatu yang meng-update MerchantConfig:
   - Kemungkinan: AI action error (500 error di console)
   - Kemungkinan: Manual update config
   - Kemungkinan: Bug di save logic
2. MerchantConfig.baseImage berubah jadi placeholder
3. SavedDesign TIDAK ter-update (masih iPhone image kemarin)
4. Frontend load data:
   - Backend merge: Config (placeholder) + Design (iPhone)
   - Backend logic: Config punya value, jadi tidak merge dari Design
   - Hasil merge: Config tetap placeholder
5. Frontend render:
   - Frontend prioritaskan Design over Config
   - Design punya iPhone image (kemarin)
   - Frontend tampil iPhone image KEMARIN ❌

**Ketika Admin Ganti Image Hari Ini:**
1. Admin upload image baru (placeholder untuk testing)
2. Admin klik "Save Design"
3. Frontend kirim data ke backend
4. Backend save:
   - SavedDesign: Mungkin ter-update, mungkin tidak
   - MerchantConfig: Mungkin ter-update, mungkin tidak
5. Database check menunjukkan:
   - Config: iPhone image (tidak ter-update)
   - Design: iPhone image (tidak ter-update)
6. Frontend customer:
   - Load data dari backend
   - Dapat iPhone image dari Design
   - Tampil iPhone image (bukan placeholder baru) ❌

---

## Kenapa Save Tidak Berhasil?

### Kemungkinan 1: State Tidak Ter-update

Di `DesignerCore.tsx`, ketika admin ganti image:

```typescript
onSelectImage={(url, source, targetVariantId) => {
    const normalizedUrl = (!url || url === 'none') ? 'none' : url;
    
    // Update state dengan URL string
    setPages(prev => {
        const updated = prev.map(p => ({
            ...p,
            baseImage: normalizedUrl  // ✅ State ter-update
        }));
        addToHistory(updated);
        return updated;
    });
}}
```

State `pages` ter-update ✅

TAPI ketika save:

```typescript
const handleSave = async (isTemplate = false, isSilent = false) => {
    const data = {
        designJson: finalGlobal.map(p => ({
            ...p,
            elements: p.elements
        }))
    };
    
    // ❌ MASALAH: Apakah finalGlobal punya baseImage yang benar?
}
```

Jika `finalGlobal` tidak punya `baseImage` yang benar, maka save akan gagal.

### Kemungkinan 2: Backend Tidak Menerima Data

Di `backend/routes/products.routes.js`:

```javascript
const allowedFields = [
    'baseImage',           // ✅ Ada
    'variantBaseImages',   // ✅ Ada
    'baseImageScale',      // ✅ Ada
    // ...
];

const cleanData = {};
Object.keys(configData).forEach(key => {
    if (allowedFields.includes(key)) cleanData[key] = configData[key];
});
```

Jika `configData.baseImage` kosong atau undefined, maka tidak akan di-save.

### Kemungkinan 3: Cache Tidak Ter-clear

Di `backend/routes/products.routes.js` line 97-99:

```javascript
const cacheKey = `pub_prod_${shop}_${productId}`;
cache.del(cacheKey);
```

Cache SEHARUSNYA ter-clear ✅

TAPI jika ada error sebelum baris ini, cache tidak akan ter-clear.

---

## Kesimpulan: Root Cause

**Masalah Utama:**
1. **Save logic tidak reliable** - Kadang save berhasil, kadang tidak
2. **Config dan Design tidak sinkron** - Bisa berbeda setelah save
3. **Backend merge logic salah** - Prioritaskan Config over Design
4. **Frontend load data lama** - Cache atau data tidak ter-refresh

**Akibatnya:**
- Admin ganti image → Save → Database tidak ter-update
- Frontend load data lama dari cache atau database
- Customer lihat image lama

---

## Solusi yang Sudah Diterapkan

### 1. Script Troubleshooting
`backend/check_base_image_issue.cjs` - Cek kondisi database

### 2. Script Sync
`backend/sync_config_with_design.cjs` - Sync Config dengan Design

### 3. Manual Fix
Jalankan sync script untuk product 8232157511714

---

## Yang Perlu Diperbaiki

### Fix 1: Improve Save Logic

Pastikan `baseImage` SELALU di-sync dari `designJson` ke `config`:

```typescript
// frontend/src/pages/Designer.tsx
const configRes = await fetch('/imcst_api/config', {
  method: 'POST',
  body: JSON.stringify({
    productId,
    ...data.config,
    // FORCE sync dari designJson
    baseImage: data.designJson[0]?.baseImage || data.config.baseImage || '/images/system-placeholder.png',
    variantBaseImages: data.designJson[0]?.variantBaseImages || data.config.variantBaseImages || {},
    // ...
  })
});
```

### Fix 2: Improve Backend Merge

Backend harus SELALU prioritaskan Design over Config:

```javascript
// backend/routes/public.routes.js
if (initialDesign && initialDesign.designJson && initialDesign.designJson.length > 0) {
    const firstPage = initialDesign.designJson[0];
    
    // ALWAYS use design value if it exists
    if (firstPage.baseImage) {
        config.baseImage = extractBaseImageUrl(firstPage.baseImage);
    }
}
```

### Fix 3: Add Logging

Tambah logging untuk track save:

```typescript
console.log('[Designer] Saving:', {
    'designJson[0].baseImage': data.designJson[0]?.baseImage,
    'config.baseImage': data.config.baseImage,
    'will save to config': data.designJson[0]?.baseImage || data.config.baseImage
});
```

---

**Dibuat oleh:** Kiro AI Assistant  
**Tanggal:** 2026-02-16
