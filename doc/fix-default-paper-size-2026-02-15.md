# Fix: Default Paper Size (1000px × 1000px)

**Date**: 2026-02-15  
**Status**: ✅ Complete  
**Issue**: Default 1000px canvas appeared too large in admin

## Problem

After implementing WYSIWYG paper sizes, the "Default (1000 × 1000 px)" canvas appeared incorrectly sized because:

1. Default was stored as 264.583mm (converted from 1000px)
2. Then converted back to pixels: 264.583mm × 3.78 = 1000px
3. But the conversion logic was treating it as millimeters, causing display issues

## Root Cause

```typescript
// WRONG: Default treated as millimeters
'Default': {
  width: 264.583,  // 1000px / 3.7795275591
  height: 264.583,
  label: 'Default (1000 × 1000 px)'
}

// Then converted: 264.583mm × 3.78 = 1000px
// But logic was inconsistent, causing wrong display
```

## Solution

### 1. Default is Special Case

Default is NOT a real paper size - it's a digital canvas size in pixels. It should NOT be converted through millimeters.

**Fixed**:
```typescript
// CORRECT: Default is already in pixels
'Default': {
  width: 1000,   // Direct pixels (no conversion)
  height: 1000,  // Direct pixels (no conversion)
  label: 'Default (1000 × 1000 px)',
  description: 'Square canvas for digital designs'
}
```

### 2. Updated Conversion Functions

**getPaperSizePX()** - Added special case for Default:
```typescript
export function getPaperSizePX(paperSize: string): { width: number; height: number } {
  // Default is special - already in pixels
  if (paperSize === 'Default') {
    return { width: 1000, height: 1000 };
  }
  
  // Other sizes: convert from mm to px
  const MM_TO_PX = 3.7795275591;
  const sizeMM = getPaperSizeMM(paperSize);
  
  return {
    width: sizeMM.width * MM_TO_PX,
    height: sizeMM.height * MM_TO_PX
  };
}
```

### 3. Updated Canvas Calculation

**DirectProductDesigner.tsx**:
```typescript
// Special case: Default is already in pixels, no conversion needed
if (paperSizeKey === 'Default') {
    return { width: 1000, height: 1000 };
}

// For other paper sizes, convert from mm to px
const dimensions = getPaperSizeMM(paperSizeKey);
const w = mmToPx(dimensions.width);
const h = mmToPx(dimensions.height);
```

**Canvas.tsx**:
```typescript
// Special case: Default is already in pixels
const isDefaultSize = paperSize === 'Default';

let paperSizeMM;
if (isDefaultSize) {
  paperSizeMM = { width: 1000, height: 1000 }; // Already in pixels
} else if (paperSize === 'Custom') {
  paperSizeMM = safeCustom;
} else {
  paperSizeMM = getPaperSizeMM(paperSize);
}

// Apply conversion only for non-Default sizes
const baseWidth = isDefaultSize ? paperSizeMM.width : paperSizeMM.width * mmToPx;
const baseHeight = isDefaultSize ? paperSizeMM.height : paperSizeMM.height * mmToPx;
```

## Paper Size Categories

### Digital Sizes (No Conversion)
- **Default**: 1000px × 1000px (direct pixels)

### Physical Sizes (MM → PX Conversion)
- **A4**: 210mm × 297mm → 793.7px × 1122.5px
- **Letter**: 215.9mm × 279.4mm → 816px × 1056px
- **All other standard sizes**

### Custom Sizes (Unit-Based Conversion)
- **Custom with px**: Direct pixels (no conversion)
- **Custom with mm**: mm × 3.78 = px
- **Custom with cm**: cm × 37.8 = px
- **Custom with inch**: inch × 96 = px

## Verification

### Test 1: Default Size
```
Select: Default (1000 × 1000 px)
Expected: Canvas 1000px × 1000px
Result: ✅ Correct
```

### Test 2: A4 Size
```
Select: A4 (210 × 297 mm)
Expected: Canvas 793.7px × 1122.5px
Result: ✅ Correct
```

### Test 3: Custom 1000px
```
Select: Custom Size
Input: 1000 × 1000
Unit: px
Expected: Same size as Default
Result: ✅ Correct
```

### Test 4: Custom 264.583mm
```
Select: Custom Size
Input: 264.583 × 264.583
Unit: mm
Expected: Same size as Default (1000px)
Result: ✅ Correct
```

## Files Changed

1. ✅ `frontend/src/constants/paperSizes.ts` - Fixed Default value
2. ✅ `frontend/src/pages/DirectProductDesigner.tsx` - Added Default special case
3. ✅ `frontend/src/components/Canvas.tsx` - Added Default special case
4. ✅ Frontend rebuilt

## Key Takeaways

1. **Default is NOT a paper size** - it's a digital canvas preset
2. **No conversion for Default** - always 1000px × 1000px
3. **Real paper sizes use mm** - converted to px at render time
4. **Custom sizes use selected unit** - converted based on unit

## Related Fixes

- ✅ Fixed Default appearing too large
- ✅ Maintained WYSIWYG for real paper sizes
- ✅ Consistent behavior across all components
- ✅ Proper unit conversion for Custom sizes

## Notes

- Default is the only "paper size" that's actually in pixels
- All other sizes are in millimeters (ISO/ANSI standards)
- Custom size can use any unit (px, mm, cm, inch)
- Conversion happens at render time, not storage time
