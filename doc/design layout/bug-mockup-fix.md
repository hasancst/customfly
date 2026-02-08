# 🐛 Bug Fix: Mockup Image Not Displaying (Direct Customize Mode)

## 📅 Tanggal: 8 Februari 2026

## 🔴 Deskripsi Masalah
Pada mode "Direct Customize" (Storefront Integration), gambar mockup produk (base image) seringkali tidak tampil (blank putih), meskipun log menunjukkan gambar sudah ter-load.

## 🔍 Akar Masalah
Setelah investigasi mendalam, ditemukan 4 penyebab utama:
1.  **Shopify Theme Conflict**: Tema Shopify (Dawn, Sense, dll) seringkali memiliki skrip atau CSS yang secara otomatis menyembunyikan elemen media asli di halaman produk. Skrip integrasi kita secara tidak sengaja ikut menyembunyikan elemen mockup desainer saat melakukan pembersihan media asli.
2.  **Placeholder Overrides**: Data desain lama atau data default seringkali menyimpan URL `placehold.co`. Logika frontend sebelumnya tidak memfilter placeholder ini dengan cukup agresif, sehingga mengoverride gambar asli yang sudah dikonfigurasi di admin.
3.  **Caching**: Backend memiliki layer caching yang tidak selalu terhapus saat konfigurasi database berubah, menyebabkan data lama (placeholder) terus dikirim ke frontend.
4.  **Database Inconsistency**: Beberapa produk memiliki nilai `"none"` (string literal) pada kolom `baseImage` di database, yang secara salah dianggap sebagai URL yang valid namun kosong oleh frontend.

## 🛠️ Solusi & Perbaikan

### 1. Perbaikan Theme Integration (`DirectProductDesigner.tsx`)
Menambahkan pengecekan agar skrip "hide original media" melewati (skip) elemen yang berada di dalam `canvasRoot`.
```tsx
const media = parent.querySelectorAll('img, svg, video, ...');
media.forEach((el: any) => {
    if (canvasRoot.contains(el)) return; // JANGAN SEMBUNYIKAN MOCKUP KAMI
    el.style.display = 'none';
    el.style.opacity = '0';
});
```

### 2. Force Visibility & Z-Index (`Canvas.tsx`)
Menggunakan `!important` pada properti CSS kritis untuk memastikan tema Shopify tidak bisa melakukan override secara paksa.
```tsx
style={{
    display: 'block !important',
    opacity: '1 !important',
    visibility: 'visible !important',
    zIndex: 1, // Pastikan di bawah elemen desain tapi di atas background
    objectFit: 'contain'
}}
```

### 3. Backend Cache Busting (`public.routes.js`)
Menambahkan logika untuk menghapus cache secara paksa jika parameter timestamp (`t`) disertakan dalam request.
```javascript
if (t) {
    cache.del(cacheKey);
}
```

### 4. Placeholder Filtering (`DirectProductDesigner.tsx`)
Memperketat logika filter agar selalu memprioritaskan `config.baseImage` (data admin) jika `activePage.baseImage` (data desain tersimpan) berisi placeholder.

## ✅ Cara Verifikasi (Testing)
1. Buka produk di Storefront.
2. Pastikan gambar mockup produk muncul dengan benar.
3. Coba ganti varian, pastikan gambar mockup ter-update sesuai varian (jika dikonfigurasi).
4. Cek konsol browser, pastikan tidak ada error 404 pada gambar.

## 🛡️ Langkah Pencegahan (Regression)
- Selalu gunakan `!important` untuk `display` dan `visibility` pada elemen inti desainer di level storefront.
- Pastikan filter placeholder di `DirectProductDesigner` tetap aktif saat melakukan refactoring data loading.
