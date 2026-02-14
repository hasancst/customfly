# Feature: Cart Preview Images - 2026-02-13

## Overview
Implementasi preview image untuk setiap side/page design yang ditampilkan di Shopify cart. Preview di-generate menggunakan html2canvas, di-upload ke S3 permanent storage, dan URL-nya disimpan di cart properties.

## Requirements
✅ Jangan kirim base64 ke cart (cart size limit)
✅ Upload dulu jadi URL
✅ Pastikan image permanent (bukan blob URL)
✅ Cache control jangan expired cepat

## Architecture

### Flow
1. User klik "Add to Cart"
2. Frontend capture canvas untuk setiap page/side menggunakan html2canvas
3. Convert canvas ke base64 PNG
4. Upload ke backend endpoint `/imcst_public_api/upload`
5. Backend save ke S3 dengan permanent storage dan cache control 1 year
6. Backend return permanent URL
7. Frontend save design dengan preview URLs
8. Frontend add to cart dengan properties berisi preview URLs

### Storage
- **Location**: S3 bucket under `{shop}/previews/` folder
- **Format**: PNG (high quality, scale 2x)
- **Naming**: `preview-{timestamp}.png`
- **Cache Control**: `public, max-age=31536000` (1 year)
- **ACL**: `public-read`

## Implementation

### Frontend Changes

#### DirectProductDesigner.tsx
```typescript
const handleAddToCart = async () => {
    // 1. Generate preview for each page
    for (const page of pages) {
        // Switch to page
        setActivePageId(page.id);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Capture canvas
        const canvasElement = document.querySelector('#canvas-paper');
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(canvasElement, {
            backgroundColor: null,
            scale: 2,
            logging: true,
            useCORS: true,
            allowTaint: true,
            ignoreElements: (element) => {
                // Ignore Shopify theme elements
                const tagName = element.tagName.toLowerCase();
                return tagName === 'script' || 
                       tagName === 'style' || 
                       tagName === 'noscript' ||
                       element.classList.contains('shopify-section');
            }
        });
        
        // Convert to base64
        const previewDataUrl = canvas.toDataURL('image/png');
        
        // Upload to server
        const uploadRes = await fetch(`${baseUrl}/imcst_public_api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shop,
                imageBase64: previewDataUrl
            })
        });
        
        if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            previews.push({
                pageId: page.id,
                pageName: page.name || `Side ${pages.indexOf(page) + 1}`,
                previewUrl: uploadData.url
            });
        }
    }
    
    // 2. Save design with previews
    const saveRes = await fetch(`${baseUrl}/imcst_api/public/design`, {
        method: 'POST',
        body: JSON.stringify({
            shop,
            shopifyProductId: productId,
            designJson: pages,
            previewUrl: previews[0]?.previewUrl,
            variantId: selectedVariantId,
            previews: previews
        })
    });
    
    // 3. Add to cart with preview URLs
    const properties = {
        '_Design ID': savedDesign.id,
    };
    
    previews.forEach((preview) => {
        properties[`_Preview ${preview.pageName}`] = preview.previewUrl;
    });
    
    await fetch('/cart/add.js', {
        method: 'POST',
        body: JSON.stringify({
            items: [{
                id: parseInt(selectedVariantId),
                quantity: 1,
                properties: properties
            }]
        })
    });
};
```

### Backend Changes

#### public.routes.js
Added new endpoint `/imcst_public_api/upload`:

```javascript
router.post("/upload", async (req, res) => {
    try {
        const { shop, imageBase64 } = req.body;
        
        if (!shop || !imageBase64) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Import S3 service
        const { uploadBase64ToS3 } = await import('../services/s3Service.js');
        const { getCDNUrl } = await import('../config/s3.js');
        
        // Generate filename with timestamp
        const timestamp = Date.now();
        const filename = `preview-${timestamp}.png`;
        const key = `${shop}/previews/${filename}`;
        
        // Upload to S3 (permanent storage with 1 year cache)
        const url = await uploadBase64ToS3(imageBase64, key);
        const cdnUrl = getCDNUrl(url);
        
        res.json({ 
            url: cdnUrl, 
            key,
            success: true 
        });
    } catch (error) {
        console.error("[Upload Preview Error]", error);
        res.status(500).json({ 
            error: `Upload failed: ${error.message}`,
            success: false 
        });
    }
});
```

#### s3Service.js
Updated to support cache control:

```javascript
export async function uploadToS3(buffer, key, contentType, options = {}) {
    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read',
            CacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year
        },
    });
    
    await upload.done();
    return `${process.env.S3_PUBLIC_URL}/${key}`;
}

export async function uploadBase64ToS3(base64String, key, options = {}) {
    // Parse base64 and extract content type
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let contentType = 'image/jpeg';
    
    if (matches && matches.length === 3) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
    } else {
        buffer = Buffer.from(base64String, 'base64');
    }
    
    return await uploadToS3(buffer, key, contentType, options);
}
```

## Cart Properties Format

When item is added to cart, properties will include:

```json
{
  "_Design ID": "design_123456",
  "_Preview Side 1": "https://cdn.example.com/shop/previews/preview-1234567890.png",
  "_Preview Side 2": "https://cdn.example.com/shop/previews/preview-1234567891.png"
}
```

If only 1 side exists, only 1 preview will be shown:
```json
{
  "_Design ID": "design_123456",
  "_Preview Side 1": "https://cdn.example.com/shop/previews/preview-1234567890.png"
}
```

## Display in Cart

Preview images can be displayed in cart using Liquid:

```liquid
{% for item in cart.items %}
  {% if item.properties._Design_ID %}
    <div class="custom-design-preview">
      {% for property in item.properties %}
        {% if property.first contains '_Preview' %}
          <img src="{{ property.last }}" alt="{{ property.first }}" />
        {% endif %}
      {% endfor %}
    </div>
  {% endif %}
{% endfor %}
```

## Benefits

1. **No Cart Size Limit Issues**: URLs are small, base64 images are not sent to cart
2. **Permanent Storage**: Images stored in S3 with 1 year cache, won't expire
3. **Fast Loading**: CDN delivery with long cache control
4. **Multiple Sides Support**: Each side/page gets its own preview
5. **Clean Cart Data**: Only URLs in cart properties, not large base64 strings

## Testing Checklist

- [ ] Test with single page design
- [ ] Test with multiple pages design
- [ ] Verify preview URLs are permanent (not blob URLs)
- [ ] Check cart properties contain correct preview URLs
- [ ] Verify images load correctly in cart
- [ ] Test cache control headers (should be 1 year)
- [ ] Verify S3 storage location (`{shop}/previews/`)
- [ ] Test with different canvas sizes
- [ ] Test with complex designs (text, images, monograms)

## Files Modified

### Frontend
- `frontend/src/pages/DirectProductDesigner.tsx` - Added preview generation and upload logic

### Backend
- `backend/routes/public.routes.js` - Added `/upload` endpoint
- `backend/services/s3Service.js` - Added cache control support

## Status
✅ Implemented
✅ Built successfully
⏳ Awaiting user testing

## Next Steps
1. User test preview generation
2. Verify preview URLs appear in cart
3. Check browser console for any errors
4. Verify S3 storage and cache headers
