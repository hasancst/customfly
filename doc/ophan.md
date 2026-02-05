# Orphan Code Audit

## Ringkasan
- Tujuan: Mengidentifikasi file/kode yang tidak direferensikan oleh aplikasi (Admin/Public) atau tidak dipanggil oleh runtime.
- Catatan: Script utilitas dan file publik yang dikonsumsi eksternal tidak dianggap orphan runtime, tetapi tetap dicatat.

## Kandidat Orphan (Frontend)
- frontend/src/components/common/OutputSettingsTool.tsx
  - Tidak ditemukan import/pemakaian di codebase
  - Tindakan: Hapus atau integrasikan ke UI yang relevan (mis. Summary/GlobalSettings)

- frontend/src/pages/Features.tsx
  - Tidak ada route atau import yang mengarah ke file ini
  - Tindakan: Tambahkan route Admin jika ingin ditampilkan, atau hapus

- frontend/src/data/adminFeatures.ts
  - Hanya dipakai oleh Features.tsx (yang tidak terpakai)
  - Tindakan: Ikuti keputusan Features.tsx

## Bukan Orphan (Dikonsumsi atau Utilitas)
- frontend/public/storefront-sdk.js
  - Tidak direferensikan internal; dipakai di theme storefront (external include)
  - Tindakan: Pertahankan sebagai distribusi publik

- frontend/src/components/DesignerCore.test.tsx
  - File test unit; tidak dipakai runtime
  - Tindakan: Pertahankan untuk pengujian

## Kandidat Orphan (Backend/Script)
- backend/test-webp.js
  - Script uji manual konversi WebP
  - Tindakan: Pertahankan di folder scripts/tests atau dokumentasikan

- backend/check_sessions.js
  - Script inspeksi sesi Prisma/Shopify
  - Tindakan: Pertahankan sebagai utilitas admin, pindahkan ke folder scripts

- backend/update_layout_to_modal.cjs
- backend/migrate_to_s3.cjs
  - Script migrasi/maintenance; tidak dipanggil runtime
  - Tindakan: Pertahankan di folder scripts/migration

## Rekomendasi Umum
- Tandai utilitas ke folder `backend/scripts/` agar jelas bukan bagian runtime
- Jika tetap diperlukan, tambah dokumentasi pemakaian di doc
- Hapus file orphan murni untuk meringankan bundle dan maintenance

