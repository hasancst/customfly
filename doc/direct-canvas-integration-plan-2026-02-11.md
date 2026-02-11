# Plan Integrasi Canvas Direct Customize (Physical-First) - Completed

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

## Implementasi Terlaksana

### 1. Fondasi Dimensi Fisik
- Mengimplementasikan konstanta standar internasional dalam `DirectProductDesigner.tsx`:
    - `A4`: 210 x 297 mm
    - `A3`: 297 x 420 mm
    - `Letter`: 8.5 x 11 inch
- Menghapus logika fallback `1000px` yang statis.

### 2. Rendering "Naked Canvas"
- Melepaskan canvas dari layout admin agar terintegrasi sempurna dengan tema storefront.
- Background container dibuat `transparent` agar bleed area menyatu dengan background tema.

### 3. Resilience & Bug Fixes
- **NaN Hardening**: Proteksi pada kalkulasi masking di `Canvas.tsx`.
- **CSS String Fix**: Memperbaiki format string template di `DraggableElement.tsx`.
- **Admin Sync Fix**: Memperbaiki bug simpan base image yang sebelumnya tersimpan sebagai teks `'none'`.

---

## Status Akhir
- [x] Fondasi Dimensi Fisik (A3, A4, A5, Letter, dll)
- [x] Sinkronisasi Admin State & Props
- [x] Strategi Naked Canvas (Transparent Background)
- [x] Fix Zero-Visibility Elements (NaN checks)
- [x] Fix Broken Mockup (Base Image URL Sync)

## Verifikasi Sukses
- Ukuran Canvas di Storefront = Ukuran Canvas di Admin Preview (Pixel-Perfect Reflection).
- Aspek rasio sesuai standar fisik tanpa terpotong.
- Mockup tersinkronisasi sempurna dari admin.
