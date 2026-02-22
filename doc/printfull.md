# Printful Integration Plan

**Dibuat**: 2026-02-20  
**Status**: 📋 Perencanaan  
**Tujuan**: Integrasi Printful agar merchant dapat import produk dari Printful ke Shopify dan langsung melakukan kustomisasi produk via CustomFly Designer.

---

## 🎯 Gambaran Umum

```
Merchant → CustomFly Admin
    → Pilih "Import dari Printful"
    → Pilih produk Printful (kaos, mug, dll)
    → Sistem otomatis buat produk di Shopify
    → Sistem otomatis buat MerchantConfig di CustomFly
    → Merchant langsung buka Designer untuk kustomisasi
    → Saat pelanggan order → dikirim ke Printful untuk fulfillment
```

---

## 📦 Fitur yang Direncanakan

### Phase 1 — Import Produk (MVP)
1. **Koneksi Printful API** — simpan API key per shop
2. **Browse Produk Printful** — lihat katalog produk Printful (kaos, hoodie, mug, dll)
3. **Import ke Shopify** — buat produk Shopify dari template Printful (dengan variasi warna/ukuran)
4. **Auto-Setup CustomFly Config** — otomatis buat `MerchantConfig` dengan:
   - Mockup/base image dari Printful
   - Print area sesuai spesifikasi Printful
   - Canvas size sesuai area cetak

### Phase 2 — Fulfillment Otomatis
5. **Order Hook** — saat pesanan masuk di Shopify → kirim ke Printful + sertakan design file
6. **Status sinkronisasi** — track status produksi dari Printful

### Phase 3 — Sinkronisasi & Manajemen
7. **Sync produk** — update harga/stok dari Printful ke Shopify
8. **Printful webhook** — terima notifikasi perubahan dari Printful

---

## 🔧 Arsitektur Teknis

### Backend Baru

#### File-file yang dibuat:
```
backend/
├── services/
│   └── printfulService.js          ← Client Printful OAuth2 / API Key
├── routes/
│   └── printful.routes.js          ← Semua endpoint Printful
├── config/
│   └── printful.js                 ← Konfigurasi Printful
```

#### Database (Prisma schema):
```prisma
model PrintfulConnection {
  id          String   @id @default(uuid())
  shop        String   @unique
  accessToken String              // OAuth2 access token
  storeId     String?             // Printful store ID
  connected   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shop])
}

model PrintfulProduct {
  id                String   @id @default(uuid())
  shop              String
  printfulProductId String              // ID dari sinkronisasi Printful
  printfulVariantId String?
  shopifyProductId  String?             // Produk Shopify yang dibuat
  status            String   @default("synced") // synced, pending
  printArea         Json?               // Area cetak dari Printful
  mockupUrls        Json?               // URL mockup dari Printful
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([shop, printfulProductId])
  @@index([shop])
  @@index([shopifyProductId])
}
```

---

## 📡 API Endpoints

### Koneksi
| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/imcst_api/printful/status` | Cek status koneksi Printful |
| `POST` | `/imcst_api/printful/connect` | Simpan API key Printful |
| `DELETE` | `/imcst_api/printful/disconnect` | Putus koneksi |

### Katalog
| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/imcst_api/printful/catalog` | Lihat semua produk katalog Printful |
| `GET` | `/imcst_api/printful/catalog/:id` | Detail produk + variasi + print area |
| `GET` | `/imcst_api/printful/catalog/:id/mockups` | Template mockup (kaos dari depan, belakang, dll) |

### Import & Sinkronisasi
| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/imcst_api/printful/import` | Import produk Printful → buat produk Shopify + config CustomFly |
| `GET` | `/imcst_api/printful/products` | Daftar produk yang sudah diimport |
| `POST` | `/imcst_api/printful/sync/:productId` | Re-sync harga/stok satu produk |

### Order fulfillment
| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/imcst_api/printful/order` | Kirim order ke Printful (dipanggil dari webhook Shopify) |

---

## 🔄 Alur Kerja Detail

### Alur Import Produk

```
1. Merchant buka halaman "Printful" di CustomFly Admin
2. Masukkan API Key Printful (dari dashboard Printful)
3. CustomFly simpan ke DB (PrintfulConnection)
4. Merchant browse katalog → pilih "Bella Canvas 3001 Unisex Tee"
5. Klik "Import ke Shopify"

Backend otomatis:
   a. GET /printful/catalog/{id}/techniques → dapat print_area, mockup_url
   b. GET /printful/catalog/{id}/variants   → dapat variasi ukuran + warna + harga
   c. Shopify: productCreate mutation → buat produk dengan semua variasi
   d. Shopify: productVariantsBulkUpdate → set harga per variasi
   e. CustomFly: upsert MerchantConfig:
      - baseImage = mockup URL depan dari Printful
      - printArea = { width, height } dari spesifikasi Printful
      - paperSize = 'Custom' dengan dimensi area cetak (inch → px)
   f. DB: simpan PrintfulProduct (link printfulId ↔ shopifyId)

6. Merchant langsung diarahkan ke Designer untuk produk baru
```

### Alur Order ke Printful

```
1. Pelanggan selesaikan order di Shopify
2. Shopify kirim webhook orders/paid
3. Backend cek: apakah produk terhubung ke Printful?
4. Jika ya:
   a. Ambil design JSON dari SavedDesign
   b. Export design sebagai PNG/PDF (Puppeteer atau via existing export)
   c. POST ke Printful API /orders dengan:
      - external_id: shopify_order_id
      - items: [{variant_id, quantity, files: [{url: design_url}]}]
      - recipient: {name, address1, city, …}
5. Simpan printful_order_id → update di DB
6. Printful proses, produksi, kirim ke pelanggan
```

---

## 🖥️ Frontend (Admin UI)

### Halaman baru: Printful Tab

Tambahkan tab baru di Admin Panel CustomFly:

```
Navbar: Products | Assets | Templates | AI | [Printful] ← Baru
```

#### Halaman Printful:

**Tab 1: Koneksi**
- Status koneksi (terhubung/tidak)
- Form input API Key
- Info: Toko Printful yang terhubung

**Tab 2: Katalog**
- Grid produk dari Printful (kaos, hoodie, mug, tote bag, dll)
- Filter: kategori, teknik cetak (DTG, embroidery, sublimation)
- Card produk: gambar mockup, nama, range harga
- Tombol "Import ke Shopify"

**Tab 3: Produk Diimport**
- Daftar produk yang sudah diimport
- Status sinkronisasi
- Tombol "Buka Designer", "Sync Ulang", "Hapus"

---

## 🔌 Printful API yang Dipakai

### Autentikasi
Gunakan **Access Token** (Private Token dari dashboard Printful):
```
Authorization: Bearer {access_token}
Base URL: https://api.printful.com/v2/
```

### Endpoint Printful yang relevan:
| Endpoint | Kegunaan |
|----------|----------|
| `GET /catalog-products` | Semua produk katalog |
| `GET /catalog-products/{id}` | Detail produk |
| `GET /catalog-products/{id}/catalog-variants` | Variasi (warna, ukuran) |
| `GET /catalog-products/{id}/techniques` | Info print area |
| `GET /catalog-products/{id}/mockup-templates` | Template mockup/gambar produk |
| `POST /orders` | Buat order baru ke Printful |
| `GET /orders/{id}` | Status order |
| `POST /webhooks` | Daftarkan webhook Printful |

---

## 🗄️ Database Schema Update

```prisma
// Tambah di schema.prisma

model PrintfulConnection {
  id          String   @id @default(uuid())
  shop        String   @unique
  accessToken String
  storeId     String?
  connected   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shop])
}

model PrintfulProduct {
  id                String   @id @default(uuid())
  shop              String
  printfulProductId String
  shopifyProductId  String?
  printArea         Json?
  mockupUrls        Json?
  status            String   @default("synced")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([shop, printfulProductId])
  @@index([shop])
  @@index([shopifyProductId])
}
```

---

## 📋 Checklist Implementasi

### Phase 1 — Koneksi & Katalog (Prioritas: 🔴 Critical)

#### Backend
- [ ] Install dependency: `axios` (sudah ada?) 
- [ ] Buat `backend/services/printfulService.js` — wrapper Printful API
- [ ] Buat `backend/routes/printful.routes.js`
- [ ] Tambah model `PrintfulConnection` ke `schema.prisma`
- [ ] Tambah model `PrintfulProduct` ke `schema.prisma`
- [ ] Jalankan `npx prisma migrate dev --name add-printful`
- [ ] Daftarkan route di `server.js`
- [ ] Endpoint: `GET /printful/status`
- [ ] Endpoint: `POST /printful/connect` (simpan API key)
- [ ] Endpoint: `GET /printful/catalog` (proxy ke Printful)
- [ ] Endpoint: `GET /printful/catalog/:id` (detail + teknik cetak)

#### Frontend
- [ ] Buat `frontend/src/pages/PrintfulPage.tsx`
- [ ] Tambah tab "Printful" di navigasi Admin
- [ ] Tab Koneksi: form API key + status
- [ ] Tab Katalog: grid produk dari API

---

### Phase 2 — Import Produk (Prioritas: 🔴 Critical)

#### Backend
- [ ] Endpoint: `POST /printful/import`
  - [ ] Fetch detail produk Printful (variasi, harga, print area)
  - [ ] Shopify GraphQL: `productCreate` + `mediaCreate`
  - [ ] Auto-set harga (Printful retail price + margin)
  - [ ] Upsert `MerchantConfig` (baseImage, printArea, paperSize)
  - [ ] Simpan ke `PrintfulProduct`

#### Frontend
- [ ] Tombol "Import ke Shopify" di card produk katalog
- [ ] Modal konfirmasi (pilih margin harga, judul produk)
- [ ] Loading state + toast sukses
- [ ] Redirect ke Designer setelah import

---

### Phase 3 — Fulfillment Order (Prioritas: 🟡 Penting)

#### Backend
- [ ] Update `webhooks.routes.js` — tangani `orders/paid`
- [ ] Cek apakah order item terkait Printful
- [ ] Export design PNG via endpoint yang sudah ada
- [ ] Upload file ke S3 (sudah ada `s3Service.js`)
- [ ] POST ke Printful `/orders`
- [ ] Simpan `printful_order_id`

---

### Phase 4 — Sync & Manajemen (Prioritas: 🟢 Nice to have)

- [ ] Endpoint `POST /printful/sync/:productId`
- [ ] Sync harga dari Printful ke Shopify variant
- [ ] Printful webhook: order status update
- [ ] Tab "Produk Diimport" di frontend

---

## 💰 Pertimbangan Harga

Saat import produk, merchant bisa set margin:

```
Harga Printful (base cost): $10.00
Margin merchant: +50%
Harga jual di Shopify: $15.00
```

Bisa dibuat:
- Margin flat (persentase, misal 50%)
- Margin manual (merchant set sendiri per produk)
- Minimum harga (tidak bisa di bawah base cost)

---

## 🔒 Keamanan

- API Key Printful disimpan **terenkripsi** di database (atau minimal tidak di-log)
- Setiap request ke Printful menggunakan API key dari DB (per shop) — tidak hardcode
- Validasi bahwa `shop` yang request sesuai dengan `PrintfulConnection.shop`
- Rate limiting untuk endpoint catalog (10 req/min per shop)

---

## 📊 Estimasi Waktu

| Phase | Estimasi | Prioritas |
|-------|----------|-----------|
| Phase 1: Koneksi + Katalog | 3–4 hari | 🔴 Critical |
| Phase 2: Import Produk | 3–4 hari | 🔴 Critical |
| Phase 3: Order Fulfillment | 2–3 hari | 🟡 Penting |
| Phase 4: Sync & Manajemen | 2 hari | 🟢 Nice to have |
| **Total** | **~10–13 hari** | |

---

## 🧪 Verifikasi & Testing

### Testing Phase 1 (Koneksi)
1. Minta Printful API key dari akun test Printful
2. `POST /imcst_api/printful/connect` → pastikan tersimpan di DB
3. `GET /imcst_api/printful/status` → pastikan `connected: true`
4. `GET /imcst_api/printful/catalog` → pastikan list produk muncul

### Testing Phase 2 (Import)
1. Pilih satu produk dari katalog (misal: Bella Canvas 3001)
2. Klik "Import ke Shopify"
3. Buka Shopify Admin → pastikan produk baru muncul dengan semua variasi
4. Buka CustomFly Designer untuk produk tersebut → pastikan:
   - Base image = mockup Printful
   - Print area sesuai spesifikasi Printful
5. Lakukan kustomisasi → simpan design

### Testing Phase 3 (Order)
1. Buat test order di Shopify untuk produk Printful
2. Trigger webhook `orders/paid` (Shopify CLI atau manual)
3. Cek Printful dashboard → order harus muncul dengan file design

---

## 📝 Referensi

- [Printful API v2 Docs](https://developers.printful.com/docs/)
- [Printful Catalog API](https://developers.printful.com/docs/#tag/Catalog)
- [Printful Orders API](https://developers.printful.com/docs/#tag/Orders)
- [Shopify productCreate GraphQL](https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/productCreate)

---

**Dibuat oleh**: AI Assistant CustomFly  
**Terakhir diupdate**: 2026-02-20
