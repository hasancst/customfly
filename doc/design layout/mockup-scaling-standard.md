# 📏 Standard Logika Scaling Mockup (Base Image)

## 📅 Tanggal: 9 Februari 2026

## 🎯 Konsensus Standard
Untuk memastikan konsistensi visual antara Admin dan Public Storefront, logika scaling mockup (base image) harus mengikuti aturan **1:1 terhadap Canvas Width**.

### 1. Definisi Scale
*   **Scale 1.0 (100%)**: Lebar gambar mockup harus tepat sama dengan lebar kanvas (`currentWidth`), terlepas dari ukuran dimensi asli (pixel) file gambar tersebut.
*   **Scale 5.0 (500%)**: Gambar mockup akan diperbesar 5x lipat dari lebar kanvas.

### 2. Implementasi Teknis (`Canvas.tsx`)
Untuk menghindari batasan browser atau konflik CSS tema, implementasi harus menggunakan kombinasi dimensi fisik dan transformasi:

```tsx
// 1. Hitung dimensi dasar (100%) berdasarkan aspek rasio
const baseMockupWidth = currentWidth;
const aspect = imgNaturalHeight / imgNaturalWidth;
const baseMockupHeight = baseMockupWidth * aspect;

// 2. Terapkan scale menggunakan transform untuk stabilitas
style={{
  width: baseMockupWidth,
  height: baseMockupHeight,
  transform: `... scale(${baseImageProperties.scale || 1})`,
  maxWidth: 'none !important',
  maxHeight: 'none !important',
  minWidth: '0 !important',
  minHeight: '0 !important'
}}
```

### 3. Sinkronisasi Masking
Jika fitur `Use as Mask` aktif, kalkulasi area clipping desain HARUS menggunakan rumus yang sama agar elemen desain tetap selaras dengan bodi mockup (misal: layar HP) saat di-zoom.

---

## 🛡️ Langkah Pencegahan (Regression Checklist)
Setiap kali melakukan perubahan pada komponen `Canvas.tsx` atau sistem rendering, pastikan:

1.  [ ] **100% Scale Test**: Saat slider di posisi 100%, gambar mockup harus menyentuh sisi kiri dan kanan kanvas putih dengan presisi.
2.  [ ] **Upscale Test (500%)**: Gambar harus bisa membesar hingga menutupi seluruh area kerja tanpa terpotong oleh `overflow` atau `max-width` bawaan tema.
3.  [ ] **Mask Alignment**: Aktifkan "Use as Mask", perbesar gambar ke 400%, dan pastikan elemen desain di dalam "layar" tetap berada di posisi yang benar terhadap gambar latar.
4.  [ ] **Constraint Check**: Pastikan tidak ada `fit-content` yang menyebabkan gambar mengecil kembali ke ukuran aslinya jika ukuran asli lebih kecil dari kanvas.
