# Perbaikan: Logic Save Design - Custom Elements Tidak Muncul di Frontend

**Tanggal:** 12 Februari 2026  
**Status:** ✅ SELESAI  
**Product ID:** 8214119219234

---

## Ringkasan Masalah

Custom elements (text, image, monogram, gallery, dll) yang sudah disimpan di admin designer tidak muncul di frontend customer, padahal tombol "Save" sudah diklik dan data tersimpan di database.

## Akar Masalah

Terdapat kesalahan logika pada fungsi save yang membedakan antara dua mode penyimpanan:

### Mode Penyimpanan yang Benar:

1. **"Save This Product Only"** (Simpan untuk Produk Ini Saja)
   - Harus menyimpan dengan: `isTemplate: true` + `shopifyProductId: '8214119219234'`
   - Fungsi: Design hanya muncul di frontend untuk produk ini saja
   - Digunakan untuk: Konfigurasi custom yang spesifik untuk satu produk

2. **"Save as Store Template"** (Simpan sebagai Template Toko)
   - Harus menyimpan dengan: `isTemplate: true` + `shopifyProductId: 'GLOBAL'`
   - Fungsi: Design disimpan ke library template dan bisa di-load ke produk lain
   - Digunakan untuk: Template yang bisa digunakan ulang via menu "Load Template Library"

### Bug yang Terjadi:

Tombol "Save This Product Only" memanggil `onSave?.(false)` yang mengeset `isTemplate: false`, sehingga:
- Design tersimpan di database tapi dengan `isTemplate: false`
- Public API hanya load design dengan `isTemplate: true`
- Akibatnya: Custom elements tidak muncul di frontend customer

## Solusi yang Diimplementasikan

### 1. Alur Data Baru

```
Header.tsx (Save Button)
    ↓ Pass: (isTemplate=true, isSilent=false, saveType='product'|'global')
    ↓
DesignerCore.tsx (handleSave)
    ↓ Deteksi saveType dan masukkan ke data object
    ↓
Designer.tsx (onSave callback)
    ↓ Set shopifyProductId berdasarkan saveType
    ↓ 'product' → gunakan productId asli
    ↓ 'global' → gunakan 'GLOBAL'
    ↓
Backend API (/imcst_api/design)
    ↓ Simpan ke database dengan parameter yang benar
```

### 2. Perubahan Kode

#### A. Header.tsx

**Interface Update:**
```typescript
interface HeaderProps {
  // ... props lainnya
  onSave?: (isTemplate?: boolean, isSilent?: boolean, saveType?: 'product' | 'global') => void;
  // ... props lainnya
}
```

**Button Click Handler:**
```typescript
// Save This Product Only
<DropdownMenuItem onClick={() => onSave?.(true, false, 'product')}>
  <span>This Product Only</span>
  <span>Save as template for this product (visible to customers)</span>
</DropdownMenuItem>

// Save as Store Template
<DropdownMenuItem onClick={() => onSave?.(true, false, 'global')}>
  <span>Store Template</span>
  <span>Add to global templates library (reusable)</span>
</DropdownMenuItem>
```

**Perubahan Penting:**
- Parameter pertama `isTemplate` sekarang selalu `true` untuk kedua mode
- Parameter ketiga `saveType` menentukan apakah 'product' atau 'global'

#### B. DesignerCore.tsx

**Function Signature Update:**
```typescript
const handleSave = async (
  isTemplate = false, 
  isSilent = false, 
  saveTypeOrOutputSettings?: 'product' | 'global' | any
) => {
  // Deteksi apakah parameter ketiga adalah saveType atau outputSettings
  const isSaveType = saveTypeOrOutputSettings === 'product' || 
                     saveTypeOrOutputSettings === 'global';
  const saveType = isSaveType ? saveTypeOrOutputSettings as ('product' | 'global') : undefined;
  const outputSettingsOverride = isSaveType ? undefined : saveTypeOrOutputSettings;
  
  // ... logic save
  
  const data = {
    id: designId,
    name: designName,
    productId,
    isTemplate,
    saveType, // ← Pass saveType ke parent
    config: { /* ... */ },
    designJson: finalGlobal.map(p => ({ /* ... */ }))
  };
  
  const result = await onSave(data);
  // ...
}
```

**Fitur Baru:**
- Menerima parameter ketiga yang bisa berupa `saveType` atau `outputSettings`
- Auto-detect tipe parameter berdasarkan nilai ('product'/'global' = saveType)
- Backward compatible dengan kode lama yang pass outputSettings

#### C. Designer.tsx

**onSave Callback Update:**
```typescript
onSave={async (data) => {
  // Tentukan shopifyProductId berdasarkan saveType
  const finalShopifyProductId = data.saveType === 'global' ? 'GLOBAL' : productId;
  
  console.log('[Designer] Saving design:', {
    saveType: data.saveType,
    isTemplate: data.isTemplate,
    shopifyProductId: finalShopifyProductId,
    productId
  });

  // Save Design
  const designRes = await fetch('/imcst_api/design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: data.id,
      name: data.name,
      designJson: data.designJson,
      isTemplate: data.isTemplate,
      previewUrl: data.previewUrl,
      shopifyProductId: finalShopifyProductId // ← Dinamis berdasarkan saveType
    })
  });
  
  // ... save config dan return
}}
```

**Logic Baru:**
- Jika `saveType === 'global'` → `shopifyProductId = 'GLOBAL'`
- Jika `saveType === 'product'` → `shopifyProductId = productId` (e.g., '8214119219234')
- Logging untuk debugging

#### D. DesignerOpenCore.tsx

**Update untuk Konsistensi:**
```typescript
const handleSave = async (
  _isTemplate = false, 
  isSilent = false, 
  saveTypeOrOutputSettings?: 'product' | 'global' | any
) => {
  // Deteksi tipe parameter
  const isSaveType = saveTypeOrOutputSettings === 'product' || 
                     saveTypeOrOutputSettings === 'global';
  const outputSettingsOverride = isSaveType ? undefined : saveTypeOrOutputSettings;
  
  // ... logic save
  
  const data = {
    name: designName || `Design-${Date.now()}`,
    designJson: pages,
    isTemplate: false, // ← Customer tidak bisa save template
    // ...
  };
}
```

**Catatan:**
- Public mode tetap menggunakan `isTemplate: false` karena customer tidak bisa save template
- Update signature hanya untuk konsistensi dengan DesignerCore

### 3. Database Schema

**Tabel: SavedDesign**

| Field | Nilai untuk "This Product Only" | Nilai untuk "Store Template" |
|-------|----------------------------------|-------------------------------|
| `isTemplate` | `true` | `true` |
| `shopifyProductId` | `'8214119219234'` (actual ID) | `'GLOBAL'` |
| `shop` | `'uploadfly-lab.myshopify.com'` | `'uploadfly-lab.myshopify.com'` |
| `designJson` | `[{...pages}]` | `[{...pages}]` |

### 4. Backend API Query

**Public Endpoint:** `/imcst_public_api/config/:productId`

```javascript
const designs = await prisma.savedDesign.findMany({
  where: {
    shop,
    isTemplate: true, // ← Hanya load template
    OR: [
      { shopifyProductId: productId },  // Design untuk produk ini
      { shopifyProductId: 'GLOBAL' }    // Template global
    ]
  },
  orderBy: { updatedAt: 'desc' }
});
```

**Hasil:**
- Customer melihat design yang disave dengan "This Product Only"
- Customer juga melihat template global yang di-load ke produk ini

## Cara Testing

### 1. Test "Save This Product Only"

```bash
# 1. Buka admin designer
https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/8214119219234

# 2. Tambahkan custom elements:
- Text element dengan text "Hello World"
- Image element
- Monogram element
- Gallery element

# 3. Klik "Save Design" → "This Product Only"

# 4. Cek console browser, harus muncul:
[Designer] Saving design: {
  saveType: 'product',
  isTemplate: true,
  shopifyProductId: '8214119219234',
  productId: '8214119219234'
}

# 5. Buka frontend customer
https://uploadfly-lab.myshopify.com/products/test-product

# 6. Verifikasi:
✅ Custom elements muncul di panel customization
✅ Text element bisa diedit
✅ Image element bisa diganti
✅ Monogram element bisa diisi
✅ Gallery element menampilkan pilihan gambar
```

### 2. Test "Save as Store Template"

```bash
# 1. Di admin designer yang sama, ubah design
# 2. Klik "Save Design" → "Store Template"

# 3. Cek console, harus muncul:
[Designer] Saving design: {
  saveType: 'global',
  isTemplate: true,
  shopifyProductId: 'GLOBAL',
  productId: '8214119219234'
}

# 4. Buka produk lain di admin
https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/[PRODUCT_ID_LAIN]

# 5. Klik "Load Template Library"
# 6. Verifikasi: Template yang disave tadi muncul di list
```

### 3. Test Database

```sql
-- Cek data di database
SELECT 
  id, 
  name, 
  shopifyProductId, 
  isTemplate, 
  shop,
  createdAt
FROM SavedDesign
WHERE shop = 'uploadfly-lab.myshopify.com'
ORDER BY createdAt DESC
LIMIT 10;

-- Expected results:
-- Row 1: shopifyProductId='8214119219234', isTemplate=true (This Product Only)
-- Row 2: shopifyProductId='GLOBAL', isTemplate=true (Store Template)
```

## Hasil yang Diharapkan

### ✅ Checklist Perbaikan

- [x] Custom elements muncul di frontend setelah "Save This Product Only"
- [x] Template library berfungsi dengan "Save as Store Template"
- [x] Database menyimpan `isTemplate: true` untuk kedua mode
- [x] `shopifyProductId` diset dengan benar ('8214119219234' vs 'GLOBAL')
- [x] Public API load design dengan benar
- [x] Console logging untuk debugging
- [x] Backward compatible dengan kode lama
- [x] TypeScript tidak ada error

### ✅ Fitur yang Berfungsi

1. **Admin Designer:**
   - Save This Product Only → Design muncul di frontend produk ini
   - Save as Store Template → Design masuk ke library template
   - Load Template Library → Bisa load template dari produk lain

2. **Frontend Customer:**
   - Custom elements (text, image, monogram, gallery) muncul
   - Elements bisa diedit sesuai konfigurasi
   - Shopify product options (Color, Size, dll) tetap berfungsi
   - Base image mockup color dari Assets > Colors tampil

3. **Database:**
   - Design tersimpan dengan parameter yang benar
   - Query public API load design dengan benar
   - Tidak ada duplikasi data

## File yang Dimodifikasi

| File | Perubahan | Baris |
|------|-----------|-------|
| `frontend/src/components/Header.tsx` | Update interface `HeaderProps`, tambah parameter `saveType` | 31-56 |
| `frontend/src/components/Header.tsx` | Update button click handler untuk pass `saveType` | 470-490 |
| `frontend/src/components/DesignerCore.tsx` | Update signature `handleSave`, tambah logic detect `saveType` | 486-580 |
| `frontend/src/components/DesignerCore.tsx` | Update call ke Header dengan 3 parameter | 677-684 |
| `frontend/src/pages/Designer.tsx` | Update `onSave` callback, set `shopifyProductId` dinamis | 165-185 |
| `frontend/src/components/DesignerOpenCore.tsx` | Update signature untuk konsistensi | 648-655, 1098 |
| `doc/fix-modal-redirect-mockup-color-2026-02-12.md` | Update dokumentasi dengan save logic fix | - |
| `doc/fix-save-logic-custom-elements-2026-02-12.md` | Dokumentasi lengkap perbaikan (file ini) | - |

## Catatan Penting

### 1. Perbedaan "This Product Only" vs "Store Template"

**This Product Only:**
- Design hanya untuk produk ini
- Customer melihat di frontend produk ini
- Tidak muncul di "Load Template Library" produk lain
- Use case: Konfigurasi custom spesifik per produk

**Store Template:**
- Design masuk ke library global
- Bisa di-load ke produk manapun
- Muncul di "Load Template Library" semua produk
- Use case: Template standar yang digunakan berulang

### 2. Backward Compatibility

Kode tetap backward compatible karena:
- Parameter ketiga optional
- Auto-detect tipe parameter (saveType vs outputSettings)
- Kode lama yang tidak pass parameter ketiga tetap berfungsi

### 3. Public Mode vs Admin Mode

- **Admin Mode:** Bisa save dengan `isTemplate: true` (untuk frontend)
- **Public Mode:** Selalu save dengan `isTemplate: false` (customer design)
- Customer tidak bisa save template, hanya admin

## Troubleshooting

### Problem: Elements masih tidak muncul di frontend

**Solusi:**
1. Cek console browser untuk log save
2. Verifikasi `isTemplate: true` di log
3. Cek database: `SELECT * FROM SavedDesign WHERE shopifyProductId = '8214119219234'`
4. Pastikan `isTemplate = true` di database
5. Clear cache browser dan reload frontend

### Problem: Template tidak muncul di "Load Template Library"

**Solusi:**
1. Pastikan save dengan "Store Template" (bukan "This Product Only")
2. Cek database: `SELECT * FROM SavedDesign WHERE shopifyProductId = 'GLOBAL'`
3. Verifikasi shop sama dengan produk yang buka template library

### Problem: TypeScript error setelah update

**Solusi:**
```bash
cd frontend
npm run build
# Atau
npm run dev
```

## Related Issues

- [fix-modal-redirect-mockup-color-2026-02-12.md](./fix-modal-redirect-mockup-color-2026-02-12.md) - Base image color settings
- [fix-modal-redirect-canvas-centering-2026-02-11.md](./fix-modal-redirect-canvas-centering-2026-02-11.md) - Canvas centering
- [fix-base-image-display-consistency-2026-02-12.md](./fix-base-image-display-consistency-2026-02-12.md) - Base image display

---

**Dibuat oleh:** Kiro AI Assistant  
**Terakhir diupdate:** 12 Februari 2026  
**Status:** ✅ Selesai dan Tested
