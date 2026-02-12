# Documentation: Explicit Base Image Selection & Display Consistency (2026-02-12)

## 📌 Overview
This update implements an **Explicit Base Image Selection** system. Instead of the frontend guessing which image to show based on a priority list, the Admin now explicitly selects an image source (Manual Upload, Shopify Product, Shopify Variant, or System Default). This ensures 100% consistency between the Admin preview and the Storefront display.

## 🛠 Problems Solved

### 1. Shift from Implicit Priority to Explicit Selection
**Old Behavior:** The frontend used a hardcoded priority list (Manual > Variant > Global > Product > Placeholder). This was fragile and often caused discrepancies if different data existed in different places.
**New Behavior:** 
- Admin selects a specific image in `BaseImageModal`.
- The system stores the **Source** along with the URL: `{ source: 'manual' | 'shopify_product' | 'shopify_variant' | 'system', url: string, metadata: { ... } }`.
- Frontend reads this explicit selection and displays exactly what was chosen.

### 2. Data Normalization & Backward Compatibility
**Problem:** Legacy designs used plain string URLs for `baseImage`. 
**Solution:** Added `normalizeBaseImage` helper (backend & frontend) that converts legacy strings into the new object format on-the-fly, ensuring old designs don't break.

### 3. Metadata Tracking
**Problem:** Hard to know where an image came from (was it uploaded? was it a Shopify variant image?).
**Solution:** The new object format includes metadata like `uploadedAt` (for manual uploads) and allows for storing variant/product IDs to track ancestry.

### 4. Placeholder Filtering
**Problem:** Dummy URLs (e.g., `placehold.co`) sometimes accidentally overwritten real images.
**Solution:** Added strict `isPlaceholder()` checks that ignore any placeholder-domain URLs, falling back to the system default if no valid selection exists.

### 5. Backend Merging Logic
**Problem:** Template data sometimes conflicted with Admin settings.
**Solution:** Enhanced `public.routes.js` to properly merge `initialDesign` (template) and `config` (admin settings), giving **Admin Settings** ultimate priority and normalizing all variant-specific mockups.

## 📊 Logic & Resolution Order (Final)

1. **Variant-Specific Selection**: If an admin explicitly assigned an image to a specific variant (regardless of source), it is shown first when that variant is selected.
2. **Global Selection**: If no variant selection exists, the global `baseImage` selection (set in Admin) is shown.
3. **System Placeholder**: If no selection is made, the branded "Custom Fly" placeholder is the last resort.

> [!NOTE]
> The automatic "fallback" to Shopify variant/product images is now part of the **Explicit Selection** process. When an admin selects a variant image in the modal, it is saved as an explicit selection with `source: 'shopify_variant'`.

## 📁 Key Files Modified

- **`frontend/src/utils/baseImageUtils.ts`**: New utility library for normalization and URL extraction.
- **`backend/routes/public.routes.js`**: Enhanced merging and normalization logic.
- **`frontend/src/components/BaseImageModal.tsx`**: Updated UI to track and pass the image source.
- **`frontend/src/components/DesignerCore.tsx`**: Updated save handler to use the new object structure.
- **`frontend/src/pages/DirectProductDesigner.tsx`**: Simplified resolution logic using explicit selections.
- **`frontend/src/components/DesignerOpenCore.tsx`**: Simplified resolution logic matching Direct mode.
- **`frontend/src/types.ts`**: Updated `PageData` and `config` types to support the new object format.

## 🧪 Regression Testing
See `doc/test code/regression.md` section **"Explicit Base Image Selection"** for detailed test cases.

---
*Last updated: 2026-02-12*

