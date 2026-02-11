# Plan Integrasi Canvas Direct Customize (Physical-First) - Rev 1

## Tujuan
Mengubah arsitektur canvas "Direct Customize" agar menggunakan **Dimensi Fisik (cm/mm/inch)** sebagai satu-satunya sumber kebenaran (*Source of Truth*), menggantikan ketergantungan pada unit Pixel (`px`) yang statis. Ini memastikan akurasi cetak (WYSIWYG) 100%.

## Perubahan Paradigma (Architectural Shift)

| Fitur | Pendekatan Lama (Pixel-Based) | Pendekatan Baru (Physical-First) |
| :--- | :--- | :--- |
| **Source of Truth** | Default `1000px` (Arbitrer) | **Setting Admin (cm/mm/inch)** |
| **Kalkulasi Ukuran** | Hardcoded di frontend | Dinamis: `Ukuran Fisik * PX_PER_UNIT` |
| **Aspek Rasio** | Terpaku pada kotak 1:1 | **100% Mengikuti Standar Kertas** (A4, A3, dll) |
| **Output Produksi** | Sulit dikonversi ke resolusi cetak | Sangat mudah dikonversi ke 300 DPI |

---

## Rencana Implementasi Detail

### 1. Fondasi Dimensi Fisik
- Mengimplementasikan konstanta standar internasional dalam unit fisik:
    - `A4`: 210 x 297 mm
    - `A3`: 297 x 420 mm
    - `Letter`: 8.5 x 11 inch
    - `Tabloid`: 11 x 17 inch
- Menghapus semua logika fallback `1000px` di `DirectProductDesigner.tsx`.

### 2. Konversi Dinamis (Rendering)
- Pixel hanya akan digunakan sebagai unit **display** di browser, bukan unit penyimpanan data.
- Rumus: `Display Width = Physical Width (from Admin) * Zoom Coefficient`.

### 3. Sinkronisasi Mockup & Properti
- Mockup (Base Image) akan diposisikan berdasarkan koordinat fisik yang direlatifkan ke ukuran kertas, bukan koordinat pixel absolut.
- Mendukung per-variant scaling yang sudah kita kerjakan sebelumnya.

---

## Checklist Implementasi

### Tahap 1: Fondasi & Logika Dimensi
- [ ] Buat konstanta `PAPER_DIMENSIONS` (murni dalam mm/inch).
- [ ] Buat helper `getPhysicalToPx(value, unit)` untuk konversi rendering.
- [ ] Update state `canvasWidth` dan `canvasHeight` di `DirectProductDesigner.tsx` agar 100% dinamis berdasarkan `config.paperSize`.

### Tahap 2: Sinkronisasi Admin State
- [ ] Pastikan `unit` admin (`cm`, `mm`, `inch`) ter-passing dengan benar.
- [ ] Inisialisasi `pages` dengan `baseImageProperties` admin tanpa fallback pixel keras.

### Tahap 3: Propagasi & Layout CSS
- [ ] Teruskan prop `showGrid`, `showRulers`, dan `baseImageColorMode` ke `Canvas.tsx`.
- [ ] Pastikan layout CSS `imcst-direct-designer` tidak memaksakan overflow atau padding yang merusak rasio dimensi fisik.

### Tahap 4: Verifikasi & QA
- [ ] Test ganti ukuran kertas di Admin (A4 -> Letter) dan cek apakah Storefront langsung berubah proposinya.
- [ ] Pastikan desain lama tetap tampil wajar (Backward Compatibility).

---

## Verifikasi Sukses
- Ukuran Canvas di Storefront = Ukuran Canvas di Admin Preview (Pixel-Perfect Reflection).
- Aspek rasio A4 (1 : 1.41) terlihat jelas di layar tanpa "terpotong" secara sembarangan.
