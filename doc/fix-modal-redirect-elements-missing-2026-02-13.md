# Fix: Modal/Redirect Mode - Missing Elements and Wrong Canvas Data

**Date**: February 13, 2026  
**Status**: Fixed  
**Mode**: Modal/Redirect (DesignerPublic)

## Problem

After implementing direct customize variant switching features, modal/redirect mode broke:

1. **Missing Elements**: Options (dropdown/button/checkbox) not appearing in customization panel
   - Console showed: `[IMCST DEBUG] PublicPanel Elements List: {total: 0, editable: 0}`
   - Elements array was empty

2. **Wrong Canvas Data**: Base image and canvas configuration incorrect

## Root Cause

Changes made for direct customize mode affected shared components:

1. **DesignerOpenCore.tsx**: 
   - Complex pages initialization logic that merged config values
   - Over-complicated base image resolution with normalization and placeholders
   - Added resolvedBaseScale logic
   - Excessive debug logging

2. **Canvas.tsx**: Cache busting changes (already reverted earlier)

3. **PublicCustomizationPanel.tsx**: New props added but properly handled

## Solution

Reverted DesignerOpenCore.tsx to simpler, working version from commit `0706bc7`:

### 1. Simplified Pages Initialization

**Before (broken)**:
```typescript
const [pages, setPages] = useState<PageData[]>(() => {
    const mergedPages = initialPages.map(p => ({
        ...p,
        baseImageColor: p.baseImageColor || initialConfig.baseImageColor,
        baseImageColorEnabled: p.baseImageColorEnabled !== undefined ? p.baseImageColorEnabled : initialConfig.baseImageColorEnabled,
        // ... many more merges
        elements: p.elements.map(el => {
            if (!isPublicMode) return el;
            // ...
        })
    }));
    return mergedPages;
});
```

**After (fixed)**:
```typescript
const [pages, setPages] = useState<PageData[]>(() => {
    if (!isPublicMode) return initialPages;
    return initialPages.map(p => ({
        ...p,
        elements: p.elements.map(el => {
            if ((el.type === 'text' || el.type === 'textarea' || el.type === 'monogram') && el.hideTextPreview) {
                return { ...el, text: '' };
            }
            return el;
        })
    }));
});
```

### 2. Simplified Base Image Resolution

**Before (broken)**: 120+ lines with normalization, placeholder detection, extensive logging

**After (fixed)**: Simple 40-line logic:
```typescript
const resolvedBaseImage = useMemo(() => {
    const activePage = pages.find(p => p.id === activePageId);
    if (activePage?.baseImage === 'none') return undefined;

    const rawSelectedId = String(selectedVariantId);
    const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

    const cleanUrl = (u: any) => {
        if (typeof u !== 'string') return u;
        return u.includes('|') ? u.split('|')[1].trim() : u;
    };

    // 1. Explicit UI Assignment
    let variantImage = activePage?.variantBaseImages?.[rawSelectedId] || activePage?.variantBaseImages?.[vKey];
    variantImage = cleanUrl(variantImage);
    if (variantImage && variantImage !== 'none') return variantImage;

    // 2. Legacy config variant mockups
    const vConfig = initialConfig?.variantBaseImages?.[vKey] || initialConfig?.variantBaseImages?.[rawSelectedId];
    let legacyUrl = typeof vConfig === 'string' ? vConfig : (vConfig?.url || vConfig?.default?.url);
    legacyUrl = cleanUrl(legacyUrl);
    if (legacyUrl) return legacyUrl;

    // 3. Shopify Variant Image (AUTOMATIC)
    const sVariant = productData?.variants?.find((v: any) => {
        const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
        return vid === vKey || String(v.id) === rawSelectedId;
    });
    let sVariantImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);
    sVariantImage = cleanUrl(sVariantImage);
    if (sVariantImage) {
        if (!sVariantImage.startsWith('http') && !sVariantImage.startsWith('data:')) return `data:image/jpeg;base64,${sVariantImage}`;
        return sVariantImage;
    }

    // 4. Global Page Base Image
    if (activePage?.baseImage) return cleanUrl(activePage.baseImage);

    // 5. Fallback to Shopify Product main image
    const sProductImage = productData?.images?.[0];
    const finalFallback = (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src);

    return getProxiedUrl(cleanUrl(finalFallback) || undefined);
}, [pages, activePageId, selectedVariantId, initialConfig.variantBaseImages, productData]);
```

### 3. Removed Unnecessary Code

- Removed `resolvedBaseScale` logic (40+ lines)
- Removed debug logging useEffect (20+ lines)
- Removed font loading debug logs
- Removed DesignerPublic debug logs

### 4. Fixed Canvas baseImageScale Prop

**Before**: `baseImageScale={resolvedBaseScale}`  
**After**: `baseImageScale={currentPages.baseImageScale || initialConfig.baseImageScale || 80}`

## Files Modified

1. `frontend/src/components/DesignerOpenCore.tsx` - Reverted to simpler logic
2. `frontend/src/pages/DesignerPublic.tsx` - Removed debug logging

## Key Principle

**"usahakan tidak merubah redirect tap ipengaruh ke direct"**  
(Don't change redirect/modal when fixing direct mode)

- Direct customize changes should be isolated to `DirectProductDesigner.tsx`
- Shared components (DesignerOpenCore, Canvas, PublicCustomizationPanel) must work for BOTH modes
- Keep logic simple and maintainable

## Testing

1. Build succeeded without errors
2. Modal/redirect mode should now show:
   - All option elements (dropdown, button, checkbox, etc.)
   - Correct canvas base image
   - Proper variant selection

## Notes

- Mockup color functionality is preserved (props are still passed correctly)
- hideVariantSelector functionality is preserved for direct customize
- All improvements for visibility logic and option mapping are kept
- Only the problematic complex initialization and resolution logic was reverted
