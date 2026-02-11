# Fix: Modal/Redirect Canvas Centering & Missing Data - 2026-02-11

## Issues Fixed

### 1. Canvas Not Centered in Modal/Redirect Mode

**Root Cause:** The `isPublicMode` flag in `Canvas.tsx` was used as a dual-purpose flag that didn't distinguish between:
- **Direct/Inline mode** (`DirectProductDesigner`) — canvas fills its container (no centering needed)
- **Modal/Redirect mode** (`DesignerOpenCore`) — canvas SHOULD be centered

When `isPublicMode=true`, Canvas returned raw `PaperContent` without the centering wrapper (`m-auto`). This was correct for inline mode but broke modal/redirect mode which also uses `isPublicMode=true` via `DesignerOpenCore`.

**Fix:** Added a new `centerCanvas?: boolean` prop to `Canvas.tsx`:
```tsx
// Canvas.tsx - New centering logic
const shouldCenter = centerCanvas !== undefined ? centerCanvas : !isPublicMode;

if (!shouldCenter) {
    return PaperContent;  // Raw paper for inline/direct mode
}

// Centered wrapper for admin and modal/redirect mode
return (
    <div className="absolute inset-0 overflow-auto ...">
        <div className="flex min-w-full min-h-full">
            <div className="relative m-auto shrink-0">
                {PaperContent}
            </div>
        </div>
    </div>
);
```

### 2. Product/Variant Data Not Displaying in Modal/Redirect

**Root Cause:** `DesignerOpenCore.tsx` was NOT passing 3 critical props to `PublicCustomizationPanel`:
- `productData` — product info, variants, options
- `selectedVariant` — currently selected variant
- `handleOptionChange` — variant option change handler

**Fix:** Added the missing props to `PublicCustomizationPanel` in `DesignerOpenCore.tsx`.

### 3. Variant Duplicated (Showing Twice)

**Root Cause:** Both `PublicCustomizationPanel` (left sidebar) and `Summary` (right sidebar) were rendering Shopify options/variants in public mode, causing duplicates.

**Fix:** Changed `showSummary` initialization to hide Summary panel by default in public mode:
```tsx
const [showSummary, setShowSummary] = useState(!isPublicMode);
```

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/Canvas.tsx` | Added `centerCanvas` + `onZoomChange` props to interface; replaced `isPublicMode` check with `shouldCenter` logic |
| `frontend/src/components/DesignerOpenCore.tsx` | Added `centerCanvas={true}` to Canvas; added missing props (`productData`, `selectedVariant`, `handleOptionChange`) to `PublicCustomizationPanel`; changed `showSummary` to default `false` in public mode |
| `frontend/src/pages/DesignerPublic.tsx` | Removed debug logs |
| `frontend/src/components/PublicCustomizationPanel.tsx` | Added debug logging for elements count, product data, etc. |

## Separation of Concerns

The fix ensures proper separation between the three Canvas usage contexts:

```
┌─────────────────────────────────────────────────────────────┐
│ Canvas.tsx                                                   │
│                                                              │
│  centerCanvas=true  → Centered wrapper (m-auto)             │
│  centerCanvas=false → Raw PaperContent (fills container)     │
│  centerCanvas=undefined → Fallback to !isPublicMode         │
│                                                              │
│  Usage:                                                      │
│  ├── Admin (DesignerCore)     → isPublicMode=false → center │
│  ├── Modal/Redirect (OpenCore)→ centerCanvas=true  → center │
│  └── Direct/Inline            → isPublicMode=true  → no ctr │
└─────────────────────────────────────────────────────────────┘
```

## Diagnostic Logs Added

For debugging issues with elements not displaying or variant base images, diagnostic logs have been added:

1. **DesignerOpenCore.tsx** - `processedElements` logging
2. **DesignerOpenCore.tsx** - `resolvedBaseImage` logging
3. **PublicCustomizationPanel.tsx** - Panel rendering logging

Look for these in the browser console:
- `[DEBUG-Elements]` - Shows element count and types
- `[DEBUG-BaseImage]` - Shows which base image source is being used
- `[DEBUG-Panel]` - Shows panel props

## Build Verification
- ✅ `npx vite build` completed successfully with no errors

## Remaining Issues to Investigate

1. **Custom Elements Not Displaying**: Elements from admin template may not be rendering in `PublicCustomizationPanel`. Check diagnostic logs to verify:
   - `[DEBUG-Elements]` shows element count
   - `[DEBUG-Panel]` shows `elementsCount` and `editableCount`

2. **Base Image Position Reset on Variant Switch**: When switching variants, base image may jump to default position. Check:
   - `[DEBUG-BaseImage]` logs which source is used for each variant
   - Variant-specific base image positions need to be preserved per-variant
