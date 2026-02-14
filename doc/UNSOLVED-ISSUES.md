# Unsolved Issues - 2026-02-14

Dokumen ini berisi daftar issue yang belum terselesaikan dan memerlukan solusi alternatif atau investigasi lebih lanjut.

---

## 1. Cart Preview Image Generation (CRITICAL)

### Status
❌ **UNSOLVED** - Skipped for now

### Problem
Tidak bisa generate preview image dari canvas untuk ditampilkan di Shopify cart karena html2canvas conflict dengan Shopify theme scripts.

### Root Cause
- html2canvas mencoba clone seluruh DOM tree termasuk Shopify theme custom elements
- Shopify theme scripts (localization-form.js, details-modal.js, product-form.js, dll) error saat di-clone karena mencari parent elements yang tidak ada di cloned document
- Error: `Cannot read properties of null (reading 'addEventListener')`
- `onclone` callback tidak berjalan sebelum clone process dimulai, sehingga tidak bisa remove scripts sebelum error terjadi

### Attempted Solutions
1. ✗ Isolated container approach - Masih clone Shopify elements
2. ✗ `ignoreElements` callback - Tidak cukup kuat, scripts tetap dijalankan
3. ✗ `onclone` callback untuk remove scripts - Callback terlambat, error sudah terjadi saat clone

### Impact
- Design ID berhasil disimpan ke cart
- Preview image tidak ada di cart properties
- User tidak bisa lihat preview design di cart page

### Recommended Solutions

#### Option 1: Backend Preview Generation (RECOMMENDED)
Generate preview di backend menggunakan Puppeteer/Playwright setelah design disimpan.

**Pros:**
- Reliable, tidak ada conflict dengan Shopify theme
- High quality rendering
- Bisa di-cache dan di-optimize

**Cons:**
- Memerlukan backend service (Puppeteer/Playwright)
- Slightly slower (async generation)
- Additional server resources

**Implementation:**
```javascript
// Frontend: Save design first
const saveRes = await fetch('/api/design', {
  method: 'POST',
  body: JSON.stringify({ designJson: pages })
});
const { designId } = await saveRes.json();

// Backend: Generate preview asynchronously
// POST /api/design/:id/generate-preview
// - Load design JSON
// - Render canvas using Puppeteer
// - Capture screenshot
// - Upload to S3
// - Return preview URL

// Frontend: Poll for preview or use webhook
const preview = await fetch(`/api/design/${designId}/preview`);
```

#### Option 2: Use Design JSON as Preview
Simpan design data (JSON) ke database, render preview di cart page atau admin menggunakan same Canvas component.

**Pros:**
- No image generation needed
- Always up-to-date
- Can be edited later

**Cons:**
- Requires rendering on cart page
- Slower cart page load
- More complex implementation

**Implementation:**
```javascript
// Cart properties
{
  "Design ID": "xxx",
  "Design Data URL": "https://app.com/api/design/xxx/json"
}

// Cart page: Fetch and render
const designData = await fetch(designDataUrl);
renderCanvas(designData);
```

#### Option 3: Use Product/Variant Image as Placeholder
Gunakan existing product image sebagai preview sementara.

**Pros:**
- Simple, no generation needed
- Fast
- Always available

**Cons:**
- Not actual design preview
- Misleading for customers
- Not useful for production orders

**Implementation:**
```javascript
const previewUrl = shopifyProduct.images[0]?.src || 'placeholder';
properties['Preview'] = previewUrl;
```

### Files Affected
- `frontend/src/pages/DirectProductDesigner.tsx` - handleAddToCart function
- `backend/routes/public.routes.js` - Upload endpoint (already implemented)
- `backend/services/s3Service.js` - S3 upload (already implemented)

### Related Documentation
- `doc/feat-cart-preview-images-2026-02-13.md` - Original implementation attempt
- `doc/troubleshoot-cart-preview-2026-02-13.md` - Debugging guide

---

## 2. Mockup Color Overlay (MEDIUM PRIORITY)

### Status
⚠️ **PARTIALLY SOLVED** - Works in some cases, inconsistent

### Problem
Mockup color overlay tidak konsisten apply ke base image. Kadang berhasil, kadang tidak.

### Root Cause
- Color overlay logic bergantung pada base image loading state
- Race condition antara image load dan color apply
- Canvas re-render tidak selalu trigger color update

### Symptoms
- Color overlay kadang tidak muncul setelah select color
- Perlu refresh page untuk apply color
- Inconsistent behavior antara different products

### Attempted Solutions
1. ✓ Add color overlay logic to Canvas component
2. ✓ Add baseImageColorEnabled flag
3. ⚠️ Add re-render trigger on color change - Masih inconsistent

### Impact
- User experience terganggu
- Harus manual refresh untuk lihat color changes
- Tidak reliable untuk production use

### Recommended Solutions

#### Option 1: Force Canvas Re-render on Color Change
Add key prop to Canvas component yang berubah saat color berubah.

```typescript
<Canvas
  key={`canvas-${baseImageColor}-${baseImageColorEnabled}`}
  // ... other props
/>
```

#### Option 2: Use useEffect to Watch Color Changes
Add useEffect di Canvas component untuk watch color changes dan force re-render.

```typescript
useEffect(() => {
  if (baseImageColorEnabled && baseImageColor) {
    // Force re-render base image with new color
    reloadBaseImage();
  }
}, [baseImageColor, baseImageColorEnabled]);
```

#### Option 3: Implement Color Overlay as Separate Layer
Pisahkan color overlay dari base image, render sebagai separate canvas layer.

### Files Affected
- `frontend/src/components/Canvas.tsx` - Color overlay logic
- `frontend/src/components/DesignerCore.tsx` - Color state management
- `frontend/src/pages/DirectProductDesigner.tsx` - Color props passing

### Related Documentation
- `doc/fix-mockup-color-overlay-2026-02-12.md`
- `doc/fix-mockup-color-overlay-final-2026-02-12.md`
- `doc/fix-mockup-color-frontend-implementation-2026-02-13.md`
- `doc/mockup-color-final-status-2026-02-13.md`

---

## 3. Canvas Alignment in Direct Customize (LOW PRIORITY)

### Status
⚠️ **PARTIALLY SOLVED** - Masih ada jarak

### Problem
Canvas border tidak sejajar dengan product title di Direct Customize mode. Masih ada jarak/gap di atas canvas.

### Root Cause
- Jarak kemungkinan dari Shopify theme layout atau parent container
- CSS margin/padding dari theme tidak bisa di-override dengan `!important`
- Theme-specific styling yang berbeda-beda per theme

### Attempted Solutions
1. ✓ Changed alignment from `items-center` to `items-start`
2. ✓ Changed `transformOrigin` from `center` to `top`
3. ✓ Removed `pt-4` padding
4. ⚠️ Added `margin-top: -20px !important` - Masih ada jarak

### Impact
- Visual alignment tidak perfect
- User experience slightly affected
- Not critical for functionality

### Recommended Solutions

#### Option 1: Make Margin Configurable
Buat jarak configurable dari admin panel, bisa di-adjust per theme.

```typescript
<div style={{ marginTop: `${config.canvasTopMargin || 0}px` }}>
  <Canvas />
</div>
```

#### Option 2: Use Absolute Positioning
Gunakan absolute positioning untuk canvas, lepas dari theme layout flow.

```typescript
<div style={{ position: 'relative' }}>
  <div style={{ position: 'absolute', top: 0, left: 0 }}>
    <Canvas />
  </div>
</div>
```

#### Option 3: Accept Current State
Jarak kecil mungkin acceptable, tidak critical untuk functionality.

### Files Affected
- `frontend/src/pages/DirectProductDesigner.tsx` - Canvas container styling

### Related Documentation
- None specific, mentioned in conversation history

---

## Priority Summary

1. **CRITICAL**: Cart Preview Image Generation - Blocks production use
2. **MEDIUM**: Mockup Color Overlay - Affects user experience
3. **LOW**: Canvas Alignment - Minor visual issue

## Next Steps

1. Implement backend preview generation (Option 1 for Issue #1)
2. Fix color overlay consistency (Option 1 or 2 for Issue #2)
3. Make canvas margin configurable (Option 1 for Issue #3)

## Notes

- Semua issue sudah di-document dengan detail
- Recommended solutions sudah di-evaluate
- Implementation bisa dilakukan secara bertahap sesuai priority
- Tidak ada blocking issue untuk basic functionality (save design, add to cart)
