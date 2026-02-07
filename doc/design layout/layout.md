# Dokumentasi Struktur Layout & Komponen Aplikasi

Dokumen ini mendefinisikan struktur layout aplikasi dan memisahkan secara jelas antara **Admin (Merchant)** dan **Frontend Publik (Customer)**.

Tujuannya adalah agar pengembang tidak bingung menentukan file mana yang harus dimodifikasi untuk setiap fitur.

---

## 1. Ringkasan Navigasi

| Area | Pengguna | Fungsi Utama | File Entry Point (Route) |
|------|----------|--------------|--------------------------|
| **ADMIN** | Merchant / Admin | Membuat & Mengatur Desain | `src/pages/Designer.tsx` |
| **PUBLIK** | Customer / Pembeli | Kustomisasi & Beli Produk | `src/pages/DesignerPublic.tsx` |

---

## 2. Blok Admin (Merchant Interface)
Area ini penuh dengan alat (tools) untuk membuat template.

### Komponen Utama:
*   **Core Wrapper**: `src/components/DesignerCore.tsx`
    *   *Penyebutan*: "Admin Core"
    *   *Fungsi*: Mengatur logika utama admin (Undo, Redo, Save Template, Shortcuts).

*   **Sidebar Kiri (Tools)**: `src/components/Toolbar.tsx`
    *   *Penyebutan*: "Toolbar Admin"
    *   *Fungsi*: Tombol untuk menambah elemen (Add Text, Add Image, Shapes, Upload).
    *   *Edit ini jika*: Ingin menambah alat baru atau mengubah ikon alat di sisi kiri.

*   **Sidebar Kanan (Layers)**: `src/components/Summary.tsx`
    *   *Penyebutan*: "Layer Panel" / "Summary"
    *   *Fungsi*: Mengatur urutan layer, hide/lock item. Di tampilan **Publik**, panel ini juga menampung tombol utama **Add to Cart** di bawah daftar layers.

*   **Header Atas**: `src/components/Header.tsx`
    *   *Penyebutan*: "Header"
    *   *Fungsi*: Tombol Save, Back, dan judul Project.

---

## 3. Blok Frontend Publik (Customer Interface)
Area ini lebih sederhana dan fokus pada input data customer.

### Komponen Utama:
*   **Core Wrapper**: `src/components/DesignerOpenCore.tsx`
    *   *Penyebutan*: "Public Core"
    *   *Fungsi*: Logika "Add to Cart", validasi input, dan rendering tampilan publik.

*   **Sidebar Kiri (Input Form)**: `src/components/PublicCustomizationPanel.tsx`
    *   *Penyebutan*: "Customer Panel" / "Form Input"
    *   *Fungsi*: **PENGGANTI TOOLBAR**. Berisi form input dimana customer mengetik teks atau memilih opsi.
    *   *Ciri Khas*: Berisi input field, color picker, dan tombol "Reset Design". (Catatan: Tombol "Add to Cart" telah dipindahkan ke Sidebar Kanan agar alur review desain lebih intuitif).
    *   *Edit ini jika*: Ingin mengubah tampilan form input customer, layout input field, atau styling panel samping customer.

*   **Canvas (Tengah)**: `src/components/Canvas.tsx`
    *   *Penyebutan*: "Canvas"
    *   *Fungsi*: Menampilkan preview visual. (Sama dengan admin, tapi interaksi dibatasi).

---

## 4. Komponen Bersama (Shared)
Komponen ini dipakai di Admin DAN Publik.

| Komponen | File | Keterangan |
|----------|------|------------|
| **Canvas** | `src/components/Canvas.tsx` | Area kerja visual. Rendering elemen terjadi di sini. |
| **Contextual Toolbar** | `src/components/ContextualToolbar.tsx` | Bar melayang yang muncul saat elemen diklik (Ganti font, warna, dll). |
| **Draggable Element** | `src/components/DraggableElement.tsx` | Wrapper untuk setiap item di atas kanvas (menangani drag & resize). |
| **Header** | `src/components/Header.tsx` | Bar navigasi atas (Judul, Save Button). |

---

## 5. Cheat Sheet: File Mana yang Harus Diedit?

Gunakan panduan ini saat ada request perubahan:

*   **"Ubah tampilan tombol Add Text di Admin"** -> Edit `src/components/Toolbar.tsx`
*   **"Ubah tampilan form input nama di halaman pembeli"** -> Edit `src/components/PublicCustomizationPanel.tsx`
*   **"Ubah logika penyimpanan template"** -> Edit `src/components/DesignerCore.tsx`
*   **"Ubah logika Add to Cart"** -> Edit `src/pages/DesignerPublic.tsx` atau `src/components/DesignerOpenCore.tsx`
*   **"Ubah cara render teks/gambar"** -> Edit `src/components/Canvas.tsx`

---

## 6. Standarisasi Font & Ikon

Aplikasi ini menggunakan sistem standarisasi untuk memastikan konsistensi visual antara **Admin Backend** dan **Frontend Public**.

### 6.1 Font Family
Seluruh aplikasi menggunakan system font stack yang sama:
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

### 6.2 Base Font Size
- **Base Size**: `16px`
- Semua input, textarea, dan select menggunakan `16px` untuk konsistensi dan aksesibilitas

### 6.3 Typography Scale

| Elemen | Ukuran | Font Weight | Penggunaan |
|--------|--------|-------------|------------|
| **Heading Large** | 20px | 700 (Bold) | Judul utama halaman |
| **Heading Medium** | 18px | 700 (Bold) | Sub-judul section |
| **Heading Small** | 16px | 600 (Semibold) | Judul card/panel |
| **Body Medium** | 16px | 400 (Normal) | Teks konten utama |
| **Body Small** | 14px | 400 (Normal) | Teks sekunder |
| **Caption** | 12px | 400 (Normal) | Label kecil, metadata |

### 6.4 Icon Sizes

| Class | Ukuran | Penggunaan |
|-------|--------|------------|
| `.icon-sm` atau `w-4 h-4` | 16px × 16px | Ikon kecil dalam teks |
| `.icon-md` atau `w-5 h-5` | 20px × 20px | **Standar default** untuk semua ikon |
| `.icon-lg` atau `w-6 h-6` | 24px × 24px | Ikon besar untuk aksi utama |

### 6.5 Button Typography
- **Font Weight**: `600` (Semibold)
- **Letter Spacing**: `0.01em`
- **Font Size**: 
  - Small: `14px`
  - Medium: `16px`
  - Large: `18px`

### 6.6 File Konfigurasi

#### Admin Interface
File: `src/styles/admin.css`
- Override Shopify Polaris styles
- Standardisasi ukuran font dan ikon untuk komponen Polaris
- Memastikan konsistensi dengan public interface

#### Public Interface
File: `src/styles/index.css`
- Base styling untuk frontend public
- Icon size classes
- Typography standardization

### 6.7 Panduan Penggunaan

**DO:**
- ✅ Gunakan `w-5 h-5` (20px) sebagai ukuran ikon default
- ✅ Gunakan `text-base` (16px) untuk body text
- ✅ Gunakan `font-semibold` atau `font-bold` untuk heading
- ✅ Gunakan system font stack yang sudah ditentukan

**DON'T:**
- ❌ Jangan gunakan ukuran font di bawah 12px (kecuali untuk metadata)
- ❌ Jangan gunakan ikon lebih kecil dari 16px
- ❌ Jangan override font-family kecuali untuk monogram/custom fonts
- ❌ Jangan gunakan `!important` kecuali untuk override Polaris

### 6.8 Contoh Implementasi

```tsx
// ✅ BENAR - Menggunakan standar
<Button className="h-12 text-base font-semibold">
  <Plus className="w-5 h-5 mr-2" />
  Add Element
</Button>

// ❌ SALAH - Ukuran tidak konsisten
<Button className="h-8 text-xs">
  <Plus className="w-3 h-3" />
  Add
</Button>
```

---

## 7. Catatan Penting

- Semua perubahan styling harus mengikuti standarisasi di atas
- Jika perlu ukuran khusus, diskusikan terlebih dahulu untuk memastikan konsistensi
- Testing harus dilakukan di kedua interface (Admin & Public) untuk memastikan tidak ada inkonsistensi visual
