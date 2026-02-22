# Printful Tab in Templates Page - Implementation Summary

**Date**: 2026-02-22  
**Status**: ✅ Completed

## Overview
Added a Printful tab to the Templates page that allows importing Printful products with global design settings applied as default templates. The tab is conditionally shown only when Printful is connected.

## Changes Made

### 1. Frontend - StoreTemplates.tsx
**File**: `frontend/src/pages/StoreTemplates.tsx`

**Added**:
- Import for `CatalogTab` component
- State variables:
  - `selectedTab` - tracks active tab (0 = My Templates, 1 = Printful)
  - `printfulConnected` - boolean flag for Printful connection status
  - `checkingPrintful` - loading state for connection check
- Function `checkPrintfulConnection()` - checks `/imcst_api/printful/status`
- Dynamic tabs array that conditionally includes "Printful" tab
- Tab content rendering with `CatalogTab` component in template mode

**Key Features**:
- Tab only appears when Printful is connected
- Passes `isTemplateMode={true}` to CatalogTab
- Checks connection status on component mount

### 2. Frontend - CatalogTab.tsx
**File**: `frontend/src/components/printful/CatalogTab.tsx`

**Changes**:
- Added `isTemplateMode?: boolean` prop to interface
- Defaults to `false` for backward compatibility
- Passes `isTemplateMode` to `ImportModal` component

### 3. Frontend - ImportModal.tsx
**File**: `frontend/src/components/printful/ImportModal.tsx`

**Changes**:
- Added `isTemplateMode?: boolean` prop to interface
- Sends `isTemplateMode` flag to backend import endpoint
- Shows info banner when in template mode: "This product will be imported with your global design settings as the default template"
- Skips redirect to designer when in template mode (stays on Templates page)

### 4. Backend - printful.routes.js
**File**: `backend/routes/printful.routes.js`

**Changes to `/import` endpoint**:
- Added `isTemplateMode` parameter extraction from request body
- Fetches global settings from database when `isTemplateMode = true`:
  ```javascript
  const globalSettings = await prisma.merchantConfig.findUnique({
      where: {
          shop_shopifyProductId: {
              shop,
              shopifyProductId: 'GLOBAL'
          }
      }
  });
  ```
- Applies global settings to new product's MerchantConfig:
  - `paperSize` - canvas size setting
  - `customPaperDimensions` - custom dimensions if set
  - `unit` - measurement unit (px, cm, in)
  - `showSafeArea` - safe area visibility
  - `safeAreaPadding` - safe area padding value
  - `buttonText` - customize button text
  - `designerLayout` - layout mode (modal/redirect/inline)
  - `showRulers` - ruler visibility
  - `enabledTools` - which tools are enabled

## How It Works

### User Flow
1. User navigates to Templates page
2. If Printful is connected, "Printful" tab appears
3. User clicks Printful tab
4. Catalog loads from database (with auto-sync if needed)
5. User clicks "Import" on a product
6. Import modal shows with info banner about template mode
7. User configures title and margin, clicks "Import Product"
8. Backend creates Shopify product with global settings applied
9. Product appears in store with default design template
10. User stays on Templates page (no redirect)

### Technical Flow
```
Templates Page
    ↓
Check Printful Connection (/imcst_api/printful/status)
    ↓
Show/Hide Printful Tab
    ↓
CatalogTab (isTemplateMode=true)
    ↓
ImportModal (isTemplateMode=true)
    ↓
POST /imcst_api/printful/import { isTemplateMode: true }
    ↓
Fetch GLOBAL MerchantConfig
    ↓
Create Shopify Product + MerchantConfig with global settings
    ↓
Success (stay on Templates page)
```

## Global Settings Storage

Global settings are stored in the `MerchantConfig` table with:
- `shopifyProductId: 'GLOBAL'`
- `shop: <shop_domain>`

This is the same pattern used throughout the codebase for global/default settings.

## Benefits

1. **Consistent Branding**: All imported Printful products automatically use store's global design settings
2. **Time Saving**: No need to configure each product individually
3. **Template Management**: Products imported via Templates tab are pre-configured
4. **Conditional UI**: Tab only shows when Printful is connected (clean UX)
5. **Backward Compatible**: Regular Printful page still works independently

## Testing Checklist

- [x] Tab appears when Printful connected
- [x] Tab hidden when Printful not connected
- [x] Catalog loads from database
- [x] Import modal shows template mode banner
- [x] Product imports with global settings
- [x] No redirect after import (stays on Templates page)
- [x] Backend restart successful
- [x] Frontend build successful

## Files Modified

1. `frontend/src/pages/StoreTemplates.tsx` - Added Printful tab
2. `frontend/src/components/printful/CatalogTab.tsx` - Added isTemplateMode prop
3. `frontend/src/components/printful/ImportModal.tsx` - Added template mode support
4. `backend/routes/printful.routes.js` - Added global settings application

## Next Steps (Optional Enhancements)

1. Add ability to preview global settings before import
2. Allow overriding specific settings during import
3. Add bulk import for multiple products
4. Show which products were imported via template mode
5. Add template mode indicator on product cards

## Notes

- The duplicate `onLoad` warning in Canvas.tsx is pre-existing and doesn't affect this feature
- Backend uses `shopifyProductId: 'GLOBAL'` convention for global settings
- Rate limiting and caching from previous tasks still apply
- Catalog sync happens automatically in background when needed
