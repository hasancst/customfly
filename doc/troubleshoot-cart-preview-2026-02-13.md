# Troubleshooting: Cart Preview Not Showing - 2026-02-13

## Issue
Preview images tidak muncul di cart setelah add to cart.

## Debugging Steps

### 1. Check Browser Console Logs

Buka browser console (F12) dan cari log dengan prefix `[handleAddToCart]`. Logs yang harus ada:

```
[handleAddToCart] Starting preview generation for X pages
[handleAddToCart] Processing page: Side 1 default
[handleAddToCart] Canvas element found: true
[handleAddToCart] Starting html2canvas for page: default
[handleAddToCart] Canvas captured, size: 1000 x 1000
[handleAddToCart] Preview data URL length: XXXXX
[handleAddToCart] Uploading preview to server...
[handleAddToCart] Upload response status: 200
[handleAddToCart] Upload successful, URL: https://...
[handleAddToCart] Total previews generated: 1 [...]
[handleAddToCart] Design saved: design_xxx
[handleAddToCart] Adding cart property: Preview Side 1 = https://...
[handleAddToCart] Final cart properties: {...}
[handleAddToCart] Cart payload: {...}
[handleAddToCart] Cart response status: 200
[handleAddToCart] Cart response data: {...}
```

### 2. Check Each Step

#### Step 1: Canvas Element Found?
```
[handleAddToCart] Canvas element found: true
```
- ❌ If `false`: Canvas tidak ditemukan, cek apakah `#canvas-paper` ada di DOM
- ✅ If `true`: Lanjut ke step berikutnya

#### Step 2: html2canvas Success?
```
[handleAddToCart] Canvas captured, size: 1000 x 1000
```
- ❌ If error: Cek error message, mungkin ada CORS issue atau element yang tidak bisa di-capture
- ✅ If success: Lanjut ke step berikutnya

#### Step 3: Upload Success?
```
[handleAddToCart] Upload response status: 200
[handleAddToCart] Upload successful, URL: https://...
```
- ❌ If status !== 200: Cek error response, mungkin backend issue
- ❌ If no URL: Backend tidak return URL yang benar
- ✅ If URL ada: Lanjut ke step berikutnya

#### Step 4: Preview Added to Array?
```
[handleAddToCart] Total previews generated: 1 [...]
```
- ❌ If 0: Preview tidak berhasil di-generate atau di-upload
- ✅ If > 0: Lanjut ke step berikutnya

#### Step 5: Cart Properties Correct?
```
[handleAddToCart] Final cart properties: {
  "Design ID": "design_xxx",
  "Preview Side 1": "https://..."
}
```
- ❌ If empty: Properties tidak dibuat dengan benar
- ❌ If no preview keys: Preview tidak ditambahkan ke properties
- ✅ If ada preview keys: Lanjut ke step berikutnya

#### Step 6: Cart Add Success?
```
[handleAddToCart] Cart response status: 200
[handleAddToCart] Cart response data: {...}
```
- ❌ If status !== 200: Shopify cart add gagal, cek error message
- ✅ If success: Cart berhasil ditambahkan

### 3. Check Cart Data

Setelah add to cart, cek cart data dengan:

```javascript
fetch('/cart.js')
  .then(r => r.json())
  .then(cart => {
    console.log('Cart items:', cart.items);
    cart.items.forEach(item => {
      console.log('Item properties:', item.properties);
    });
  });
```

Properties yang harus ada:
```json
{
  "Design ID": "design_xxx",
  "Preview Side 1": "https://cdn.../shop/previews/preview-xxx.png"
}
```

### 4. Check Backend Endpoint

Test upload endpoint manually:

```bash
curl -X POST https://your-domain.com/imcst_public_api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "your-shop.myshopify.com",
    "imageBase64": "data:image/png;base64,iVBORw0KG..."
  }'
```

Expected response:
```json
{
  "url": "https://cdn.../shop/previews/preview-xxx.png",
  "key": "shop/previews/preview-xxx.png",
  "success": true
}
```

### 5. Check S3 Storage

Verify file uploaded to S3:
- Bucket: Check `S3_BUCKET` env variable
- Path: `{shop}/previews/preview-{timestamp}.png`
- ACL: Should be `public-read`
- Cache-Control: Should be `public, max-age=31536000`

### 6. Check Cart Theme Template

Verify cart template displays properties:

```liquid
{% for item in cart.items %}
  <div class="cart-item">
    <h3>{{ item.product.title }}</h3>
    
    {% if item.properties %}
      <div class="item-properties">
        {% for property in item.properties %}
          <div class="property">
            <strong>{{ property.first }}:</strong>
            {% if property.first contains 'Preview' %}
              <img src="{{ property.last }}" alt="{{ property.first }}" style="max-width: 200px;" />
            {% else %}
              {{ property.last }}
            {% endif %}
          </div>
        {% endfor %}
      </div>
    {% endif %}
  </div>
{% endfor %}
```

## Common Issues

### Issue 1: Canvas Element Not Found
**Symptom**: `Canvas element found: false`

**Solution**:
- Verify `#canvas-paper` exists in DOM
- Check if canvas is rendered before capture
- Increase wait time before capture (currently 800ms)

### Issue 2: html2canvas CORS Error
**Symptom**: Error during canvas capture

**Solution**:
- Ensure all images have CORS headers
- Use `useCORS: true` and `allowTaint: true`
- Check `ignoreElements` function

### Issue 3: Upload Endpoint 404
**Symptom**: `Upload response status: 404`

**Solution**:
- Verify backend route is registered: `app.use("/imcst_public_api", publicRoutes)`
- Check `public.routes.js` has `router.post("/upload", ...)`
- Restart backend server

### Issue 4: Upload Endpoint 500
**Symptom**: `Upload response status: 500`

**Solution**:
- Check backend logs for error
- Verify S3 credentials are correct
- Check S3 bucket permissions

### Issue 5: Properties Not in Cart
**Symptom**: Cart added but no properties

**Solution**:
- Check if properties object is empty
- Verify Shopify accepts property keys (no special characters)
- Check cart.js response for properties

### Issue 6: Preview URL Not Loading
**Symptom**: URL in cart but image doesn't load

**Solution**:
- Verify URL is accessible (open in browser)
- Check S3 ACL is `public-read`
- Verify CDN URL is correct
- Check CORS headers on S3

## Testing Checklist

- [ ] Browser console shows all logs without errors
- [ ] Canvas element found: true
- [ ] Canvas captured successfully
- [ ] Upload response status: 200
- [ ] Upload URL returned
- [ ] Previews array has items
- [ ] Cart properties include preview URLs
- [ ] Cart add response status: 200
- [ ] Cart.js shows properties
- [ ] Preview URLs are accessible
- [ ] Images display in cart page

## Next Steps

1. Run through debugging steps above
2. Share console logs if issue persists
3. Check backend logs for errors
4. Verify S3 configuration
5. Test upload endpoint manually
