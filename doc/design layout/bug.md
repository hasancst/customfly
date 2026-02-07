# 🐛 Bug Fixes & Resolved Issues

Dokumen ini mencatat seluruh perbaikan teknis dan masalah yang telah diselesaikan, dipisahkan berdasarkan area sistem (Admin vs Public).

---

## 🔐 Admin Bug Fixes
Masalah teknis yang diselesaikan di sisi Dashboard Admin dan antarmuka Merchant.

### 🔴 Critical System Issues
1. **Admin Dashboard Authentication Failure**
   - **Symptom:** API `/imcst_api/*` mengembalikan redirect HTML atau error 500.
   - **Resolution:** Implementasi validasi JWT middleware di `server.js` dan update `useAuthenticatedFetch`.
2. **Asset Loading 400 Errors**
   - **Symptom:** Gagal memuat aset karena cache CDN.
   - **Resolution:** Implementasi dynamic cache-busting `?v={timestamp}`.
3. **Assets Route 404 Error**
   - **Symptom:** Akses `/assets` di admin mengembalikan 404.
   - **Resolution:** Migrasi static assets ke `/imcst_assets` dan pembersihan build lama dengan `emptyOutDir: true`.

### 🟠 Functional & Logic Bugs
4. **Missing Assets Navigation Menu**
   - **Symptom:** Tab "Assets" hilang saat edit produk.
   - **Resolution:** Menghapus block `!isDesigner` di `App.tsx` agar admin tetap bisa melihat menu.
5. **Asset not found in Detail View**
   - **Symptom:** Detail aset gagal load meski data ada.
   - **Resolution:** Standarisasi tipe data ID menggunakan `String(id)`.
6. **Data Synchronization Lag**
   - **Symptom:** Config baru tidak muncul di storefront.
   - **Resolution:** Penambahan invalidasi cache otomatis saat config disimpan.
7. **Asset ID Type Matching (Numeric vs String)**
   - **Symptom:** Pilihan palet warna atau font reset/hilang saat disimpan atau dipilih ulang.
   - **Resolution:** Implementasi standarisasi `String(id)` pada seluruh filter aset di `DesignerCore` dan `DesignerOpenCore`.
8. **Base Image Positioning & Drag Logic**
   - **Symptom:** Posisi mockup melompat atau tidak presisi saat di-zoom.
   - **Resolution:** Implementasi `framer-motion` dengan koordinat relatif terhadap canvas center. Posisi disimpan dalam unit asli (x, y) dan dikalikan `zoom/100` saat render.
9. **Add Text Initialization Logic**
   - **Symptom:** Teks baru muncul di pojok kiri atas atau tumpang tindih tidak beraturan.
   - **Resolution:** Penambahan kalkulasi `currentWidth / 2` dan `currentHeight / 2` pada elemen baru agar selalu muncul di tengah area kerja aktif.
10. **Pixel-Perfect Image Cropping**
    - **Symptom:** Gambar terpotong meleset dari area seleksi user.
    - **Resolution:** Pendekatan translatif pada `ProcessedImage.tsx`. Menggunakan rasio skala antara dimensi asli dan box crop untuk menghitung `left` dan `top` negatif secara akurat.
11. **Hybrid Background Removal**
    - **Symptom:** Background removal 'JS' tidak bersih atau memakan subjek gambar.
    - **Resolution:** Implementasi dua lapis penghapusan: 1) **JS Mode (Canvas)** untuk threshold warna cepat (light/dark mode) dengan intensitas `deep` yang dapat diatur. 2) **AI Mode (RemBG)** untuk pemotongan subjek yang lebih presisi menggunakan server-side neural networks.

### 🟡 UI/UX Polishing
7. **Missing Base Image Controls**
   - **Symptom:** Overlay dan mask toggle hilang.
   - **Resolution:** Restorasi section "Base Image" khusus untuk mode admin.

---

## 🌐 Public / User Bug Fixes
Masalah teknis yang diselesaikan di sisi antarmuka pelanggan (Storefront Designer).

### 🔴 Critical System Issues
1. **Storefront CORS Blocking**
   - **Symptom:** CSS/JS gagal dimuat di domain Shopify (CORS error).
   - **Resolution:** Menambahkan header `Access-Control-Allow-Origin` khusus di `server.js`.
2. **Public Designer "No Host Provided"**
   - **Symptom:** Error App Bridge saat customer mendesain.
   - **Resolution:** Isolasi route publik (`/imcst_public_api/public/*`) dari inisialisasi App Bridge.

### 🟠 Functional & Logic Bugs
3. **Bridge Text Clipping & Resizing**
   - **Symptom:** Teks melengkung terpotong atau mengecil secara akumulatif.
   - **Resolution:** Menggunakan `fontSize` sebagai base perhitungan tinggi area warping.
4. **Text Tool Logic & Double-Click Size**
   - **Symptom:** Tombol "Add Text" duplikat elemen; font edit membesar karena zoom.
   - **Resolution:** Update logic `handleAddText` dan standarisasi font size textarea.
5. **"Add to Cart" Missing Variant ID**
   - **Symptom:** Error 400 saat memasukkan desain ke keranjang.
   - **Resolution:** Menambahkan Variant Selection Top Bar agar variant ID Shopify terisi dengan benar.
6. **Image Addition Redundancy**
   - **Symptom:** Gagal mengganti placeholder gambar (selalu membuat layer baru).
   - **Resolution:** Implementasi deteksi `selectedElement` untuk mengganti source gambar.
7. **Curved Text Scaling & Smoothness**
   - **Symptom:** Teks melengkung tidak muncul, font size sangat kecil, terpotong, dan tidak smooth setelah pemisahan template admin/publik.
   - **Resolution:** Mengganti pendekatan viewBox dengan koordinat absolut pixel. SVG sekarang menggunakan `width={containerWidth}` dan `height={containerHeight}` tanpa viewBox scaling, memastikan fontSize ditampilkan pada ukuran sebenarnya tanpa clipping.


### 🟡 UI/UX Polishing
8. **Redundant Zoom Controls**
   - **Symptom:** Control zoom ganda.
   - **Resolution:** Konsolidasi control ke bottom bar.
9. **Missing "Reset Design" for Customers**
   - **Resolution:** Mengaktifkan tombol Reset di mode publik.
10. **Missing Safe Area Clipping for Customers**
    - **Symptom:** Radius edit zone tidak terlihat.
    - **Resolution:** Mengaktifkan `showSafeArea` config dengan visual guides yang disembunyikan.
11. **Mockup Masking & Punch-through Logic**
    - **Symptom:** Desain menutupi seluruh bodi HP atau "tenggelam" di bawah bodi tanpa terlihat di layar.
    - **Resolution:** Integrasi CSS `maskComposite` (XOR/Subtract) dan `destination-out`. Desain kini otomatis terpotong mengikuti bodi HP dan hanya muncul di area transparan (layar).
12. **Mockup Color Layer Placement**
    - **Symptom:** Warna (tint) menutupi bodi HP, seharusnya hanya di area layar.
    - **Resolution:** Membalik logika masking warna khusus untuk mockup. Warna palet kini bertindak sebagai "background fill" untuk area transparan saja.
13. **Design Element Layering (zIndex 25)**
    - **Symptom:** Elemen upload sulit diklik karena berada di bawah mockup.
    - **Resolution:** Memastikan elemen desain selalu di `zIndex: 25` (di atas mockup) namun secara visual tetap terpotong oleh sistem masking agar selaras dengan lubang layar.

14. **PDF Export Open-Failure**
    - **Symptom:** File PDF hasil export tidak bisa dibuka (corrupted), karena hanya berupa file gambar yang di-rename menjadi .pdf.
    - **Resolution:** Implementasi library `jspdf` pada `useDesignerExport.ts`. Sistem kini membuat dokumen PDF asli, menyisipkan gambar dengan DPI tinggi, dan mengatur dimensi kertas sesuai aspek rasio desain secara dinamis.
15. **Layer ZIP PDF Formatting**
    - **Symptom:** Saat opsi "Separate Files" aktif dengan format PDF, isi ZIP tidak terbaca.
    - **Resolution:** Penambahan konversi `arraybuffer` pada setiap layer saat proses zipping, memastikan setiap file di dalam ZIP adalah dokumen PDF yang valid.
16. **SVG XML Style Correlation Error**
    - **Symptom:** File SVG tidak bisa dibuka di browser dengan pesan "This XML file does not appear to have any style information".
    - **Resolution:** Ekstrasi kode XML murni dari Data URI dan konversi menjadi Blob `image/svg+xml`. Ini memastikan file adalah dokumen XML yang valid, bukan sekadar link data.
17. **Professional AI & EPS Vector Fidelity**
    - **Symptom:** Format AI/EPS hanya berupa gambar piksel (raster) yang diganti namanya, sehingga pecah saat diperbesar.
    - **Resolution:** Integrasi mesin vektor (SVG-based) untuk format AI dan EPS. Objek kini diekspor sebagai **Editable Vector Paths** yang kompatibel dengan Adobe Illustrator dan CorelDraw.
18. **"Design Only" Mockup Ghosting/Bleeding**
    - **Symptom:** Bodi iPhone atau warna latar belakang tetap muncul sedikit saat ekspor "Design Only".
    - **Resolution:** Implementasi teknik **DOM Surgical Removal**. Sistem secara fisik mencabut elemen mockup dari struktur HTML sesaat sebelum gambar diambil, menjamin hasil 100% murni desain.
19. **Output Settings Volatility (Reset on Reload)**
    - **Symptom:** Pilihan format (seperti PDF/AI) atau DPI kembali ke default (PNG/300) setiap kali halaman di-refresh.
    - **Resolution:** Implementasi **Auto-Save Persistence**. Setiap perubahan pada menu Output Settings sekarang langsung memicu proses sinkronisasi ke database, menjaga preferensi desainer tetap utuh.
21. **Stacked Monogram Visual Alignment & Sizing**
    - **Symptom:** Huruf A dan S pada monogram tipe 'Stacked' terlihat terlalu kecil, renggang, dan tidak simetris terhadap huruf utama di kanan.
    - **Resolution:** Iterasi presisi pada `DraggableElement.tsx`. Meningkatkan `fontSize` secara drastis (hingga 149) dan menyesuaikan koordinat Y secara spesifik (A: 45%, S: 51%) untuk mencapai efek "overlapping". Ditambahkan penyesuaian **Selection Bounding Box** (`-inset-[30%]`) khusus untuk tipe Stacked agar handles kontrol tidak menutupi huruf.
    - **File:** `DraggableElement.tsx`

22. **Public Designer Close Button**
    - **Symptom:** Ikon "X" di pojok desainer publik tidak merespon saat diklik.
    - **Resolution:** Implementasi prop `onBack` yang diwariskan dari kontainer (Modal/Wizard) ke desainer inti. Secara default sekarang menjalankan `window.history.back()` jika tidak ada handler khusus.
23. **Add to Cart Visibility & UX**
    - **Symptom:** Tombol "Add to Cart" di panel kiri sering terlewati oleh pelanggan.
    - **Resolution:** Relokasi tombol ke Sidebar Summary (kanan) tepat di bawah daftar layers untuk alur review-to-purchase yang lebih intuitif.

---
*Terakhir diperbarui: 7 Februari 2026 (Designer Close Fix, Add to Cart Relocation)*
