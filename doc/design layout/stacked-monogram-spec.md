# Stacked Monogram Design Specification

## Tanggal: 6 Februari 2026
## Status: Refined & Validated

Dokumen ini mencatat rasio posisi dan ukuran spesifik untuk tipe monogram 'Stacked' guna menjaga konsistensi visual pada update mendatang.

### 1. Komposisi Elemen
Monogram 'Stacked' terdiri dari 3 karakter:
- **Chars[0] (Top Left)**: Huruf kecil di bagian atas sisi kiri.
- **Chars[1] (Bottom Left)**: Huruf kecil di bagian bawah sisi kiri.
- **Chars[2] (Pillar Right)**: Huruf utama (besar) di sisi kanan yang memenuhi tinggi kanvas.

### 2. Koordinat & Sizing (viewBox 100x100)

| Elemen | Posisi X (%) | Posisi Y (%) | Font Size | Font Family |
| :--- | :--- | :--- | :--- | :--- |
| **A (Top Left)** | 19% | 45% | 149 | `Stacked-Top-Left` |
| **S (Bottom Left)** | 19% | 51% | 149 | `Stacked-Bottom-Left` |
| **D (Pillar Right)** | 75% | 50% | 160 | `Stacked-Tall-Right` |

### 3. Karakteristik Visual
- **Overlapping Style**: Huruf A dan S diposisikan sangat rapat (bahkan sedikit tumpang tindih secara vertikal) untuk menciptakan kesan "densely packed" yang premium.
- **Dynamic Selection Box**: Karena font berukuran besar (overflow container), kotak seleksi biru dan tombol kontrol (handles) diposisikan dengan offset `-30%` agar pas melingkupi seluruh area font tanpa menutupi huruf.
- **Horizontal Gap**: Terdapat celah bersih antara blok kiri (x: 19%) dan blok kanan (x: 75%) untuk memastikan keterbacaan.
- **Vertical Alignment**: Huruf utama di kanan (D) diposisikan tepat di tengah (y: 50%) dan bertindak sebagai jangkar visual.

### 4. Implementasi Kode (`DraggableElement.tsx`)
```tsx
if (monogramType === 'Stacked') {
  const chars = monogramText.substring(0, 3).split('');
  // ... svg rendering ditengah ...
}

// Logic untuk kotak seleksi yang "pas"
const isStacked = element.type === 'monogram' && element.monogramType === 'Stacked';
const selectionClass = isStacked ? '-inset-[30%]' : '-inset-[3px]';
const handlesInsetClass = isStacked ? '-inset-[30%]' : 'inset-0';
```

### 5. Catatan Perbaikan (Session 6 Feb)
- Memperbesar font A & S dari **146 → 149** (+2%).
- Menggeser X blok kiri dari **21% → 19%** (lebih ke kiri).
- Menyesuaikan **Selection Handles Offset** ke `-30%` agar pas melingkupi seluruh visual font.
