# Fix: System Placeholder Image Broken di Frontend Customer

**Tanggal:** 2026-02-16  
**Masalah:** Image broken di frontend customer ketika pakai system placeholder

---

## Masalah

Ketika admin set base image ke system placeholder (`/images/system-placeholder.png`), image tampil di admin tapi BROKEN di frontend customer.

### Kenapa Broken?

**Admin Designer:**
- Serve dari app server (custom.duniasantri.com)
- Bisa akses `/images/system-placeholder.png` ✅
- File ada di `frontend/dist/images/system-placeholder.png`

**Frontend Customer (Storefront):**
- Serve dari Shopify domain (uploadfly-lab.myshopify.com)
- TIDAK bisa akses app server files ❌
- Path `/images/system-placeholder.png` tidak ada di Shopify

---

## Solusi

### Option 1: Upload Placeholder ke CDN (RECOMMENDED)

Upload system placeholder ke Linode S3 dan gunakan CDN URL:

```bash
# Upload file
aws s3 cp frontend/public/images/system-placeholder.png \
  s3://customfly/system/system-placeholder.png \
  --acl public-read

# Get CDN URL
https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png
```

Kemudian update semua reference:

```typescript
// Ganti dari:
const SYSTEM_PLACEHOLDER = '/images/system-placeholder.png';

// Jadi:
const SYSTEM_PLACEHOLDER = 'https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png';
```

### Option 2: Gunakan Data URL (Base64)

Convert image ke base64 dan embed di code:

```typescript
const SYSTEM_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
```

Tapi ini akan membuat bundle size lebih besar.

### Option 3: Serve via Public API

Serve file via public API endpoint:

```javascript
// backend/routes/public.routes.js
router.get('/system-placeholder.png', (req, res) => {
    const filePath = resolve(__dirname, '../../frontend/dist/images/system-placeholder.png');
    res.sendFile(filePath);
});
```

Kemudian update reference:

```typescript
const SYSTEM_PLACEHOLDER = `${IMCST_BASE_URL}/imcst_public_api/system-placeholder.png`;
```

---

## Implementation: Option 1 (CDN)

### Step 1: Upload ke S3

```bash
# Dari root project
cd frontend/public/images
aws s3 cp system-placeholder.png \
  s3://customfly/system/system-placeholder.png \
  --acl public-read \
  --content-type image/png
```

### Step 2: Verify URL

```bash
curl -I https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png
# Should return 200 OK
```

### Step 3: Update Code

Create constant file:

```typescript
// frontend/src/constants/images.ts
export const SYSTEM_PLACEHOLDER_URL = 'https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png';
```

Update all files:

```typescript
// frontend/src/components/DesignerCore.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 464, 486
return SYSTEM_PLACEHOLDER_URL;
```

```typescript
// frontend/src/components/DesignerOpenCore.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 416
return SYSTEM_PLACEHOLDER_URL;
```

```typescript
// frontend/src/components/BaseImageModal.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 239, 242, 246
onClick={() => handleSelect(SYSTEM_PLACEHOLDER_URL, 'system')}
<img src={SYSTEM_PLACEHOLDER_URL} ... />
currentBaseImage === SYSTEM_PLACEHOLDER_URL
```

```typescript
// frontend/src/components/Canvas.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 432
return SYSTEM_PLACEHOLDER_URL;
```

```typescript
// frontend/src/components/Summary.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 497
const systemPlaceholder = SYSTEM_PLACEHOLDER_URL;
```

```typescript
// frontend/src/pages/DirectProductDesigner.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 775
return SYSTEM_PLACEHOLDER_URL;
```

```typescript
// frontend/src/pages/GlobalSettingsDesigner.tsx
import { SYSTEM_PLACEHOLDER_URL } from '@/constants/images';

// Line 43, 45, 49
image: SYSTEM_PLACEHOLDER_URL
images: [SYSTEM_PLACEHOLDER_URL]
const DUMMY_BASE_IMAGE = SYSTEM_PLACEHOLDER_URL;
```

### Step 4: Update Database

Update existing records yang pakai old path:

```sql
-- Update MerchantConfig
UPDATE MerchantConfig 
SET baseImage = 'https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png'
WHERE baseImage = '/images/system-placeholder.png';

-- Update SavedDesign
UPDATE SavedDesign
SET designJson = JSON_REPLACE(
    designJson,
    '$[0].baseImage',
    'https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png'
)
WHERE JSON_EXTRACT(designJson, '$[0].baseImage') = '/images/system-placeholder.png';
```

### Step 5: Rebuild Frontend

```bash
cd frontend
npm run build
```

### Step 6: Test

1. Admin: Pilih "System Default" mockup → Should show placeholder ✅
2. Save design
3. Frontend customer: Should show placeholder (not broken) ✅

---

## Quick Fix (Sementara)

Untuk fix cepat tanpa rebuild, update database saja:

```bash
# Ganti placeholder dengan iPhone image yang sudah ada
node backend/force_update_base_image.cjs 8232157511714 \
  "https://cdn.shopify.com/s/files/1/0748/1724/1122/files/iphone_6_mask.png?v=1770767994"
```

Atau upload mockup baru ke Shopify dan pakai URL-nya.

---

## Prevention

Untuk mencegah masalah ini di masa depan:

1. **Semua asset harus di CDN** - Jangan pakai relative path
2. **Validate URL saat save** - Cek apakah URL accessible dari frontend
3. **Fallback ke Shopify image** - Jika base image broken, fallback ke product image

---

**Dibuat oleh:** Kiro AI Assistant  
**Tanggal:** 2026-02-16
