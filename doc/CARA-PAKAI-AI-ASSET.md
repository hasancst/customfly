# Cara Menggunakan AI untuk Asset Management

## Masalah yang Sudah Diperbaiki

Sebelumnya, ketika Anda bilang "tambah 5 shapes ke Custom Shapes", AI malah membuat group baru.
Sekarang AI sudah bisa membedakan antara:
- **Menambah item ke group yang sudah ada**
- **Membuat group baru**

## Cara Menggunakan

### 1. Menambah Item ke Group yang Sudah Ada

**Kata kunci:** tambah, tambahkan, masukkan, add, insert

**Contoh:**
```
"Tambah 5 shapes ke Customfly Shapes"
"Add 3 fonts to My Fonts"
"Masukkan warna merah dan biru ke Brand Colors"
```

**Yang akan dilakukan AI:**
1. Cari group yang sudah ada
2. Kalau tidak ketemu, tampilkan daftar group yang tersedia
3. Kalau ketemu, tambahkan item baru ke group tersebut
4. Item lama tetap ada, tidak hilang

### 2. Membuat Group Baru

**Kata kunci:** buat baru, create new, buat group

**Contoh:**
```
"Buat group baru dengan nama My Shapes dan isi 5 shapes"
"Create new color group called Brand Colors with 3 colors"
```

**Yang akan dilakukan AI:**
1. Buat group baru dengan nama yang Anda sebutkan
2. Isi dengan item yang Anda minta

## Format untuk Setiap Tipe Asset

### Shapes (Bentuk)
**Format:** Harus SVG lengkap!

❌ **SALAH:**
```
path: "M12 2l2.5..."
viewBox: "0 0 24 24"
```

✅ **BENAR:**
```
Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40'/></svg>
```

### Colors (Warna)
**Format:** `Nama|#HexCode`

**Contoh:**
```
Red|#FF0000, Blue|#0000FF, Green|#00FF00
```

### Fonts
**Format:** Nama font (satu per baris)

**Contoh:**
```
Arial
Helvetica
Roboto
```

### Gallery (Gambar)
**Format:** `Nama|URL`

**Contoh:**
```
Logo 1|https://example.com/logo1.jpg
Logo 2|https://example.com/logo2.jpg
```

### Options
**Format:** `Nama|Value`

**Contoh:**
```
Small|S, Medium|M, Large|L
```

## Contoh Penggunaan

### Contoh 1: Tambah Shapes
**Anda:** "Tambah 3 shapes ke Customfly Shapes"

**AI akan:**
1. Cari group "Customfly Shapes"
2. Ambil shapes yang sudah ada
3. Buat 3 shapes baru (SVG lengkap)
4. Gabungkan dengan yang lama
5. Update group

### Contoh 2: Tambah Fonts
**Anda:** "Add Arial, Helvetica, and Roboto to My Fonts"

**AI akan:**
1. Cari group "My Fonts"
2. Ambil fonts yang sudah ada
3. Tambahkan Arial, Helvetica, Roboto
4. Update group

### Contoh 3: Group Tidak Ketemu
**Anda:** "Tambah 5 shapes ke Group Yang Tidak Ada"

**AI akan:**
1. Cari group "Group Yang Tidak Ada"
2. Tidak ketemu
3. Tampilkan daftar group shapes yang tersedia:
   - Customfly Shapes
   - My Shapes
   - Default Shapes
4. Tanya Anda mau pakai yang mana

### Contoh 4: Buat Group Baru
**Anda:** "Buat group baru dengan nama Geometric Shapes dan isi 5 shapes geometris"

**AI akan:**
1. Buat group baru "Geometric Shapes"
2. Isi dengan 5 shapes geometris (circle, square, triangle, dll)
3. Selesai

## Kalau AI Masih Salah

Jika AI masih membuat shapes dengan format salah (hanya path, bukan SVG lengkap), jalankan:

```bash
node backend/auto_fix_shapes.cjs
```

Script ini akan otomatis memperbaiki format shapes yang salah.

## Tips

1. **Sebutkan nama group dengan jelas**
   - ✅ "Tambah ke Customfly Shapes"
   - ❌ "Tambah shapes" (tidak jelas ke group mana)

2. **Gunakan kata kunci yang jelas**
   - Untuk menambah: "tambah ke", "add to"
   - Untuk buat baru: "buat baru", "create new"

3. **Cek dulu nama group yang ada**
   - Buka halaman Assets di aplikasi
   - Lihat nama group yang sudah ada
   - Gunakan nama yang persis sama

## Dokumentasi Lengkap

Untuk AI developer, dokumentasi lengkap ada di:
- `doc/ai-distinguish-create-vs-add.md` - Panduan CREATE vs ADD
- `doc/ai-add-items-to-assets.md` - Panduan menambah item
- `doc/ai-shape-asset-strict-rules.md` - Aturan format shapes
- `doc/ASSET-MANAGEMENT-SUMMARY.md` - Ringkasan semua dokumentasi
- `.kiro/steering/asset-management-rules.md` - Aturan otomatis untuk AI

## Kesimpulan

✅ AI sekarang bisa membedakan "tambah ke group" vs "buat group baru"
✅ AI akan cek dulu apakah group ada sebelum menambah item
✅ AI akan tampilkan daftar group kalau tidak ketemu
✅ Format shapes harus SVG lengkap
✅ Setiap tipe asset punya separator yang berbeda

**Selamat menggunakan!** 🎉
