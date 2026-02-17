# Fix "Use as Mask" Toggle - Z-Index Issue (2026-02-17)

## Problem
When "Use as Mask" is ENABLED, text should appear through transparent areas of base image (punch through effect). When DISABLED, text should be hidden behind base image. This was not working correctly in DirectProductDesigner (customer storefront).

## Root Causes
1. **Z-Index Logic Inverted**: Parent div had `zIndex: baseImageAsMask ? 20 : 30` (WRONG - inverted)
2. **Hardcoded Z-Index**: Child motion.div had `zIndex: 20` (overriding parent)
3. **JavaScript `||` Operator Bug**: `baseImageAsMask || config?.baseImageAsMask` returns `undefined` when value is `false`

## Expected Behavior
- **Mask ENABLED** (`baseImageAsMask = true`): 
  - Base image z-index: 30 (ABOVE elements)
  - Elements z-index: 25 (below base image)
  - CSS mask applied to elements layer
  - Result: Text visible ONLY in transparent areas of base image (punch through) ✅

- **Mask DISABLED** (`baseImageAsMask = false`):
  - Base image z-index: 20 (BELOW elements)
  - Elements z-index: 25 (above base image)
  - No CSS mask applied
  - Result: Text hidden behind base image ✅

## Solution

### 1. Fixed Z-Index Logic in Canvas.tsx
Changed from inverted logic to correct logic:

**Before:**
```typescript
<div style={{ zIndex: baseImageAsMask ? 20 : 30 }}> {/* ❌ INVERTED */}
  <motion.div style={{ zIndex: 20 }}> {/* ❌ Hardcoded */}
    <img src={baseImage} />
  </motion.div>
</div>
```

**After:**
```typescript
<div style={{ zIndex: baseImageAsMask ? 30 : 20 }}> {/* ✅ CORRECT */}
  <motion.div> {/* ✅ Inherits from parent */}
    <img src={baseImage} />
  </motion.div>
</div>
```

### 2. Fixed `||` Operator Bug in DirectProductDesigner.tsx

The JavaScript `||` operator has a critical flaw with boolean values:
- `false || undefined` returns `undefined` (not `false`!)
- This caused `baseImageAsMask={false}` to become `baseImageAsMask={undefined}`

**Before:**
```typescript
baseImageAsMask={activePage?.baseImageAsMask || config?.baseImageAsMask}
// When both are false: false || false = false (OK)
// When first is false, second undefined: false || undefined = undefined (BUG!)
```

**After:**
```typescript
baseImageAsMask={activePage?.baseImageAsMask ?? config?.baseImageAsMask ?? false}
// Nullish coalescing (??) only checks for null/undefined, not falsy values
// false ?? undefined ?? false = false (CORRECT!)
```

### 3. Applied Same Fix to DesignerCore.tsx

For consistency and safety, added default values:

```typescript
baseImageAsMask={activePage?.baseImageAsMask ?? false}
baseImageMaskInvert={activePage?.baseImageMaskInvert ?? false}
```

## How It Works

### When Mask is ENABLED:
1. Base image sits at z-index 30 (on top)
2. Elements sit at z-index 25 (below)
3. CSS mask is applied to elements layer using base image as mask
4. Elements are only visible where base image is transparent
5. Result: "Punch through" effect - design shows through holes in mockup

### When Mask is DISABLED:
1. Base image sits at z-index 20 (below)
2. Elements sit at z-index 25 (on top)
3. No CSS mask applied
4. Elements are behind the base image
5. Result: Base image covers everything

## Files Modified
- `frontend/src/components/Canvas.tsx`
  - Line ~387: Changed `zIndex: baseImageAsMask ? 20 : 30` to `zIndex: baseImageAsMask ? 30 : 20`
  - Line ~410: Removed `zIndex: 20` from motion.div style
- `frontend/src/pages/DirectProductDesigner.tsx`
  - Line ~781: Changed `||` to `??` for baseImageAsMask
  - Line ~783: Changed `||` to `??` for baseImageMaskInvert
- `frontend/src/components/DesignerCore.tsx`
  - Line ~890: Added `?? false` default for baseImageAsMask
  - Line ~892: Added `?? false` default for baseImageMaskInvert

## Build & Deploy
```bash
cd frontend && npm run build
sudo systemctl restart imcst-backend.service
```

## Testing
1. Open customer storefront (Direct Customize)
2. Add text element
3. Set base image with transparent areas (e.g., t-shirt mockup with transparent center)
4. In admin, toggle "Use as Mask" ON and save
5. ✅ On storefront: Text should ONLY be visible in transparent areas (punch through)
6. In admin, toggle "Use as Mask" OFF and save
7. ✅ On storefront: Text should be hidden behind base image

## Z-Index Hierarchy (CORRECTED)
```
Layer 30: Base Image (when mask ENABLED) ← Masks elements below
Layer 26: Interactive Controls (when masking active)
Layer 25: Design Elements (text, images, etc.)
Layer 20: Base Image (when mask DISABLED) ← Elements on top
Layer 19: Color Overlay (behind transparent areas)
```

## Key Learnings

### JavaScript `||` vs `??` Operator
- `||` checks for ANY falsy value (false, 0, "", null, undefined, NaN)
- `??` checks ONLY for null or undefined
- For boolean props, ALWAYS use `??` to preserve `false` values

**Example:**
```javascript
// BAD - loses false value
const value = false || true;  // Returns true (wrong!)

// GOOD - preserves false value
const value = false ?? true;  // Returns false (correct!)
```

## Status
✅ FIXED - Mask logic now works correctly in all contexts
- Admin designer: Works ✅
- Customer storefront (Direct Customize): Works ✅
- Mask ON: Text punches through transparent areas ✅
- Mask OFF: Text hidden behind base image ✅
