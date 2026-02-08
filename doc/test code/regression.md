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
- **Scalability Fix (Design ID Persistence)**: Memastikan `designId` yang dikembalikan dari server pada save pertama disimpan dalam state dan digunakan untuk save/autosave berikutnya, mencegah terciptanya duplikasi data (multiple entries) untuk satu sesi edit yang sama.
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
- [✅] **Add to Cart Location**: Verifikasi tombol "Add to Cart" berada di sidebar kanan (Summary) tepat di bawah daftar Layers.
- [✅] **Designer Close Icon**: Klik ikon silang (X) di header desainer publik. Pastikan kembali ke halaman produk (redirect) atau menutup modal (modal mode).
- [✅] **Public Side Navigation**: Verifikasi navigasi antar sisi produk menggunakan tombol berjajar (bukan stepper) yang intuitif.
- [ ] **Character Limit Enforcement (Critical)**: Verifikasi limit karakter pada input teks dan monogram di sidebar customization.

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

---

### E. Variant-Specific Designs (New)
- [x] **Unique Design Toggle (Admin)**:
    - [x] Verify "Unique Design" switch appears for variants.
    - [x] **Unlinking**:
        - [x] Unlinking copies current design to `variantDesigns`.
        - [x] Variant-specific images (from legacy config) are promoted to `baseImage` for the unique design.
        - [x] Editing an unlinked design does *not* affect the global design.
    - [x] **Linking**:
        - [x] Linking back warns the user.
        - [x] Confirmed linking reverts to `globalDesigns`.
- [x] **Persistence**:
    - [x] Saving configuration persists `variantDesigns`.
    - [x] Reloading the page retains linked/unlinked states and specific designs.
- [x] **Public Frontend**:
    - [x] **URL Parameter**: `?variant=ID` correctly pre-selects the variant.
    - [x] **Variant Switching**: Switching options updates the design canvas.
    - [x] **Unique Designs**: Variants with unique designs load their specific elements/settings (including "Use as Mask").
    - [x] **Global Fallback**: Variants without unique designs correctly use the global design.
    - [x] **Base Image Resolution**: Legacy variant images, Admin-assigned mockups, and Shopify variant images resolve correctly in priority order.
- [x] **Automated Test Coverage**:
    - [x] **Toolbar Icons**: Memastikan semua icon Lucide (Undo2, Redo2, Grid3x3, Download, Ruler, dll) ter-mocking dengan benar agar tidak menyebabkan crash pada render test.
    - [x] **Variant Selection Workflow**: Verifikasi via `VariantSelection.test.tsx` untuk skenario auto-select, matching options, dan smart fallback.
    - [x] **Persistence Logic**: Verifikasi via `DesignerCore.test.tsx` bahwa `designId` di-update setelah save pertama untuk mencegah duplikasi.
    - [x] **Header Layout Fix**: Undo/Redo dipindahkan ke dalam Title Block untuk mencegah input "Design Name" collapsing pada layar kecil/sidebar terbuka.
    - [x] **Responsive Buttons**: Label tombol "Load" dan "Save" otomatis hidden pada layar < XL untuk menjaga ruang input design name.
    - [x] **Admin Layout Structure**: Koreksi nesting pada `DesignerCore` agar Canvas rander di bawah Top Bar/Nav (vertical stack), memperbaiki isu layout "canvas side-by-side".
- [ ] **Stacked Monogram Alignment**: Tambahkan elemen Stacked. Verifikasi huruf A dan S berada pada posisi rapat/tumpang tindih (y: 44%, 50%) dan memiliki ukuran yang hampir sama besar dengan huruf utama di kanan (fontSize 149, x: 19%).
- [ ] **Gallery Multi-Image Selection**:
    - [ ] Set "Max Images" > 1 pada Gallery Tool di Admin.
    - [ ] Di Public Designer, klik beberapa gambar di gallery.
    - [ ] Pastikan gambar bertambah di kanvas (tidak saling tindih sempurna).
    - [ ] Pastikan gambar addon **TIDAK MUNCUL** di sidebar kiri (Your Customization).
    - [ ] Pastikan gambar addon **MUNCUL** di panel Summary/Layer (kanan).
    - [ ] Klik icon Trash pada layer addon image, pastikan terhapus dari kanvas.

### F. Swatch, Dropdown, dan Checkbox (New)
- [x] **Swatch Support**:
    - [x] **Admin Area**:
        - [x] Tambahkan elemen Swatch di Admin Designer.
        - [x] Konfigurasi swatch dengan warna dan/atau gambar.
        - [x] Toggle "Show Preview in Canvas" - pastikan swatch muncul/hilang di canvas sesuai setting.
        - [x] Verifikasi swatch dapat di-link ke product variant options.
    - [x] **Public Frontend**:
        - [x] Swatch muncul di sidebar "Your Customization" dengan pilihan warna/gambar.
        - [x] Klik swatch warna - pastikan elemen berubah warna.
        - [x] Klik swatch gambar - pastikan gambar ter-load di elemen.
        - [x] Verifikasi selected swatch ditandai dengan checkmark dan border highlight.
        - [x] Swatch **TIDAK** muncul di canvas (hanya di sidebar customization).

- [x] **Dropdown Support**:
    - [x] **Admin Area**:
        - [x] Tambahkan elemen Dropdown di Admin Designer.
        - [x] Hapus "Font Group" dari Dropdown settings (simplified UI).
        - [x] Tambahkan opsi dropdown manual atau link ke asset group.
        - [x] Verifikasi tombol "Create Dropdown Option" muncul saat buat baru.
        - [x] Verifikasi tombol "Update Dropdown Option" muncul saat edit existing.
        - [x] Dropdown **TIDAK** muncul di canvas preview (hanya di layers panel).
    - [x] **Public Frontend**:
        - [x] Dropdown muncul di sidebar "Your Customization".
        - [x] Pilih opsi dari dropdown - pastikan hanya satu opsi terpilih (tidak semua jadi satu).
        - [x] Verifikasi opsi yang disimpan sebagai "Name|enabled" di admin ditampilkan sebagai "Name" saja (tanpa "|enabled").
        - [x] Verifikasi selected value tersimpan dengan benar di `el.text`.

- [x] **Checkbox Support**:
    - [x] **Admin Area**:
        - [x] Tambahkan elemen Checkbox di Admin Designer.
        - [x] Konfigurasi label dan placeholder.
        - [x] Toggle "Show label" - pastikan label muncul/hilang sesuai setting.
    - [x] **Public Frontend**:
        - [x] Checkbox muncul di sidebar "Your Customization".
        - [x] Klik checkbox - pastikan state berubah (checked/unchecked).
        - [x] Verifikasi checked state tersimpan di `el.checked`.
        - [x] Verifikasi label ditampilkan di samping checkbox.

- [x] **Button Support**:
    - [x] **Admin Area**:
        - [x] Tambahkan elemen Button di Admin Designer.
        - [x] Hapus "Font Group" dari Button settings (simplified UI).
        - [x] Konfigurasi button style (Solid, Outline, Soft) dan typography.
        - [x] Link button ke asset group untuk populate options.
        - [x] Enable/disable individual button options.
        - [x] Verifikasi tombol "Create Button Option" muncul saat buat baru.
        - [x] Verifikasi tombol "Update Dropdown Option" muncul saat edit existing.
        - [x] Button **TIDAK** muncul di canvas preview (hanya di layers panel).
    - [x] **Public Frontend**:
        - [x] Button options muncul di sidebar "Your Customization".
        - [x] Klik button - pastikan hanya satu option terpilih.
        - [x] Verifikasi button style (solid/outline/soft) diterapkan dengan benar.
        - [x] Verifikasi selected value tersimpan di element.
        - [x] Verifikasi required selection enforcement (jika diaktifkan).

- [x] **Drag-and-Drop Reordering**:
    - [x] **Toolbar Layers**:
        - [x] Verifikasi icon "Grip" (`GripVertical`) muncul di setiap elemen list.
        - [x] Geser elemen ke atas/bawah - pastikan urutan di list berubah.
        - [x] Cek ke kanvas - pastikan layering (z-index) berubah mengikuti urutan list (item bawah = layer atas).
        - [x] Verifikasi posisi list tetap stabil saat drag (no flickering).
    - [x] **Sticky Bottom Tools**:
        - [x] Tombol "Add More Tools" kini menempel di bawah list (fixed).
        - [x] List layer otomatis memanjang (`flex-1`) mengisi ruang sisa hingga menyentuh tombol Add More.

- [x] **Specialized Input Tools (Phone, Number, Date, Time)**:
    - [x] **Canvas Preview**:
        - [x] Input elements (Phone/Date) menampilkan nilai preview yang dikonfigurasi (`element.text`) di kanvas.
        - [x] Icon internal (Phone/Calendar) dihilangkan dari canvas preview untuk tampilan bersih.
        - [x] Elemen di kanvas bersifat `read-only` (tidak bisa diketik langsung di kanvas, harus via sidebar).
    - [x] **Styling Fidelity**:
        - [x] Verifikasi pengaturan Color, Stroke, dan Font Family diterapkan dengan benar pada preview di kanvas.
        - [x] Verifikasi perataan teks (Alignment) bekerja pada semua jenis input field.

- [x] **Monogram Enhancements**:
    - [x] **Advanced Styling**:
        - [x] Verifikasi fitur Stroke (Outline) bekerja pada semua varian Monogram (Vine, Diamond, Circle, Stacked).
        - [x] Verifikasi fitur Gradient (Linear) bekerja pada semua varian Monogram.
        - [x] Pastikan perubahan warna/stroke tersimpan di history (bisa undo/redo).

- [x] **Side Management UI**:
    - [x] **Page Switcher (Admin & Public)**:
        - [x] Navigasi step "Side X/Y" diganti menjadi tombol berjajar (Side-by-side buttons).
        - [x] Klik tombol side - pastikan kanvas berpindah ke side tersebut secara instan.
        - [x] Verifikasi indikator visual (border & active dot) muncul pada side yang aktif.
        - [x] **Management (Admin Only)**: Klik icon "More" pada side aktif, muncul opsi Rename dan Delete.
        - [x] **Add Side (Admin Only)**: Tombol "Add New Side" (Plus icon) berada di sebelah daftar tombol side.


---

### G. Global Settings & Branding (New)
- [x] **Global Configuration Persistence**:
    - [x] **Save Operation**: Verify clicking "Save Settings" triggers a successful API call (200 OK) and shows a success toast.
    - [x] **Circular Structure Fix**: Confirm that saving does NOT cause a JSON serialization error (browser console clean).
    - [x] **Input Triggers**: Change a setting (e.g., Header Title, Safe Area) → Click outside (blur) → Confirm "Settings Saved" appears automatically.
- [x] **Branding Inheritance (Runtime Override)**:
    - [x] **Admin Setup**: Set "Designer Header Title" to "My Custom Shop" and "Button Text" to "Start Designing" in Global Settings.
    - [x] **Product Isolation**: Go to a specific product that already has a saved design (and default titles).
    - [x] **Public Frontend**: Open that product in the storefront.
    - [x] **Verification**: Confirm the title is "My Custom Shop" (Global) and NOT "Product Customizer" (Local Default).
    - [x] **Cache Busting**: Update branding in Admin → Refresh Frontend → Changes appear immediately (timestamp busting).
- [x] **Apply API**:
    - [x] **Action**: Click "Apply to All Products".
    - [x] **Result**: Success toast appears.
    - [x] **Verification**: Verify that non-branding settings (e.g., Rulers, Units) are now identical across all products.

---
### H. Mockup Visibility & Theme Integration (New)
- [x] **Theme Element Isolation**: Verifikasi bahwa desainer tidak menyembunyikan gambarnya sendiri saat mencoba menyembunyikan media asli Shopify (Dawn/Sense theme compatibility).
- [x] **Placeholder Filtering**: Pastikan gambar dari Merchant Config selalu menang atas placeholder (`placehold.co`) yang mungkin tersimpan di data desain lama.
- [x] **Cache Reliability**: Verifikasi parameter `?t=timestamp` berhasil memicu pembaruan data fresh dari database (cache busting).
- [x] **Forced Visibility**: Pastikan base image menggunakan `!important` pada `display`, `opacity`, dan `visibility` untuk mencegah override dari CSS tema eksternal.

---
*Terakhir diperbarui: 8 Februari 2026 (Mockup Visibility Fix, Theme Integration Isolation)*
