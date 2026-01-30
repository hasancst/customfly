# Open Designer Configuration

Dokumen ini menjelaskan konfigurasi **Open Designer** (sebelumnya "Redirect to Designer") dan strategi pemisahan antara tampilan Publik dan Admin.

## 📍 Konfigurasi di Admin
Pengaturan ini terdapat di panel **Summary** pada `Designer Admin`.
Merchant dapat memilih mode tampilan designer untuk setiap produk.

## 🛠️ Opsi Mode Tampilan

| Opsi | Label UI | Deskripsi |
| :--- | :--- | :--- |
| **Redirect** | `Open Designer` | Membuka Designer di halaman penuh (Full Page). Menggunakan layout yang mirip Admin namun khusus Public. |
| **Inline** | `Inline on Product Page` | Designer dimuat langsung di dalam halaman produk. |
| **Modal** | `Modal Popup` | Menampilkan tombol yang membuka Designer dalam Popup. |
| **Wizard** | `Step-by-Step Wizard` | Menuntun user melalui langkah-langkah kustomisasi. |

## 🏗️ Strategi Pengembangan (Architecture Strategy)

### 1. Visual Parity & Functional Restriction
*   **Tampilan**: Open Designer memiliki struktur tampilan yang sama dengan Admin (Header, Canvas, Toolbar) pada awalnya.
*   **Fungsi**: Fitur dibatasi hanya untuk Publik (Read-only templates, Add to Cart logic, Hidden Admin Controls).

### 2. Layout Decoupling (Pemisahan Layout)
Sangat penting untuk memisahkan kode layout antara Admin dan Open Designer:
*   **Isolasi**: Perubahan layout/view pada Open Designer **TIDAK BOLEH** mempengaruhi tampilan Admin.
*   **Divergensi**: Admin dan Public akan berkembang ke arah desain yang sangat berbeda di masa depan.
*   **Implementasi**: Meskipun saat ini mungkin berbagi komponen `DesignerCore`, struktur wrapper (`PublicLayout` vs `AdminLayout`) harus terpisah total.

## ⚙️ Implementasi Teknis

### 1. Data Penyimpanan
*   **Field**: `config.layoutMode` (default: `redirect`).

### 2. Storefront Integration
Script App Embed akan membaca konfigurasi:
- Jika `redirect`: Buka link `/apps/custom/designer/...` (Open Designer).
- Jika `modal`/`inline`: Render komponen React di tempat.

## 📝 Catatan Perubahan
*   **30/01/2026**: 
    - Label UI diubah menjadi "**Open Designer**".
    - Menetapkan strategi pemisahan layout (Decoupling) agar perubahan public tidak merusak admin.
