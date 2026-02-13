# Fix: 500 Error Saat Save Config - Missing Database Fields

**Tanggal:** 12 Februari 2026  
**Status:** ✅ FIXED  
**Severity:** CRITICAL - Menyebabkan save gagal

---

## Masalah

Saat save design setelah upload base image, terjadi error:

```
POST /imcst_api/config ... 500 (Internal Server Error)
```

## Root Cause

Backend mencoba save field yang **tidak ada di database schema**:
- `variantBaseScales` ❌
- `baseImageScale` ❌
- `baseImageColorMode` ❌
- `baseImageMaskInvert` ❌

Field-field ini ditambahkan ke `allowedFields` di `products.routes.js`, tapi tidak ada di Prisma schema, sehingga Prisma throw error saat upsert.

## Solusi

### 1. Update Prisma Schema

Tambahkan field yang hilang ke `backend/prisma/schema.prisma`:

```prisma
model MerchantConfig {
  // ... existing fields
  variantBaseImages     Json?
  variantBaseScales     Json?      // ✅ ADDED
  baseImageScale        Float?     // ✅ ADDED
  baseImageColorMode    String?  @default("transparent")  // ✅ ADDED
  baseImageMaskInvert   Boolean? @default(false)  // ✅ ADDED
  buttonStyle           Json?
  // ... rest of fields
}
```

### 2. Run Migration

```bash
cd backend
npx prisma migrate dev --name add-base-image-fields
```

Atau jika production:

```bash
npx prisma db push
```

### 3. Restart Backend

```bash
npm run dev
```

## Testing

1. **Upload base image baru** di admin
2. **Klik Save Design** → "This Product Only"
3. **Verifikasi:**
   - ✅ Tidak ada 500 error
   - ✅ Success message muncul
   - ✅ Data tersimpan ke database
   - ✅ Frontend reload dan tampil image baru

## Verification Query

Setelah migration, cek apakah field ada:

```sql
-- PostgreSQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'MerchantConfig'
  AND column_name IN ('variantBaseScales', 'baseImageScale', 'baseImageColorMode', 'baseImageMaskInvert');

-- Expected result: 4 rows
```

## Related Issues

- [fix-base-image-upload-object-error-2026-02-12.md](./fix-base-image-upload-object-error-2026-02-12.md)
- [troubleshoot-base-image-not-updating-frontend-2026-02-12.md](./troubleshoot-base-image-not-updating-frontend-2026-02-12.md)

---

**Dibuat oleh:** Kiro AI Assistant  
**Status:** ✅ Fixed - Perlu run migration
