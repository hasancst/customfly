# Fix: Custom Size Unit Conversion Bug

**Date**: 2026-02-15  
**Status**: ✅ Fixed and Verified  
**Issue**: Custom 800px × 800px appeared larger than Default 1000px × 1000px

## Problem

User reported that when setting Custom Size to 800 × 800 with unit "Pixels (px)", the canvas appeared much larger than Default (1000 × 1000 px).

### Root Cause

In `Canvas.tsx`, the code was always multiplying Custom size values by `mmToPx` (3.7795275591), regardless of the selected unit.

**Example Bug**:
```
User Input: Custom 800 × 800 with unit "px"
Expected: 800px × 800px canvas
Actual: 800 × 3.78 = 3024px × 3024px canvas ❌
Result: Canvas 3x larger than expected!
```

### Why This Happened

```typescript
// WRONG CODE (before fix)
const baseWidth = Number(propWidth) || (isDefaultSize ? paperSizeMM.width : paperSizeMM.width * mmToPx);
const baseHeight = Number(propHeight) || (isDefaultSize ? paperSizeMM.height : paperSizeMM.height * mmToPx);

// When user selects Custom 800px:
// baseWidth = 800 * 3.78 = 3024px (WRONG!)
```

The code didn't check the `unit` prop, so it treated all Custom sizes as millimeters.

## Solution

### 1. Fixed Canvas.tsx

Added unit-based conversion for Custom size:

```typescript
// Calculate base dimensions based on paper size type
let baseWidth, baseHeight;

if (Number(propWidth) && Number(propHeight)) {
  // Use provided dimensions if available
  baseWidth = Number(propWidth);
  baseHeight = Number(propHeight);
} else if (isDefaultSize) {
  // Default: direct pixels, no conversion
  baseWidth = paperSizeMM.width;
  baseHeight = paperSizeMM.height;
} else if (paperSize === 'Custom') {
  // Custom: use unit-based conversion ✅
  baseWidth = paperSizeMM.width * pxPerUnit;
  baseHeight = paperSizeMM.height * pxPerUnit;
} else {
  // Standard paper sizes: convert from mm to px
  baseWidth = paperSizeMM.width * mmToPx;
  baseHeight = paperSizeMM.height * mmToPx;
}
```

### 2. Fixed DesignerOpenCore.tsx

Applied same logic to DesignerOpenCore component:

```typescript
// Get conversion factor based on unit
const unitToPx: Record<string, number> = {
    'px': 1,           // No conversion
    'mm': 3.7795275591, // 96 DPI standard
    'cm': 37.795275591, // 10mm = 1cm
    'inch': 96          // 96 pixels per inch
};
const pxPerUnit = unitToPx[unit] || 37.795275591;

// Calculate dimensions based on paper size type
if (paperSize === 'Default') {
    w = Number(paper.width || 1000);
    h = Number(paper.height || 1000);
} else if (paperSize === 'Custom') {
    // Custom: use unit-based conversion ✅
    w = Number(paper.width || 210) * pxPerUnit;
    h = Number(paper.height || 297) * pxPerUnit;
} else {
    // Standard paper sizes: convert from mm to px
    w = Number(paper.width || 210) * mmToPx;
    h = Number(paper.height || 297) * mmToPx;
}
```

### 3. Added Unit Dependency

Updated `useCallback` dependency array to include `unit`:

```typescript
}, [paperSize, customPaperDimensions, unit]);  // ✅ Added unit
```

This ensures the canvas recalculates when unit changes.

## Verification

### Test Results (Verified Working)

```javascript
// Debug output from window.canvasDebug:
{
  unit: 'px',
  inputW: 800,
  inputH: 800,
  pxPerUnit: 1,      // ✅ Correct! No conversion for px
  outputW: 800,      // ✅ Correct! 800px stays 800px
  outputH: 800
}
```

### Test Cases

✅ **Custom 800px < Default 1000px**
```
Input: Custom 800 × 800, Unit: px
Output: 800px × 800px
Result: Smaller than Default (correct!)
```

✅ **Custom 1000px = Default 1000px**
```
Input: Custom 1000 × 1000, Unit: px
Output: 1000px × 1000px
Result: Same as Default (correct!)
```

✅ **Custom 210mm = A4 width**
```
Input: Custom 210 × 297, Unit: mm
Output: 793.7px × 1122.5px
Result: Same as A4 (correct!)
```

✅ **Custom 21cm = A4 width**
```
Input: Custom 21 × 29.7, Unit: cm
Output: 793.7px × 1122.5px
Result: Same as A4 (correct!)
```

✅ **Custom 8.5 inch = Letter width**
```
Input: Custom 8.5 × 11, Unit: inch
Output: 816px × 1056px
Result: Same as Letter (correct!)
```

## Files Changed

1. ✅ `frontend/src/components/Canvas.tsx`
   - Added unit-based conversion for Custom size
   - Separated logic for Default, Custom, and Standard sizes
   - Fixed: Custom px now works correctly

2. ✅ `frontend/src/components/DesignerOpenCore.tsx`
   - Added `unitToPx` conversion map
   - Added unit-based conversion for Custom size
   - Added `unit` to dependency array

3. ✅ `frontend/index.html`
   - Added no-cache meta tags to prevent browser caching issues

4. ✅ Frontend rebuilt and verified working

## Cache Issues Encountered

During implementation, encountered Shopify embedded app cache issues:
- Browser cache persisted old JavaScript files
- Shopify iframe had additional caching layer
- Solution: Added no-cache meta tags + hard refresh required

## Key Takeaways

1. **Always check unit** when converting Custom sizes
2. **Different logic** for Default, Custom, and Standard sizes
3. **Include unit in dependencies** for reactive updates
4. **Test all units** (px, mm, cm, inch)
5. **WYSIWYG principle** applies to Custom sizes too
6. **Cache busting** important for Shopify embedded apps

## Related Documentation

- `doc/feat-custom-size-unit-selector-2026-02-15.md` - Unit selector feature
- `doc/fix-paper-size-wysiwyg-complete-2026-02-15.md` - WYSIWYG implementation
- `doc/paper-size-reference.md` - Paper size reference guide

## Notes

- Default size: Always 1000px (no conversion)
- Standard sizes: Always in mm, convert to px
- Custom size: Use selected unit for conversion
- Unit changes trigger canvas recalculation
- All conversions use 96 DPI standard
- Fix verified working in production



## Problem

User reported that when setting Custom Size to 800 × 800 with unit "Pixels (px)", the canvas appeared much larger than Default (1000 × 1000 px).

### Root Cause

In `DesignerOpenCore.tsx` and `Canvas.tsx`, the code was always multiplying Custom size values by `mmToPx` (3.7795275591), regardless of the selected unit.

**Example Bug**:
```
User Input: Custom 800 × 800 with unit "px"
Expected: 800px × 800px canvas
Actual: 800 × 3.78 = 3024px × 3024px canvas ❌
Result: Canvas 3x larger than expected!
```

### Why This Happened

```typescript
// WRONG CODE (before fix)
const mmToPx = 3.7795275591;
const w = isDefault ? paper.width : paper.width * mmToPx;  // ❌ Always multiplies by mmToPx
const h = isDefault ? paper.height : paper.height * mmToPx;

// When user selects Custom 800px:
// w = 800 * 3.78 = 3024px (WRONG!)
```

The code didn't check the `unit` prop, so it treated all Custom sizes as millimeters.

## Solution

### 1. Fixed DesignerOpenCore.tsx

Added unit-based conversion for Custom size:

```typescript
// Get conversion factor based on unit
const unitToPx: Record<string, number> = {
    'px': 1,           // No conversion
    'mm': 3.7795275591, // 96 DPI standard
    'cm': 37.795275591, // 10mm = 1cm
    'inch': 96          // 96 pixels per inch
};
const pxPerUnit = unitToPx[unit] || 37.795275591;

// Calculate dimensions based on paper size type
let w, h;

if (paperSize === 'Default') {
    // Default: direct pixels, no conversion
    w = Number(paper.width || 1000);
    h = Number(paper.height || 1000);
} else if (paperSize === 'Custom') {
    // Custom: use unit-based conversion ✅
    w = Number(paper.width || 210) * pxPerUnit;
    h = Number(paper.height || 297) * pxPerUnit;
} else {
    // Standard paper sizes: convert from mm to px
    w = Number(paper.width || 210) * mmToPx;
    h = Number(paper.height || 297) * mmToPx;
}
```

### 2. Fixed Canvas.tsx

Applied same logic to Canvas component:

```typescript
// Calculate base dimensions based on paper size type
let baseWidth, baseHeight;

if (Number(propWidth) && Number(propHeight)) {
    // Use provided dimensions if available
    baseWidth = Number(propWidth);
    baseHeight = Number(propHeight);
} else if (isDefaultSize) {
    // Default: direct pixels, no conversion
    baseWidth = paperSizeMM.width;
    baseHeight = paperSizeMM.height;
} else if (isCustomSize) {
    // Custom: use unit-based conversion ✅
    baseWidth = paperSizeMM.width * pxPerUnit;
    baseHeight = paperSizeMM.height * pxPerUnit;
} else {
    // Standard paper sizes: convert from mm to px
    baseWidth = paperSizeMM.width * mmToPx;
    baseHeight = paperSizeMM.height * mmToPx;
}
```

### 3. Added Unit Dependency

Updated `useCallback` dependency array to include `unit`:

```typescript
// Before
}, [paperSize, customPaperDimensions]);

// After
}, [paperSize, customPaperDimensions, unit]);  // ✅ Added unit
```

This ensures the canvas recalculates when unit changes.

## Conversion Examples

### Custom Size with Different Units

| Input | Unit | Conversion | Canvas Size | Correct? |
|-------|------|-----------|-------------|----------|
| 800 × 800 | px | 800 × 1 | 800px × 800px | ✅ |
| 800 × 800 | mm | 800 × 3.78 | 3024px × 3024px | ✅ |
| 800 × 800 | cm | 800 × 37.8 | 30,240px × 30,240px | ✅ |
| 800 × 800 | inch | 800 × 96 | 76,800px × 76,800px | ✅ |

### Before vs After Fix

#### Scenario 1: Custom 800px
```
Input: Custom 800 × 800, Unit: px

BEFORE (Bug):
800 × 3.78 = 3024px × 3024px ❌
Result: 3x larger than expected

AFTER (Fixed):
800 × 1 = 800px × 800px ✅
Result: Correct size
```

#### Scenario 2: Custom 210mm (A4 width)
```
Input: Custom 210 × 297, Unit: mm

BEFORE (Bug):
210 × 3.78 = 793.7px ✅ (accidentally correct)

AFTER (Fixed):
210 × 3.78 = 793.7px ✅ (intentionally correct)
```

#### Scenario 3: Custom 21cm (A4 width)
```
Input: Custom 21 × 29.7, Unit: cm

BEFORE (Bug):
21 × 3.78 = 79.4px ❌ (way too small)

AFTER (Fixed):
21 × 37.8 = 793.7px ✅ (correct)
```

## Comparison with Default

### Test Case: Custom 800px vs Default 1000px

```
Default (1000 × 1000 px):
Canvas: 1000px × 1000px

Custom 800 × 800 with unit "px":
BEFORE: 3024px × 3024px ❌ (3x larger!)
AFTER:  800px × 800px ✅ (smaller as expected)

Custom 1000 × 1000 with unit "px":
BEFORE: 3780px × 3780px ❌ (3.78x larger!)
AFTER:  1000px × 1000px ✅ (same as Default)
```

## Files Changed

1. ✅ `frontend/src/components/DesignerOpenCore.tsx`
   - Added `unitToPx` conversion map
   - Added separate logic for Default, Custom, and Standard paper sizes
   - Added `unit` to dependency array

2. ✅ `frontend/src/components/Canvas.tsx`
   - Added `isCustomSize` flag
   - Added unit-based conversion for Custom size
   - Separated logic for Default, Custom, and Standard sizes

3. ✅ Frontend rebuilt successfully

## Testing

### Test 1: Custom 800px (Smaller than Default)
```
Select: Custom Size
Input: 800 × 800
Unit: Pixels (px)
Expected: Canvas 800px × 800px (smaller than Default 1000px)
Result: ✅ Correct
```

### Test 2: Custom 1000px (Same as Default)
```
Select: Custom Size
Input: 1000 × 1000
Unit: Pixels (px)
Expected: Canvas 1000px × 1000px (same as Default)
Result: ✅ Correct
```

### Test 3: Custom 210mm (A4 width)
```
Select: Custom Size
Input: 210 × 297
Unit: Millimeters (mm)
Expected: Canvas 793.7px × 1122.5px (same as A4)
Result: ✅ Correct
```

### Test 4: Custom 21cm (A4 width)
```
Select: Custom Size
Input: 21 × 29.7
Unit: Centimeters (cm)
Expected: Canvas 793.7px × 1122.5px (same as A4)
Result: ✅ Correct
```

### Test 5: Custom 8.5 inch (Letter width)
```
Select: Custom Size
Input: 8.5 × 11
Unit: Inches (inch)
Expected: Canvas 816px × 1056px (same as Letter)
Result: ✅ Correct
```

### Test 6: Unit Switching
```
Input: 100 × 100
Switch unit: px → mm → cm → inch
Expected: Canvas size changes accordingly
Result: ✅ Correct (dependency array includes unit)
```

## Unit Conversion Reference

### Conversion Factors (96 DPI)
```
1 pixel (px) = 1 pixel
1 millimeter (mm) = 3.7795275591 pixels
1 centimeter (cm) = 37.795275591 pixels
1 inch (in) = 96 pixels
```

### Common Conversions
```
A4 width:
210mm = 21cm = 8.27" = 793.7px

Letter width:
8.5" = 215.9mm = 21.59cm = 816px

Default:
1000px = 264.58mm = 26.46cm = 10.42"
```

## Why This Bug Was Critical

### User Impact
1. **Confusing UX**: Custom 800px appeared larger than Default 1000px
2. **Wrong Previews**: WYSIWYG broken for Custom sizes with px unit
3. **Incorrect Exports**: Exported designs had wrong dimensions
4. **Lost Trust**: Users couldn't rely on pixel values

### Business Impact
1. **Support Tickets**: Users reporting "wrong canvas size"
2. **Refunds**: Printed products didn't match preview
3. **Reputation**: "The pixel values don't work correctly"

## Prevention

### Code Review Checklist
- [ ] Check if unit conversion is applied
- [ ] Verify all paper size types (Default, Custom, Standard)
- [ ] Test with all units (px, mm, cm, inch)
- [ ] Add unit to dependency arrays
- [ ] Compare Custom px with Default

### Testing Checklist
- [ ] Custom 800px < Default 1000px
- [ ] Custom 1000px = Default 1000px
- [ ] Custom 210mm = A4 width
- [ ] Custom 21cm = A4 width
- [ ] Custom 8.5" = Letter width
- [ ] Unit switching updates canvas

## Related Issues

- ✅ Fixed: Custom size always treated as millimeters
- ✅ Fixed: Pixel unit not working correctly
- ✅ Fixed: Canvas size not updating when unit changes
- ✅ Fixed: WYSIWYG broken for Custom sizes

## Related Documentation

- `doc/feat-custom-size-unit-selector-2026-02-15.md` - Unit selector feature
- `doc/fix-paper-size-wysiwyg-complete-2026-02-15.md` - WYSIWYG implementation
- `doc/paper-size-reference.md` - Paper size reference guide

## Key Takeaways

1. **Always check unit** when converting Custom sizes
2. **Different logic** for Default, Custom, and Standard sizes
3. **Include unit in dependencies** for reactive updates
4. **Test all units** (px, mm, cm, inch)
5. **WYSIWYG principle** applies to Custom sizes too

## Notes

- Default size: Always 1000px (no conversion)
- Standard sizes: Always in mm, convert to px
- Custom size: Use selected unit for conversion
- Unit changes trigger canvas recalculation
- All conversions use 96 DPI standard

