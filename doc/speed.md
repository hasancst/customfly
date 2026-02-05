# ⚡️ Rencana Optimasi Kecepatan Aplikasi

## Tujuan
- Mempercepat waktu buka aplikasi (Admin & Public Storefront)
- Tidak mengganggu fitur desain realtime (kanvas, tools, autosave)
- Menjaga stabilitas dan kualitas gambar/hasil produksi

## Kondisi Saat Ini (Sudah Ada)
- Build terpisah admin vs public via Vite dual entry dan manualChunks: admin-[hash].js, designer-storefront-[hash].js
- Komponen berat dipecah dengan React.lazy di Toolbar dan tools
- Lazy import gambar shape + atribut `loading="lazy"` pada komponen tertentu
- Backend menggunakan `compression()` untuk gzip/deflate
- Loader storefront mengambil CSS/JS dari Base URL (CDN atau App URL) dengan cache-busting
- Konversi WebP tersedia pada upload tertentu (`webp=true` untuk folder: gallery, admin-assets, swatches, customer-uploads)
- html2canvas diimpor dinamis hanya saat diperlukan (saat menyimpan/ekspor)

## Dampak Realtime Design
- Desainer core berbagi antara Admin/Public; mode dikendalikan dengan flag sehingga optimasi tidak mengubah perilaku kanvas
- Pemisahan bundle mengurangi beban awal Admin/Public tanpa menyentuh logika desain
- Lazy import hanya saat komponen dibuka, tidak mengganggu interaksi aktif di kanvas

## Rencana Implementasi
- Prioritas Tinggi
  - Perluas lazyload untuk semua preview/gallery/public images (atribut `loading="lazy"` dan IntersectionObserver untuk off-screen)
  - Tambah dukungan `picture/srcset` dengan fallback JPEG/PNG agar WebP efektif di semua browser
  - Aktifkan konversi WebP untuk `base-images` (opsional per merchant) dan pastikan jalur upload ikut mendukung
  - Set `Cache-Control` agresif untuk `/imcst_assets` di server/CDN (immutable, long max-age) karena sudah ada cache-busting `?v=<timestamp>`
- Prioritas Sedang
  - Prefetch/predl untuk bundle kritikal (admin nav, public designer) dengan resource hints
  - Kurangi ukuran vendor grafis: audit modul yang tidak dipakai dan pindahkan ke import dinamis saat fitur dibuka
  - Optimasi font: hanya load keluarga font saat dipakai; pertahankan mekanisme Google Fonts & @font-face dinamis
- Prioritas Rendah
  - Service Worker untuk cache statis non-kritis (ikon, font, CSS), hindari cache data desain
  - Analisis Lighthouse CI dan bundling report untuk tracking berkelanjutan

## Checklist Implementasi
- Sudah dibuat
  - Split bundle admin/public
  - React.lazy tools dan beberapa assets shape lazily
  - compression() di backend
  - Loader storefront dengan CDN toggle dan cache-busting
  - WebP saat upload untuk beberapa folder
  - html2canvas diimpor hanya saat simpan
- Perlu dibuat
  - Lazyload menyeluruh untuk gambar gallery/base/preview
  - picture/srcset dengan WebP fallback
  - WebP untuk base-images (opsional)
  - Header cache untuk `/imcst_assets`
  - Prefetch/predl untuk rute/asset utama
  - Audit vendor grafis untuk pengurangan ukuran
- Rencana ke depan
  - Service Worker cache statis ringan
  - Integrasi Lighthouse CI dan bundle analyzer
  - Monitoring waktu TTFB/TTI dan error rate

## Verifikasi & Pengukuran
- Lighthouse skor dan metrik (FCP, LCP, TTI, TBT)
- Ukuran bundle sebelum/sesudah
- Waktu muat halaman admin & public pada koneksi 3G/4G
- Dampak ke interaksi desain realtime (drag/zoom/save)

