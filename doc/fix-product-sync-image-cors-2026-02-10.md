# Perbaikan Sinkronisasi Produk & Error Loading Gambar (10 Feb 2026)

## 1. Sinkronisasi Data Produk Shopify
**Masalah**: Perubahan variant (harga, gambar, opsi) di Shopify admin tidak langsung terbaca di antarmuka Customizer.
**Penyebab**: Data produk di-cache oleh browser atau hanya di-fetch sekali saat halaman dimuat pertama kali.
**Solusi**:
- Menambahkan **Cache-Busting** pada API call produk dengan menyertakan timestamp: `/imcst_api/products/${productId}?_t=${Date.now()}`.
- Mengimplementasikan **Auto-Refresh on Focus**: Aplikasi akan secara otomatis memperbarui data produk di background saat pengguna kembali ke tab Designer (event `window.focus`).
- Menambahkan callback `onRefreshProduct` pada `DesignerCore` untuk memungkinkan refresh manual di masa mendatang.

**File Terkait**:
- `frontend/src/pages/Designer.tsx`
- `frontend/src/components/DesignerCore.tsx`

---

## 2. Perbaikan Error Loading Gambar (CORS & Cache)
**Masalah**: Gambar Shopify sering gagal dimuat dengan error `net::ERR_CACHE_READ_FAILURE`.
**Penyebab**: Penambahan parameter `&imcst_cors=1` pada URL Shopify CDN. Gambar Shopify sudah mendukung CORS secara native, penambahan parameter ini justru mengganggu mekanisme cache browser.
**Solusi**:
- Menghapus penambahan parameter `imcst_cors=1` untuk URL yang berasal dari Shopify CDN.
- Logika proxy sekarang **hanya** diterapkan untuk URL dari S3 (AWS/Linode) yang memang memerlukan bypass CORS.
- Gambar Shopify sekarang dimuat langsung (`direct load`) dari CDN mereka, yang lebih cepat dan stabil.

**File Terkait**:
- `frontend/src/components/Canvas.tsx`

---

## 3. Pembersihan (Cleanup) Pengaturan Canvas
**Masalah**: Duplikasi dan inkonsistensi pengaturan ukuran canvas antara backend dan frontend.
**Tindakan**:
- Menghapus field `baseImageScale` dan `customCanvasSize` dari Prisma schema dan backend routes (karena diputuskan untuk menggunakan standar 1000x1000px).
- Menyederhanakan komponen `Canvas.tsx` dan `Summary.tsx` dengan menghapus slider skala dan input ukuran manual yang bersifat redundan.
- Standarisasi ukuran canvas utama tetap pada **1000x1000px** dengan base image terpusat.

**File Terkait**:
- `backend/prisma/schema.prisma`
- `backend/routes/products.routes.js`
- `frontend/src/components/Canvas.tsx`
- `frontend/src/components/Summary.tsx`
- `frontend/src/pages/GlobalSettingsDesigner.tsx`

---

## 4. System Placeholder Mockup (Custom Fly Branding)
**Masalah**: Jika produk tidak memiliki gambar di Shopify, tidak ada manual upload, dan tidak ada variant image, kanvas akan kosong atau menampilkan error.
**Solusi**:
- Membuat gambar placeholder sistem yang profesional dengan branding **"Custom Fly"**.
- Menetapkan gambar ini sebagai **ultimate fallback** di `DesignerCore.tsx`.
- Sekarang, kanvas dijamin tidak akan pernah kosong; jika semua sumber gambar (Shopify, Variant, Upload) tidak tersedia, sistem akan menampilkan mockup default ini.

**File Terkait**:
- `frontend/public/images/system-placeholder.png`
- `frontend/src/components/DesignerCore.tsx`
- `frontend/src/pages/GlobalSettingsDesigner.tsx`
