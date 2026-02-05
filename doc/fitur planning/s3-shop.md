# Shop-based S3 Organization

## Overview

All S3 uploads are now organized into shop-specific folders to improve multi-tenancy isolation and asset management.

## Folder Structure

```
s3-bucket/
├── shop-domain.myshopify.com/
│   ├── gallery/              # Gallery images from admin
│   ├── base-images/          # Product mockup base images
│   ├── admin-assets/         # Admin uploaded images
│   ├── processed-assets/     # PDF/PSD converted images
│   ├── swatches/             # Swatch color/image uploads
│   ├── customer-uploads/     # Customer uploaded images
│   └── previews/             # Design preview images
└── another-shop.myshopify.com/
    └── ...
```

## Implementation Details

### Backend

**Modified Files:**
- `backend/server.js` - Upload endpoints now accept `shop` parameter

**Upload Endpoints:**
- `/imcst_api/public/upload/image` - Accepts `?shop=` query parameter
- `/imcst_api/public/upload/base64` - Accepts `shop` in request body

**S3 Key Generation:**
```javascript
const key = shop 
    ? `${shop}/${folder}/${filename}`
    : `${folder}/${filename}`; // Fallback for backward compatibility
```

### Frontend

**Modified Components:**

1. **Admin Components** (get shop from URL params):
   - `AssetDetail.tsx` - Gallery uploads
   - `BaseImageModal.tsx` - Base image uploads
   - `ImageTool.tsx` - Admin asset uploads & processed assets
   - `SwatchTool.tsx` - Swatch uploads

2. **Public Components** (get shop from URL params):
   - `PublicCustomizationPanel.tsx` - Customer uploads

**Shop Parameter Extraction:**
```typescript
const shop = new URLSearchParams(window.location.search).get('shop') || '';
```

## Benefits

1. **Better Organization** - Each shop's assets are isolated in their own folder
2. **Easier Cleanup** - Delete all shop assets when shop uninstalls
3. **Multi-tenancy** - Clear separation between different shops
4. **Debugging** - Easier to find and manage shop-specific assets
5. **Scalability** - Better S3 performance with organized structure

## Backward Compatibility

- Uploads without shop parameter are stored in root folders
- Existing images remain accessible at their current URLs
- Only NEW uploads use the shop-based structure

## Usage

### Admin Uploads
Shop parameter is automatically extracted from the URL when admin users upload assets.

### Public Uploads
Shop parameter is automatically extracted from the storefront URL when customers upload images.

### Manual API Calls
```javascript
// Image upload
const formData = new FormData();
formData.append('image', file);
fetch(`/imcst_api/public/upload/image?folder=gallery&shop=${shop}`, {
    method: 'POST',
    body: formData
});

// Base64 upload
fetch('/imcst_api/public/upload/base64', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        base64: dataUrl,
        folder: 'previews',
        shop: shop
    })
});
```

## Migration

Existing uploads in root folders will continue to work. To migrate old uploads to shop folders:

1. Identify shop ownership of existing assets
2. Use AWS CLI or S3 console to move files:
   ```bash
   aws s3 mv s3://bucket/gallery/file.jpg s3://bucket/shop.myshopify.com/gallery/file.jpg
   ```
3. Update database references if needed

## Monitoring

Check backend logs for warnings:
- `[UPLOAD] No shop parameter provided, storing in root folder`
- `[BASE64 UPLOAD] No shop parameter provided, storing in root folder`

These indicate uploads without shop context that may need attention.
