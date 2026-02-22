# Printful Direct Design Fix

**Date**: 2026-02-22  
**Status**: ✅ Fixed

## Problem

Product yang di-import dari Printful menampilkan button "Design It" di product page, padahal seharusnya langsung menampilkan canvas untuk direct design (inline customization).

## Root Cause

Saat import Printful product, `designerLayout` diambil dari global settings yang bernilai `'redirect'`. Ini menyebabkan:
- Product page menampilkan button "Design It"
- User harus klik button untuk redirect ke designer page
- Tidak ada direct design canvas di product page

## Expected Behavior

Printful products seharusnya menggunakan **direct design** (inline canvas):
- Canvas langsung muncul di product page
- User bisa langsung customize tanpa redirect
- Better UX untuk POD (Print on Demand) products

## Solution

### Changed Default Layout for Printful Products
**File**: `backend/routes/printful.routes.js`

**Before**:
```javascript
designerLayout: globalSettings?.designerLayout || 'redirect'
```

**After**:
```javascript
designerLayout: 'inline' // Always use inline/direct design for Printful products
```

### Reasoning

Printful products adalah POD (Print on Demand) products yang:
1. Sudah memiliki mockup image yang bagus
2. Cocok untuk direct customization di product page
3. Memberikan instant preview kepada customer
4. Meningkatkan conversion rate

Oleh karena itu, **semua Printful products akan selalu menggunakan `'inline'` layout**, tidak peduli apa setting global.

## Layout Options

Ada 3 layout options di sistem:

1. **`'inline'`** - Direct design canvas di product page (untuk Printful)
2. **`'modal'`** - Canvas muncul di modal popup
3. **`'redirect'`** - Redirect ke designer page terpisah

## Fix for Existing Products

Untuk product yang sudah di-import sebelumnya, gunakan script:

```bash
cd backend
node fix_printful_layout.cjs
```

Script ini akan:
- Update `designerLayout` dari `'redirect'` ke `'inline'`
- Apply ke product ID yang sudah ada

## Testing

1. **Import New Product**:
   - Import product baru dari Printful
   - Buka product page di storefront
   - ✅ Canvas langsung muncul (tidak ada button)

2. **Existing Product**:
   - Run fix script untuk product lama
   - Refresh product page
   - ✅ Canvas langsung muncul

3. **Verify Config**:
   ```bash
   node check_printful_product.cjs
   ```
   Should show: `designerLayout: 'inline'`

## Files Modified

1. `backend/routes/printful.routes.js` - Changed default layout to 'inline'
2. `backend/fix_printful_layout.cjs` - Script to fix existing products
3. `backend/check_printful_product.cjs` - Script to verify config

## Benefits

- ✅ Better UX - No extra click needed
- ✅ Instant preview - Customer sees canvas immediately
- ✅ Higher conversion - Direct customization increases sales
- ✅ Consistent behavior - All Printful products work the same way
- ✅ Mobile friendly - Inline canvas works better on mobile

## Notes

- This change only affects **new imports** from Printful
- Existing products need to run the fix script
- Global settings `designerLayout` is still used for non-Printful products
- You can manually change layout in product config if needed

## Related

- Printful integration
- Direct design / inline customization
- Product page canvas rendering
- Storefront loader configuration
