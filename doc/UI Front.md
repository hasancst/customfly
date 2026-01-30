# UI Front Implementation Plan

Dokumen ini berisi rencana kerja untuk mengganti komponen standar Public App dengan **Custom Design** yang dimiliki user.

## 🎯 Tujuan
Mengganti tampilan default (admin-like) pada Public App menjadi tampilan custom yang lebih menarik untuk customer, mencakup mode Embedded, Modal, Wizard, dan Price Display.

## 📂 Target Komponen
Lokasi: `frontend/src/components/public/`

1.  **EmbeddedView.tsx**
    *   *Current*: Wrapper sederhana `DesignerPublic`.
    *   *Target*: Tampilan custom inline yang menyatu dengan halaman produk Shopify.
2.  **ModalView.tsx**
    *   *Current*: Tombol trigger + Modal standar.
    *   *Target*: Custom trigger button & Modal UI dengan transisi/layout khusus.
3.  **WizardView.tsx**
    *   *Current*: Wrapper `DesignerPublic`.
    *   *Target*: Step-by-step UI (misal: Pilih Produk -> Upload Gambar -> Preview -> Add to Cart).
4.  **PriceDisplay.tsx**
    *   *Current*: Card standar dengan rincian harga.
    *   *Target*: Custom price tag / breakdown yang sesuai branding toko.

## 📝 Checklist Pengerjaan

### 1. Preparation
- [ ] Menerima & Menganalisa code custom design dari user <!-- id: ui-101 -->
- [ ] Identifikasi assets (CSS/Images) yang dibutuhkan <!-- id: ui-102 -->

### 2. Implementation
- [ ] **Embedded View** <!-- id: ui-201 -->
    - [ ] Replace `EmbeddedView.tsx` dengan custom code
    - [ ] Integrasi logic `DesignerCore` / Hooks
- [ ] **Modal View** <!-- id: ui-202 -->
    - [ ] Replace `ModalView.tsx` dengan custom code
    - [ ] Implementasi state open/close modal
- [ ] **Wizard View** <!-- id: ui-203 -->
    - [ ] Replace `WizardView.tsx` dengan custom code
    - [ ] Implementasi step navigation logic
- [ ] **Price Display** <!-- id: ui-204 -->
    - [ ] Replace `PriceDisplay.tsx` dengan custom code
    - [ ] Integrasi data dynamic pricing dari backend

### 3. Integration & Styling
- [ ] Pastikan Tailwind classes custom tidak konflik dengan global styles <!-- id: ui-301 -->
- [ ] Connect tombol "Add to Cart" custom dengan logic existing <!-- id: ui-302 -->

### 4. Verification
- [ ] Test responsivitas di Mobile <!-- id: ui-401 -->
- [ ] Test build production (`npm run build`) <!-- id: ui-402 -->
