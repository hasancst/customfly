# Dokumentasi Struktur Kode & Arsitektur Frontend

Dokumen ini menjelaskan struktur kode project frontend, khususnya pemisahan antara **Admin App** (untuk Merchant Shopify) dan **Public App** (untuk Customer Storefront).

## 📂 Struktur Direktori Utama

```
frontend/
├── dist/                   # Hasil build production
│   ├── index.html          # Entry point Admin App (setelah build)
│   └── public.html         # Entry point Public App (setelah build)
├── public/                 # Static assets
├── src/                    # Source code
│   ├── components/         # Komponen UI Shared & Specific
│   │   ├── layouts/        # Layout khusus Public App
│   │   ├── public/         # Komponen khusus View Public (Embedded, Modal, Wizard)
│   │   └── ui/             # Komponen UI Library (Shadcn/UI)
│   ├── pages/              # Halaman/Route components
│   ├── styles/             # CSS Files
│   ├── App.tsx             # Main Router untuk Admin App
│   ├── main.tsx            # Entry Point Admin App
│   └── main-public.tsx     # Entry Point Public App
├── index.html              # Template HTML untuk Admin App
├── public.html             # Template HTML untuk Public App
└── vite.config.ts          # Konfigurasi Build (Multi-Page App)
```

---

## 🖥️ 1. Admin App (Shopify Embedded App)

Aplikasi ini berjalan di dalam Admin Dashboard Shopify menggunakan Shopify App Bridge.

*   **Target User**: Merchant / Admin Toko.
*   **Akses**: `https://admin.shopify.com/store/...`
*   **Entry Point**: `src/main.tsx` -> `src/App.tsx`
*   **HTML Template**: `index.html`
*   **Styling**: 
    *   Menggunakan `@shopify/polaris` (Design System Shopify).
    *   CSS File: `src/styles/admin.css` (Tailwind + Polaris).
*   **Routing**:
    *   Dikelola di `App.tsx`.
    *   Menggunakan `react-router-dom` dengan integrasi `@shopify/app-bridge-react`.
*   **Otentikasi**:
    *   Menggunakan Shopify Session Token (JWT).
    *   Hook: `useAuthenticatedFetch.ts` (otomatis menyisipkan token di header setiap request API).

### Komponen Kunci Admin:
*   `pages/AdminDashboard.tsx`: Halaman utama dashboard.
*   `pages/Designer.tsx`: Wrapper untuk `DesignerCore` di mode Admin. Menangani save/load design ke database via API terotentikasi.

---

## 🌍 2. Public App (Customer Storefront)

Aplikasi ini diakses oleh pembeli (customer) di halaman toko online (storefront) untuk melakukan kustomisasi produk.

*   **Target User**: Customer / Pembeli.
*   **Akses**: `https://namatoko.myshopify.com/apps/custom/...` (melalui App Proxy atau Link).
*   **Entry Point**: `src/main-public.tsx` -> `src/pages/PublicApp.tsx`
*   **HTML Template**: `public.html`
*   **Styling**:
    *   **TIDAK** menggunakan Polaris (untuk menjaga ukuran bundle kecil dan visual custom).
    *   CSS File: `src/styles/index.css` (Tailwind + Theme Custom).
*   **Routing**:
    *   Dikelola di `pages/PublicApp.tsx`.
    *   Route Format: `/public/designer/:mode/:productId`
*   **Otentikasi**:
    *   Public API (tanpa login merchant).
    *   Akses data berdasarkan `shop` domain dan `productId` publik.

### Mode Tampilan Public (`components/public/`):
App public mendukung 3 mode integrasi (diatur di `pages/PublicApp.tsx`):
1.  **Embedded** (`EmbeddedView.tsx`): Tampil langsung menyatu di halaman produk.
2.  **Modal** (`ModalView.tsx`): Tampil sebagai popup/overlay di halaman produk.
3.  **Wizard** (`WizardView.tsx`): Tampil sebagai langkah-langkah step-by-step.

### Komponen Kunci Public:
*   `layouts/PublicLayout.tsx`: Layout utama (Header/Footer optional).
*   `pages/DesignerPublic.tsx`: Wrapper untuk `DesignerCore` di mode Public. Read-only untuk template, tapi editable untuk kustomisasi user.

---

## 🧩 Shared Core (`components/DesignerCore.tsx`)

Ini adalah "otak" dari aplikasi designer yang digunakan bersama oleh Admin dan Public app.

*   **Fungsi**: Menangani Canvas, manipulasi elemen, drag-n-drop, history (undo/redo), dan state halaman.
*   **Props Utama**:
    *   `isPublicMode`: `boolean`. Jika `true`, fitur-fitur admin (seperti tombol save template global) disembunyikan.
    *   `onSave`: Callback function yang berbeda implementasinya antara Admin (save to DB) dan Public (add to cart/save temporary).
    *   `initialPages`: Data design awal.

---

## ⚙️ Konfigurasi Build (`vite.config.ts`)

Project menggunakan **Vite** dengan konfigurasi **Multi-Page App**:

1.  **Input Terpisah**:
    ```typescript
    input: {
        admin: path.resolve(__dirname, 'index.html'),
        public: path.resolve(__dirname, 'public.html'),
    }
    ```
2.  **Code Splitting (Manual Chunks)**:
    *   `vendor-react`: React Core (React, ReactDOM) -> *Dimuat di Admin & Public*.
    *   `vendor-ui`: UI Libraries (Radix, Lucide) -> *Dimuat di Admin & Public*.
    *   `vendor-shopify`: Polaris & App Bridge -> **HANYA dimuat di Admin**.
    *   `vendor-graphics`: Library berat (html2canvas, jsPDF) -> *Lazy loaded*.

## 🚀 Ringkasan Akses

| Fitur | Admin App | Public App |
| :--- | :--- | :--- |
| **URL** | `/dashboard`, `/designer` | `/public/designer/...` |
| **User** | Merchant | Customer |
| **Entry File** | `src/main.tsx` | `src/main-public.tsx` |
| **Main Component** | `src/App.tsx` | `src/pages/PublicApp.tsx` |
| **Design System** | Polaris + Tailwind | Tailwind Custom Theme |
| **CSS File** | `admin.css` | `index.css` |

---
*Dibuat otomatis oleh AI Assistant - 2026-01-29*
