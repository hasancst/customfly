# Per-Product/Variant Mockup Scaling - 2026-02-11

## Overview
Added logic to support unique mockup scales for different products, views (pages), and variants. Previously, the "Mockup Scale" was a global setting that affected all views and variants equally.

## Implementation Details

### 1. Multi-Level Scale Resolution
The mockup scale is now resolved using the following priority (highest to lowest):
1. **Variant-Specific Scale:** Saved in `pages[i].variantBaseScales[variantId]`.
2. **Page-Specific Scale:** Saved in `pages[i].baseImageScale`.
3. **Global Product Default:** Saved in `config.baseImageScale`.

### 2. Context-Aware Slider
In `DesignerCore.tsx`, the scale slider now intelligently updates:
- If a specific variant is selected and it is NOT linked to the global design, the slider updates that **variant's specific scale**.
- Otherwise, it updates the **current page/view's scale**.
- It also updates the global default for brand new pages.

### 3. Public Side Integration
In `DirectProductDesigner.tsx`, the same resolution logic was added to ensure customers see the mockup exactly as configured in the admin, respecting any per-variant scale overrides.

### 4. Data Structure Changes
Updated `PageData` in `types.ts` to include:
- `baseImageScale?: number`
- `variantBaseScales?: Record<string, number>`

## Summary of Changes
- **`types.ts`**: Added scaling fields to `PageData`.
- **`DesignerCore.tsx`**: Implemented `resolvedBaseScale` and context-aware update handler.
- **`GlobalSettingsDesigner.tsx`**: Updated to support per-page scaling.
- **`DirectProductDesigner.tsx`**: Updated to resolve scale with variant priority.
- **`Canvas.tsx`**: Continues to use the `baseImageScale` prop as the primary scaling factor.
