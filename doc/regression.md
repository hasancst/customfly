# 🛡️ Regression Testing - Storefront Designer

Dokumen ini mencatat skenario "Regression" untuk memastikan update fitur tidak merusak fungsi yang sudah stabil.

## 📊 Cakupan Regresi
- **Persistence**: Penyimpanan dan pengambilan desain.
- **Security**: Validasi App Proxy dan autentikasi admin.
- **Legacy Compatibility**: Asset ID matching dan mapping data lama.

## 📁 File Terkait
- [**backend-integration.test.js**](file:///www/wwwroot/custom.local/backend/tests/backend-integration.test.js) (Security & Middleware)
- [**regression_api.test.js**](file:///www/wwwroot/custom.local/backend/tests/regression_api.test.js) (Design Save & Asset ID)

---

## 🛠️ Skenario Regression Test (Automated)

### 1. Security & App Proxy
- **Signature Validation**: Memastikan HMAC-SHA256 Shopify App Proxy divalidasi dengan urutan parameter yang benar.
- **Auth Middleware**: Verifikasi bahwa token JWT didecode dan sesi offline dimuat sebelum akses ke Admin API.

### 2. Design Persistence
- **ID Matching**: Memastikan pencarian aset (Fonts/Colors) tetap bekerja meski ID tersimpan sebagai `String` vs `Number`.
- **Save Logic**: Mencegah overwrite desain secara tidak sengaja (Create vs Update logic).

### 3. Text Tools & Formatting
- **Case Transformation**: Memastikan teks berubah secara otomatis sesuai toggle (Uppercase/Lowercase) dan konsisten saat reload.
- **Letter Spacing Logic**: Verifikasi nilai letterSpacing tersimpan dan dirender dengan benar di Canvas 2D, SVG (curved), dan Monogram.
- **Curved Defaults**: Memastikan default curve (20) dan letter spacing (2) diterapkan secara otomatis pada elemen baru.

---

## 📝 Manual Regression Checklist

### A. Customer View (Public Designer)
- [✅] **Dropdown Visibility**: Klik variant dropdown, pastikan muncul di atas header (z-index check).
- [✅] **Linked Options**: Pilih Size "S" lalu ganti Color ke yang tidak ada di "S". Pastikan Size berganti otomatis ke yang tersedia.
- [✅] **Base Image Update**: Pastikan gambar kanvas berubah saat varian dipilih.
- [✅] **Text Case Toggle**: Klik icon "AA" di toolbar, pastikan teks berubah Uppercase/Lowercase secara instan.
- [✅] **Letter Spacing Slider**: Geser slider spasi, pastikan jarak antar huruf di kanvas ikut berubah.
- [✅] **Curved Text Spacing**: Tambahkan "Curved Up", pastikan huruf tidak menempel (default spacing 2px).

### B. Merchant View (Admin)
- [✅] **Option Groups**: Pastikan "Group Options" muncul di Text/Gallery tools sesuai pengaturan.
- [✅] **Storefront Eye Icon**: Klik icon mata di header, pastikan tab baru terbuka ke link produk Shopify yang benar.
- [✅] **Monogram Tool**: Klik tool "Monogram", pastikan hanya opsi "Monogram Styles" yang muncul (tanpa Text Shapes).
- [✅] **Monogram Resize**: Resize elemen monogram di canvas, pastikan font size ikut berubah (tidak hanya kotaknya).
- [✅] **Text Tool**: Klik tool "Text", pastikan hanya opsi "Text Shapes" yang muncul (tanpa Monogram Styles).
- [✅] **Backend Fonts**: Akses langsung file font (misal `/SZInterlocking.ttf`) di browser, pastikan ter-download (Status 200).

---

## ⚡ Deployment & Build Integrity
- [ ] **Frontend Build**: Jalankan `npm run build` di folder frontend.
- [ ] **Public Assets**: Cek `/imcst_assets/storefront.js` dapat diakses dari browser tanpa 404.
- [ ] **Prisma Sync**: Pastikan skema database tersinkronisasi (`npx prisma migrate status`).

*Terakhir diperbarui: 31 Januari 2026 (Restored Text Features Update)*
