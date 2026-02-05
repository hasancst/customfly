# Real-Time Synchronization Fix - Admin vs Public Designer

## Masalah yang Ditemukan

Data antara **Admin Designer** dan **Public Designer** berbeda untuk produk yang sama, meskipun seharusnya real-time synchronized.

### Root Cause Analysis

#### **Admin Designer** (`/frontend/src/pages/Designer.tsx`):
```typescript
// Mengambil design terbaru tanpa filter
const latestDesign = savedDesigns && savedDesigns.length > 0
    ? [...savedDesigns].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

// Endpoint: GET /imcst_api/design/product/:productId
// Query: SELECT * FROM SavedDesign WHERE shop = ? AND shopifyProductId = ? ORDER BY updatedAt DESC
```

#### **Public Designer** (`/frontend/src/pages/DesignerPublic.tsx`):
```typescript
// Mengambil data dari endpoint berbeda
const prodRes = await fetch(`${baseUrl}/imcst_public_api/product/${shop}/${productId}`);

// Backend SEBELUMNYA mencari dengan prioritas:
// 1. Design dengan isTemplate = true untuk produk ini
// 2. Design terbaru untuk produk ini
// 3. Global template
```

**Perbedaan Kritis:**
- Admin: Langsung ambil design **terbaru** (apapun flag `isTemplate`-nya)
- Public: Cari design dengan `isTemplate = true` **dulu**, baru design terbaru

Ini menyebabkan:
- Merchant save design baru di Admin → Langsung terlihat di Admin
- Customer buka Public Designer → Masih lihat design lama (yang ditandai sebagai template)
- **Tidak real-time!**

---

## Solusi yang Diterapkan

### 1. **Unifikasi Logika Pengambilan Design**

**File:** `/www/wwwroot/custom.local/backend/server.js`  
**Endpoint:** `GET /imcst_public_api/product/:shop/:shopifyProductId`  
**Lines:** 1996-2016

**Perubahan:**
```javascript
// SEBELUM (Prioritas Template):
let initialDesign = await prisma.savedDesign.findFirst({
    where: {
        shop,
        shopifyProductId: String(shopifyProductId),
        isTemplate: true  // ❌ Filter template dulu
    },
    orderBy: { updatedAt: 'desc' }
});

if (!initialDesign) {
    initialDesign = await prisma.savedDesign.findFirst({
        where: { shop, shopifyProductId: String(shopifyProductId) },
        orderBy: { updatedAt: 'desc' }
    });
}

// SESUDAH (Prioritas Design Terbaru - SAMA DENGAN ADMIN):
let initialDesign = await prisma.savedDesign.findFirst({
    where: { 
        shop, 
        shopifyProductId: String(shopifyProductId)
        // ✅ Tidak ada filter isTemplate - ambil yang terbaru!
    },
    orderBy: { updatedAt: 'desc' }
});

// Hanya fallback ke global template jika TIDAK ADA design untuk produk ini
if (!initialDesign) {
    initialDesign = await prisma.savedDesign.findFirst({
        where: { shop, shopifyProductId: 'GLOBAL', isTemplate: true },
        orderBy: { updatedAt: 'desc' }
    });
}
```

### 2. **Cache Invalidation yang Tepat**

**File:** `/www/wwwroot/custom.local/backend/server.js`

#### a) Saat Save Design (`POST /imcst_api/design`):
```javascript
// Line 1293-1296
if (shopifyProductId) {
    cache.del(`pub_prod_${shop}_${shopifyProductId}`);
}
```

#### b) Saat Save Config (`POST /imcst_api/config`):
```javascript
// Line 1104-1109
cache.del(`config_${shop}_${productId}`);
cache.del(`pub_config_${shop}_${productId}`);
cache.del(`pub_prod_${shop}_${productId}`); // ✅ Tambahan untuk Public API
```

#### c) Saat Save Global Config (`POST /imcst_api/shop_config`):
```javascript
// Line 956-959
cache.del(`config_${shop}_GLOBAL`);
cache.del(`pub_config_${shop}_GLOBAL`);
```

### 3. **Standardisasi Global ID**

**Perubahan:** `'global_settings_config'` → `'GLOBAL'`

Semua referensi ke global settings sekarang menggunakan ID yang konsisten:
- MerchantConfig: `shopifyProductId = 'GLOBAL'`
- SavedDesign (template): `shopifyProductId = 'GLOBAL'` dengan `isTemplate = true`

---

## Hasil Akhir

### ✅ Real-Time Synchronization Flow:

1. **Merchant Save Design di Admin:**
   ```
   POST /imcst_api/design
   → Simpan ke database dengan updatedAt = NOW()
   → Invalidate cache: pub_prod_{shop}_{productId}
   ```

2. **Customer Buka Public Designer:**
   ```
   GET /imcst_public_api/product/{shop}/{productId}
   → Cache miss (sudah di-invalidate)
   → Query database: SELECT * ORDER BY updatedAt DESC LIMIT 1
   → Return design yang SAMA dengan Admin
   → Set cache untuk 5 menit
   ```

3. **Merchant Save Lagi:**
   ```
   → Cache di-invalidate lagi
   → Customer refresh → Dapat design terbaru
   ```

### ✅ Behavior Sekarang:

| Skenario | Admin Designer | Public Designer | Status |
|----------|---------------|-----------------|--------|
| Merchant save design baru | Langsung terlihat | Langsung terlihat (setelah refresh) | ✅ SYNC |
| Merchant update design | Langsung terlihat | Langsung terlihat (setelah refresh) | ✅ SYNC |
| Merchant ubah config | Langsung terlihat | Langsung terlihat (setelah refresh) | ✅ SYNC |
| Tidak ada design untuk produk | Fallback ke config | Fallback ke global template | ✅ SYNC |

### ⚡ Performance:

- **Cache Duration:** 5 menit (300 detik)
- **Cache Invalidation:** Otomatis saat save
- **Database Queries:** Minimal (hanya saat cache miss)

---

## Testing Checklist

- [x] Backend restart sukses
- [ ] Test: Save design di Admin → Refresh Public → Harus sama
- [ ] Test: Update config di Admin → Refresh Public → Harus sama
- [ ] Test: Produk tanpa design → Fallback ke global template
- [ ] Test: Cache invalidation bekerja (tidak perlu tunggu 5 menit)
- [ ] Test: Multiple products tidak saling interfere

---

## Notes

- Flag `isTemplate` sekarang **hanya digunakan untuk Global Templates**
- Untuk product-specific designs, flag `isTemplate` diabaikan - yang penting adalah `updatedAt`
- Ini memastikan "latest save wins" behavior yang konsisten antara Admin dan Public
