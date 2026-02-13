# Fix: Modal/Redirect Design & Mockup Color Settings - 2026-02-12

## Issues Fixed

### 1. Custom Elements Not Appearing in Frontend (Save Logic Bug) ✅ FIXED

**Root Cause:**
The save logic had a critical confusion between two save modes:

1. **"Save This Product Only"** - Should save with `isTemplate: true` and `shopifyProductId: '8214119219234'` (actual product ID)
   - This makes the design visible to customers on the frontend for THIS product only
   
2. **"Save as Store Template"** - Should save with `isTemplate: true` and `shopifyProductId: 'GLOBAL'`
   - This saves to the template library for reuse across multiple products via "Load Template Library"

The bug was that "Save This Product Only" was calling `onSave?.(false)` which set `isTemplate: false`, causing designs to not appear in the frontend because the public API only loads designs with `isTemplate: true`.

**Fix:**
1. Updated `HeaderProps` interface to accept third parameter: `saveType?: 'product' | 'global'`
2. Modified `handleSave` in `DesignerCore.tsx` to accept and pass `saveType` parameter
3. Updated `Designer.tsx` onSave callback to set correct `shopifyProductId` based on `saveType`:
   - `'product'` → uses actual `productId` (e.g., '8214119219234')
   - `'global'` → uses `'GLOBAL'`
4. Both save modes now correctly set `isTemplate: true`

**Files Changed:**
- `frontend/src/components/Header.tsx` - Updated interface and save button calls
- `frontend/src/components/DesignerCore.tsx` - Updated handleSave signature and logic
- `frontend/src/pages/Designer.tsx` - Updated onSave callback to handle saveType

### 2. Base Image Color Settings Not Reflecting in Frontend

**Root Cause:** 
- `baseImageColorMode` prop was not being passed from `DesignerOpenCore` to `Canvas` component
- `baseImageScale` was not being resolved properly (missing `resolvedBaseScale` logic)
- Initial pages were not merging config values for `baseImageColor`, `baseImageColorEnabled`, and `baseImageColorMode`

**Fix:**
1. Added `baseImageColorMode` prop to Canvas component in DesignerOpenCore
2. Added `resolvedBaseScale` logic to resolve scale from variant-specific, page-specific, or global config
3. Modified pages initialization to merge config values into pages if not present
4. Added debug logging to track base image color settings

### 2. Base Image Color Settings Not Reflecting in Frontend

**Root Cause:** 
- `DesignerOpenCore.tsx` was NOT passing 3 critical props to `PublicCustomizationPanel`:
  - `productData` — product info, variants, options
  - `selectedVariant` — currently selected variant
  - `handleOptionChange` — variant option change handler

**Fix:** 
- Added the missing props to `PublicCustomizationPanel` in `DesignerOpenCore.tsx`

### 3. Product/Variant Data Not Displaying in Modal/Redirect

**Root Cause:** 
- `DesignerOpenCore.tsx` was NOT passing 3 critical props to `PublicCustomizationPanel`:
  - `productData` — product info, variants, options
  - `selectedVariant` — currently selected variant
  - `handleOptionChange` — variant option change handler

**Fix:** 
- Added the missing props to `PublicCustomizationPanel` in `DesignerOpenCore.tsx`

## Testing Steps for Save Logic Fix

1. Open admin designer: `https://admin.shopify.com/store/uploadfly-lab/apps/customfly-1/designer/8214119219234`
2. Add custom elements (text, image, monogram, etc.)
3. Click "Save Design" → "This Product Only"
4. Check console logs - should show:
   ```
   [Designer] Saving design: {
     saveType: 'product',
     isTemplate: true,
     shopifyProductId: '8214119219234',
     productId: '8214119219234'
   }
   ```
5. Open frontend: `https://uploadfly-lab.myshopify.com/products/test-product`
6. Verify custom elements appear in the customization panel
7. Test "Save as Store Template" - should save with `shopifyProductId: 'GLOBAL'`

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/DesignerOpenCore.tsx` | Added `baseImageColorMode` and `resolvedBaseScale` props to Canvas; added missing props to PublicCustomizationPanel; merged config values into pages initialization; added debug logging |
| `frontend/src/pages/DesignerPublic.tsx` | Added debug logging for baseImageColor and baseImageColorMode |

## Implementation Details

### 1. Canvas Props Update

```tsx
<Canvas
    // ... existing props
    baseImageColor={currentPages.baseImageColor}
    baseImageColorEnabled={currentPages.baseImageColorEnabled}
    baseImageColorMode={currentPages.baseImageColorMode || initialConfig.baseImageColorMode || 'transparent'}
    baseImageScale={resolvedBaseScale}
    // ... other props
/>
```

### 2. Resolved Base Scale Logic

```tsx
const resolvedBaseScale = useMemo(() => {
    const activePage = pages.find(p => p.id === activePageId);
    const rawSelectedId = String(selectedVariantId || '');
    const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

    // 1. Check variant-specific scale
    if (selectedVariantId && activePage?.variantBaseScales?.[rawSelectedId]) {
        return activePage.variantBaseScales[rawSelectedId];
    }
    if (selectedVariantId && activePage?.variantBaseScales?.[vKey]) {
        return activePage.variantBaseScales[vKey];
    }
    if (selectedVariantId && initialConfig?.variantBaseScales?.[rawSelectedId]) {
        return initialConfig.variantBaseScales[rawSelectedId];
    }
    if (selectedVariantId && initialConfig?.variantBaseScales?.[vKey]) {
        return initialConfig.variantBaseScales[vKey];
    }

    // 2. Check page-specific scale
    if (activePage?.baseImageScale) {
        return activePage.baseImageScale;
    }

    // 3. Check global config scale
    if (initialConfig?.baseImageScale) {
        return initialConfig.baseImageScale;
    }

    // 4. Default
    return 80;
}, [pages, activePageId, selectedVariantId, initialConfig.variantBaseScales, initialConfig.baseImageScale]);
```

### 3. Pages Initialization with Config Merge

```tsx
const [pages, setPages] = useState<PageData[]>(() => {
    const mergedPages = initialPages.map(p => ({
        ...p,
        // Merge config values if not present in page
        baseImageColor: p.baseImageColor || initialConfig.baseImageColor,
        baseImageColorEnabled: p.baseImageColorEnabled !== undefined ? p.baseImageColorEnabled : initialConfig.baseImageColorEnabled,
        baseImageColorMode: p.baseImageColorMode || initialConfig.baseImageColorMode || 'transparent',
        baseImageAsMask: p.baseImageAsMask !== undefined ? p.baseImageAsMask : initialConfig.baseImageAsMask,
        baseImageMaskInvert: p.baseImageMaskInvert !== undefined ? p.baseImageMaskInvert : initialConfig.baseImageMaskInvert,
        baseImageScale: p.baseImageScale || initialConfig.baseImageScale,
        variantBaseScales: p.variantBaseScales || initialConfig.variantBaseScales,
        elements: p.elements.map(el => {
            if (!isPublicMode) return el;
            if ((el.type === 'text' || el.type === 'textarea' || el.type === 'monogram') && el.hideTextPreview) {
                return { ...el, text: '' };
            }
            return el;
        })
    }));
    return mergedPages;
});
```

### 4. PublicCustomizationPanel Props Update

```tsx
<PublicCustomizationPanel
    // ... existing props
    productData={productData}
    selectedVariant={productData?.variants?.find((v: any) => String(v.id) === String(selectedVariantId))}
    handleOptionChange={handleOptionChange}
/>
```

## Data Flow

```
Backend (public.routes.js)
    ↓ Merges template + config
    ↓ Normalizes baseImage, baseImageColor, baseImageColorMode
    ↓
DesignerPublic.tsx
    ↓ Fetches data from /imcst_public_api/product/:shop/:productId
    ↓ Passes initialConfig and initialPages to DesignerOpenCore
    ↓
DesignerOpenCore.tsx
    ↓ Merges config into pages initialization
    ↓ Resolves baseImageScale (variant → page → global → default)
    ↓ Passes props to Canvas and PublicCustomizationPanel
    ↓
Canvas.tsx
    ↓ Renders base image with color overlay
    ↓ Uses baseImageColorMode to determine overlay behavior
```

## Debug Logging

Added console logs to help diagnose issues:

1. **DesignerPublic.tsx** - Logs config data received from backend:
   ```
   [DesignerPublic] Base Image Configuration: {
     design[0].baseImageColor,
     design[0].baseImageColorEnabled,
     design[0].baseImageColorMode,
     config.baseImageColor,
     config.baseImageColorEnabled,
     config.baseImageColorMode
   }
   ```

2. **DesignerOpenCore.tsx** - Logs resolved values:
   ```
   [DesignerOpenCore] Base Image Color Debug: {
     currentPages.baseImageColor,
     currentPages.baseImageColorEnabled,
     currentPages.baseImageColorMode,
     initialConfig.baseImageColor,
     initialConfig.baseImageColorEnabled,
     initialConfig.baseImageColorMode,
     resolvedBaseImage,
     resolvedBaseScale
   }
   ```

## Testing Checklist

- [x] Custom elements visible in frontend after "Save This Product Only" (Save Logic Fix)
- [x] Template library saves work for cross-product reuse with "Save as Store Template"
- [ ] Admin sets baseImageColor in Global Settings → Frontend displays color overlay
- [ ] Admin sets baseImageColorMode to 'transparent' → Color fills transparent areas
- [ ] Admin sets baseImageColorMode to 'opaque' → Color tints opaque areas
- [ ] Admin sets baseImageScale to 50% → Frontend displays mockup at 50% scale
- [ ] Admin sets variant-specific baseImageScale → Frontend uses variant scale when variant selected
- [ ] Product options/variants display correctly in PublicCustomizationPanel
- [ ] Variant selection updates base image and scale correctly
- [ ] Modal/Redirect mode displays all customization options
- [ ] Elements from admin template display in frontend

## Related Documentation

- [fix-modal-redirect-canvas-centering-2026-02-11.md](./fix-modal-redirect-canvas-centering-2026-02-11.md)
- [fix-base-image-display-consistency-2026-02-12.md](./fix-base-image-display-consistency-2026-02-12.md)
- [color-masking-update-2026-02-10.md](./color-masking-update-2026-02-10.md)
- [mockup-scaling-fix-2026-02-11.md](./mockup-scaling-fix-2026-02-11.md)

---
*Last updated: 2026-02-12*
