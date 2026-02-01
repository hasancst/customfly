# 🐛 Bug Fixes & Resolved Issues

Dokumen ini mencatat seluruh perbaikan teknis dan masalah yang telah diselesaikan, dipisahkan berdasarkan area sistem (Admin vs Public).

---

## 🔐 Admin Bug Fixes
Masalah teknis yang diselesaikan di sisi Dashboard Admin dan antarmuka Merchant.

### 🔴 Critical System Issues
1. **Admin Dashboard Authentication Failure**
   - **Symptom:** API `/imcst_api/*` mengembalikan redirect HTML atau error 500.
   - **Resolution:** Implementasi validasi JWT middleware di `server.js` dan update `useAuthenticatedFetch`.
2. **Asset Loading 400 Errors**
   - **Symptom:** Gagal memuat aset karena cache CDN.
   - **Resolution:** Implementasi dynamic cache-busting `?v={timestamp}`.
3. **Assets Route 404 Error**
   - **Symptom:** Akses `/assets` di admin mengembalikan 404.
   - **Resolution:** Migrasi static assets ke `/imcst_assets` dan pembersihan build lama dengan `emptyOutDir: true`.

### 🟠 Functional & Logic Bugs
4. **Missing Assets Navigation Menu**
   - **Symptom:** Tab "Assets" hilang saat edit produk.
   - **Resolution:** Menghapus block `!isDesigner` di `App.tsx` agar admin tetap bisa melihat menu.
5. **Asset not found in Detail View**
   - **Symptom:** Detail aset gagal load meski data ada.
   - **Resolution:** Standarisasi tipe data ID menggunakan `String(id)`.
6. **Data Synchronization Lag**
   - **Symptom:** Config baru tidak muncul di storefront.
   - **Resolution:** Penambahan invalidasi cache otomatis saat config disimpan.

### 🟡 UI/UX Polishing
7. **Missing Base Image Controls**
   - **Symptom:** Overlay dan mask toggle hilang.
   - **Resolution:** Restorasi section "Base Image" khusus untuk mode admin.

---

## 🌐 Public / User Bug Fixes
Masalah teknis yang diselesaikan di sisi antarmuka pelanggan (Storefront Designer).

### 🔴 Critical System Issues
1. **Storefront CORS Blocking**
   - **Symptom:** CSS/JS gagal dimuat di domain Shopify (CORS error).
   - **Resolution:** Menambahkan header `Access-Control-Allow-Origin` khusus di `server.js`.
2. **Public Designer "No Host Provided"**
   - **Symptom:** Error App Bridge saat customer mendesain.
   - **Resolution:** Isolasi route publik (`/imcst_public_api/public/*`) dari inisialisasi App Bridge.

### 🟠 Functional & Logic Bugs
3. **Bridge Text Clipping & Resizing**
   - **Symptom:** Teks melengkung terpotong atau mengecil secara akumulatif.
   - **Resolution:** Menggunakan `fontSize` sebagai base perhitungan tinggi area warping.
4. **Text Tool Logic & Double-Click Size**
   - **Symptom:** Tombol "Add Text" duplikat elemen; font edit membesar karena zoom.
   - **Resolution:** Update logic `handleAddText` dan standarisasi font size textarea.
5. **"Add to Cart" Missing Variant ID**
   - **Symptom:** Error 400 saat memasukkan desain ke keranjang.
   - **Resolution:** Menambahkan Variant Selection Top Bar agar variant ID Shopify terisi dengan benar.
6. **Image Addition Redundancy**
   - **Symptom:** Gagal mengganti placeholder gambar (selalu membuat layer baru).
   - **Resolution:** Implementasi deteksi `selectedElement` untuk mengganti source gambar.

### 🟡 UI/UX Polishing
7. **Redundant Zoom Controls**
   - **Symptom:** Control zoom ganda.
   - **Resolution:** Konsolidasi control ke bottom bar.
8. **Missing "Reset Design" for Customers**
   - **Resolution:** Mengaktifkan tombol Reset di mode publik.
9. **Missing Safe Area Clipping for Customers**
   - **Symptom:** Radius edit zone tidak terlihat.
   - **Resolution:** Mengaktifkan `showSafeArea` config dengan visual guides yang disembunyikan.

---
*Terakhir diperbarui: 31 Januari 2026*
