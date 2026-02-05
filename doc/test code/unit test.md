# 🧪 Test Documentation - Storefront Designer

Sistem pengetesan ini mencakup seluruh fungsionalitas aplikasi, dipisahkan menjadi dua kategori utama.

## 📁 Navigasi Pengetesan
- [**Unit Testing**](#-unit-tests-detail): Logika komponen dan fungsi matematika.
- [**Regression Testing**](file:///www/wwwroot/custom.local/doc/regression.md): Ketahanan sistem dan persistensi data.

## 📊 Status Terakhir (Update: 1 Feb 2026)
| Bagian | Status | Detail | Tests |
| :--- | :--- | :--- | :--- |
| **Admin & Backend** | ✅ PASSED | Normalisasi, Pricing, Security, API | 12/12 |
| **Public & Frontend** | ✅ PASSED | UX, Variant, Text, Monogram, Character Limits | 31/31 |

---

## ⚙️ Admin & Backend (Integrity Focus)
Bagian ini mencatat protokol pengetesan untuk fungsi administratif dan integrasi data API.

### 📁 File Terkait
- [**backend-unit.test.js**](file:///www/wwwroot/custom.local/backend/tests/backend-unit.test.js) (Data & Pricing)
- [**backend-integration.test.js**](file:///www/wwwroot/custom.local/backend/tests/backend-integration.test.js) (Security & Middleware)
- [**api.test.js**](file:///www/wwwroot/custom.local/backend/tests/api.test.js) (Parsers)

### ✅ Skenario Unit Test
1. **Normalisasi Data Shopify**
   - **Product & Variant Mapping**: Memastikan data mentah dari Shopify dikonversi ke format internal desainer.
   - **Graphic ID (GID) Mapping**: Memastikan `gid` Shopify dipetakan ke numeric `id` secara konsisten.
2. **Logika Harga Tambahan**
   - **Text Pricing**: Verifikasi kalkulasi harga per karakter dengan *free allowance* dan *min/max charge*.
3. **Asset Parsing**
   - **Colors/Fonts**: Memastikan string CSV dari database diubah menjadi array objek UI.

---

## 🎨 Public & Frontend (Storefront Focus)
Bagian ini mencatat protokol pengetesan untuk antarmuka desainer yang digunakan oleh pelanggan (*Public Mode*).

### 📁 File Terkait
- [**VariantSelection.test.tsx**](file:///www/wwwroot/custom.local/frontend/src/components/VariantSelection.test.tsx) (Logic & Fallback)
- [**ContextualToolbar.test.tsx**](file:///www/wwwroot/custom.local/frontend/src/components/ContextualToolbar.test.tsx) (Filtering & UI)
- [**TextRegression.test.tsx**](file:///www/wwwroot/custom.local/frontend/src/components/TextRegression.test.tsx) (Format & Spacing)
- [**CharacterLimitEnforcement.test.tsx**](file:///www/wwwroot/custom.local/frontend/src/components/__tests__/CharacterLimitEnforcement.test.tsx) (Input Limits & Validation)

### ✅ Skenario Unit Test
1. **Seleksi Varian & Sinkronisasi Gambar**
   - **Smart Fallback**: Jika user memilih warna "Pink" di Size yang tidak ada, sistem otomatis mencari Size lain yang tersedia.
   - **Image Prioritization**: Gambar admin-custom diprioritaskan di atas gambar default Shopify.
2. **Filtering Aset Kontekstual**
   - **Font/Color Groups**: Toolbar hanya menampilkan aset yang diizinkan sesuai `assetGroup` elemen.
   - **UI Feedback**: Menampilkan state filter aktif di toolbar elemen.
3. **Logika Formatting Teks (Regression)**
   - **Case Transformation**: Memastikan teks mentah diubah menjadi Uppercase/Lowercase sesuai state tanpa korupsi data.
   - **Letter Spacing Slider**: Verifikasi perubahan state `letterSpacing` dari event slider toolbar dan sidebar.
   - **Curved Defaults**: Validasi inisialisasi elemen lengkung dengan parameter `curve: 20` dan `letterSpacing: 2`.
4. **Monogram Separation**
   - **Tool Isolation**: Pastikan tool "Add Text" tidak menampilkan opsi Monogram, dan tool "Monogram" tidak menampilkan "Text Shapes".
   - **Font Locking**: Monogram terkunci pada font khusus dan mengubah teks menjadi uppercase (max 3 chars).
5. **Character Limit Enforcement**
   - **Hard-Stop Typing**: Memastikan keyboard input diblokir setelah mencapai `maxChars` limit.
   - **Paste Protection**: Verifikasi text yang di-paste otomatis dipotong sesuai limit.
   - **Limit Synchronization**: Memastikan perubahan `maxChars` di Advanced Settings langsung diterapkan ke input.
   - **Uppercase Enforcement**: Validasi monogram memaksa semua input menjadi uppercase.
   - **Canvas Consistency**: Pastikan limit yang sama diterapkan saat edit inline di canvas.
   - **File**: [CharacterLimitEnforcement.test.tsx](file:///www/wwwroot/custom.local/frontend/src/components/__tests__/CharacterLimitEnforcement.test.tsx)
   - **Dokumentasi**: [character-limit-enforcement.md](file:///www/wwwroot/custom.local/doc/character-limit-enforcement.md)

---

## 🛠️ Shared Materials (Hoisted)
Untuk konsistensi, semua test menggunakan mock data dari:
- [**hoisted-materials.ts**](file:///www/wwwroot/custom.local/frontend/src/test/hoisted-materials.ts) (Frontend)
- [**hoisted-backend-materials.js**](file:///www/wwwroot/custom.local/backend/tests/hoisted-backend-materials.js) (Backend)

## 🚀 Cara Menjalankan
```bash
# Backend (Admin)
cd backend && npm test

# Frontend (Public)
cd frontend && npm test
```
