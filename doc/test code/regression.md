# 🛡️ Regression Testing - Storefront Designer

Dokumen ini mencatat skenario "Regression" untuk memastikan update fitur tidak merusak fungsi yang sudah stabil.

## 📊 Cakupan Regresi
- **Persistence**: Penyimpanan dan pengambilan desain.
- **Security**: Validasi App Proxy dan autentikasi admin.
- **Legacy Compatibility**: Asset ID matching dan mapping data lama.
- **Export Fidelity**: Keaslian hasil ekspor (PNG, PDF, SVG, AI, EPS) dan fitur "Design Only".
- **Config Persistence**: Memastikan pengaturan output (File Type, DPI, dll) tersimpan otomatis.
- **Variant Management**: Penugasan gambar base/mockup spesifik ke varian produk.
- **Layout Management**: Kemampuan resize dan kustomisasi area kerja (Safe Area).

## 📁 File Terkait
- [**backend-integration.test.js**](file:///www/wwwroot/custom.local/backend/tests/backend-integration.test.js) (Security & Middleware)
- [**regression_api.test.js**](file:///www/wwwroot/custom.local/backend/tests/regression_api.test.js) (Design Save & Asset ID)

---

## 🛠️ Skenario Regression Test (Automated)

### 1. Security & App Proxy
- **Signature Validation**: Memastikan HMAC-SHA256 Shopify App Proxy divalidasi dengan urutan parameter yang benar.
- **Auth Middleware**: Verifikasi bahwa token JWT didecode dan sesi offline dimuat sebelum akses ke Admin API.

### 2. Design Persistence
- **ID Matching**: Memastikan pencarian aset (Fonts/Colors/Galleries) tetap bekerja menggunakan `String(id)` matching untuk mencegah kegagalan seleksi antara tipe data numeric (DB) dan string (UI).
- **Save Logic**: Mencegah overwrite desain secara tidak sengaja (Create vs Update logic).
- **Palette Persistence**: Verifikasi bahwa ID palet warna mockup (`selectedBaseColorAssetId`) tersimpan di database dan dimuat ulang dengan benar setelah refresh.

### 3. Text Tools & Formatting
- **Case Transformation**: Memastikan teks berubah secara otomatis sesuai toggle (Uppercase/Lowercase) dan konsisten saat reload.
- **Letter Spacing Logic**: Verifikasi nilai letterSpacing tersimpan dan dirender dengan benar di Canvas 2D, SVG (curved), dan Monogram.
- **Curved Defaults**: Memastikan default curve (20) dan letter spacing (2) diterapkan secara otomatis pada elemen baru.
- **Output Settings Auto-Save**: Verifikasi bahwa perubahan File Type (misal ke AI/PDF) dan DPI langsung tersimpan ke database tanpa perlu klik tombol Save manual.

### 4. Export & DOM Integrity
- **DOM Surgical Removal**: Memastikan elemen dengan class `.imcst-base-image` benar-benar dicabut dari DOM saat ekspor "Design Only" untuk menjamin tidak ada "ghosting" bodi produk pada file SVG/AI/EPS.
- **Vector Decoding**: Verifikasi output SVG/AI/EPS didecode dari XML murni (bukan base64 data-uri) agar kompatibel dengan Adobe Illustrator & CorelDraw.

---

## 📝 Manual Regression Checklist

### A. Customer View (Public Designer)
- [✅] **Dropdown Visibility**: Klik variant dropdown, pastikan muncul di atas header (z-index check).
- [✅] **Linked Options**: Pilih Size "S" lalu ganti Color ke yang tidak ada di "S". Pastikan Size berganti otomatis ke yang tersedia.
- [✅] **Base Image Update**: Pastikan gambar kanvas berubah saat varian dipilih.
- [✅] **Text Case Toggle**: Klik icon "AA" di toolbar, pastikan teks berubah Uppercase/Lowercase secara instan.
- [✅] **Letter Spacing Slider**: Geser slider spasi, pastikan jarak antar huruf di kanvas ikut berubah.
- [ ] **Curved Text Spacing**: Tambahkan "Curved Up", pastikan huruf tidak menempel (default spacing 2px).
- [ ] **Bridge/Curved Auto-height**: Gunakan fitur "Bridge" atau "Curve", pastikan area container otomatis membesar mengikuti lengkungan teks (tidak ada bagian yang terpotong/clipping).
- [ ] **Mockup Hole Punching**: Aktifkan "Use as Mask", geser desain ke layar HP. Pastikan desain terpotong tepat di pinggiran bodi HP.
- [ ] **Mockup Transparent Tint**: Pilih warna dari palet mockup. Pastikan hanya area layar (transparan) yang berubah warnanya, bodi asli produk tidak tertutup warna.
- [ ] **Base Image Drag & Zoom**: Geser mockup HP, ganti zoom ke 200%. Pastikan posisi relatif mockup terhadap canvas center tetap konsisten.
- [ ] **Image Upload replacement**: Pilih "Upload Placeholder" → Upload gambar baru. Pastikan gambar lama terganti sepenuhnya tanpa sisa ghosting.
- [ ] **Add Text Centering**: Klik "Add Text". Pastikan teks muncul tepat di tengah layar aktif, bukan di koordinat 0,0.
- [ ] **Crop Accuracy**: Lakukan crop pada gambar upload. Pastikan area yang tampil di kanvas sama persis dengan yang ada di modal preview crop.
- [ ] **Valid PDF Output**: Export desain dalam format PDF. Pastikan file dapat dibuka di Adobe Reader atau Browser Chrome (bukan corrupted).
- [ ] **ZIP PDF Layers**: Aktifkan "Separate Files" + Format PDF. Pastikan setiap file di dalam ZIP bisa dibuka secara individu sebagai PDF.
- [ ] **JS Background Removal**: Upload gambar dengan background solid → Aktifkan "Remove Background (JS)". Geser slider "Intensity", pastikan background hilang tanpa merusak subjek utama.
- [ ] **AI Background Removal**: Upload gambar kompleks → Aktifkan "Remove Background (AI)". Pastikan subjek terpotong rapi menggunakan server-side processing.
- [ ] **BG Removal Mode**: Ganti antara "Light Mode" (untuk bg putih) dan "Dark Mode" (untuk bg hitam). Pastikan pemilihan mode sesuai dengan warna background yang ingin dihapus.

### B. Export & Output Fidelity
- [ ] **Professional AI/EPS**: Export dalam format AI atau EPS. Buka di Illustrator/Inkscape, pastikan objek adalah **Vector Path** (bisa di-edit node-nya), bukan gambar piksel datar.
- [ ] **Professional SVG**: Export SVG → Buka di Browser. Pastikan tidak ada tulisan "XML style information error".
- [ ] **Design Only (No Mockup)**: Aktifkan "Design Only". Export ke format apapun (PNG/SVG/PDF). Pastikan bodi iPhone dan warna kuning latar belakang **100% Hilang**.
- [ ] **Settings Persistence**: Ganti File Type ke "PDF", ganti DPI ke "600". **Refresh Browser (F5)**. Pastikan saat kembali, pengaturan tetap "PDF" dan "600" (tidak balik ke PNG/300).
- [ ] **Multi-Side Export**: Tambahkan 2-3 Side (Back, Front, Sleeve). Export menggunakan "Separate Files by Type". Pastikan ZIP berisi folder/file untuk setiap sisi secara lengkap.
- [ ] **DPI Accuracy**: Export PNG dengan DPI 72 vs 300. Cek file properti, pastikan resolusi fisik (DPI) berubah sesuai pilihan.

### C. Merchant View (Admin)
- [✅] **Option Groups**: Pastikan "Group Options" muncul di Text/Gallery tools sesuai pengaturan.
- [✅] **Storefront Eye Icon**: Klik icon mata di header, pastikan tab baru terbuka ke link produk Shopify yang benar.
- [✅] **Monogram Tool**: Klik tool "Monogram", pastikan hanya opsi "Monogram Styles" yang muncul (tanpa Text Shapes).
- [✅] **Monogram Resize**: Resize elemen monogram di canvas, pastikan font size ikut berubah (tidak hanya kotaknya).
- [✅] **Text Tool**: Klik tool "Text", pastikan hanya opsi "Text Shapes" yang muncul (tanpa Monogram Styles).
- [✅] **Backend Fonts**: Akses langsung file font (misal `/SZInterlocking.ttf`) di browser, pastikan ter-download (Status 200).
- [ ] **Variant Image Assignment**: Di modal "Base Asset", pilih varian spesifik (misal "Merah / S"). Upload gambar custom. Pastikan icon checklist hijau muncul HANYA pada varian tersebut.
- [ ] **Variant Image Fallback**: Hapus gambar custom pada varian "Merah / S". Pastikan gambar kembali ke default Shopify atau Global Image.
- [ ] **Safe Area Resizing**: Di area admin, drag handle pojok/sisi Safe Area (garis putus-putus biru). Pastikan area membesar/mengecil sesuai gerakan mouse dan tersimpan posisinya.
- [ ] **Mockup Palette Saving**: Pilih palet warna baru di "Mockup Color". Simpan. Refresh halaman. Pastikan palet yang dipilih tetap aktif (tidak kembali ke "Select Palette").

### D. Character Limit Enforcement (Critical)
**Dokumentasi**: [character-limit-enforcement.md](file:///www/wwwroot/custom.local/doc/character-limit-enforcement.md)

#### Monogram Tool
- [ ] **Default Limit**: Add monogram → verify default 3 chars → try typing 4th char → should be blocked
- [ ] **Custom Limit**: Set maxChars to 5 in Advanced Settings → verify typing stops at 5 chars
- [ ] **Limit Sync**: Change maxChars from 3 to 2 → verify input immediately respects new limit
- [ ] **Canvas Edit**: Double-click monogram → verify same limit applies → typing blocked at limit
- [ ] **Uppercase**: Verify all monogram input is forced to uppercase (toolbar + canvas)
- [ ] **Paste Protection**: Copy "ABCDEFGH" → paste into 3-char monogram → verify only "ABC" appears

#### Text Tool
- [ ] **No Limit**: Set maxChars to 0 → verify can type freely (default 100 char browser limit)
- [ ] **Custom Limit**: Set maxChars to 20 → verify typing stops exactly at 20 chars
- [ ] **Textarea**: Switch to textarea → set limit 50 → verify same enforcement
- [ ] **Limit Sync**: Change maxChars from 20 to 10 → verify input respects new limit immediately
- [ ] **Canvas Edit**: Double-click text element → verify character counter shows correct limit
- [ ] **Visual Indicator**: Type near limit → verify counter turns red when reaching maxChars

#### Specialized Tools
- [ ] **Property Sync**: Change maxChars in Advanced Settings → verify local state updates
- [ ] **Dependency Array**: Verify `selectedElement?.maxChars` is in useEffect dependencies

---

## ⚡ Deployment & Build Integrity
- [ ] **Frontend Build**: Jalankan `npm run build` di folder frontend.
- [ ] **Public Assets**: Cek `/imcst_assets/storefront.js` dapat diakses dari browser tanpa 404.
- [ ] **Prisma Sync**: Pastikan skema database tersinkronisasi (`npx prisma migrate status`).

*Terakhir diperbarui: 5 Februari 2026 (Variant Assignment, Safe Area Resize, Palette Persistence)*
