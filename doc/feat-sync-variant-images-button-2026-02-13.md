# Feature: Sync Variant Images Button

**Date**: 2026-02-13  
**Status**: ✅ Implemented  
**Priority**: Medium

## Overview

Menambahkan button "Sync Variant Images" di admin designer yang akan otomatis assign image dari Shopify ke mockup untuk setiap variant yang memiliki image.

## Feature Details

### Location
Button ditampilkan di Summary panel (sidebar kanan) pada section "Product Variant":
- Posisi: Di bawah variant selector dropdown
- Di atas "Current Price"
- Hanya muncul di admin mode (tidak di public/frontend)
- Hanya muncul jika product memiliki variants

### Functionality

1. **Auto-hide Logic**:
   - Button hanya muncul jika `!isPublicMode && hasVariants`
   - Jika product tidak punya variant, button otomatis tersembunyi
   - Jika di public mode, button tidak ditampilkan

2. **Sync Process**:
   - Mengambil semua variants yang memiliki image dari Shopify
   - Assign image tersebut ke `variantBaseImages` untuk setiap variant
   - Menyimpan dengan format: `variantBaseImages[variantId] = imageUrl`
   - Juga menyimpan dengan key format: `variantBaseImages[vKey] = imageUrl` (untuk compatibility)

3. **User Feedback**:
   - Success toast: "Synced X variant images to mockups"
   - Error toast: "Failed to sync variant images"
   - Warning toast: "No variant images found in Shopify" (jika tidak ada variant dengan image)

### UI Design

```tsx
<Button
  className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
>
  <RefreshCw className="w-3.5 h-3.5" />
  Sync Variant Images
</Button>
```

- Full width button
- Blue color (bg-blue-600) untuk distinguish dari button lain
- Icon RefreshCw untuk indicate sync action
- Text size xs (text-xs) untuk consistency dengan admin UI

## Implementation

### Files Modified

1. **frontend/src/components/Summary.tsx**
   - Added `RefreshCw` icon import
   - Added `toast` import from 'sonner'
   - Added `onSyncVariantImages` prop to interface
   - Added button UI in variant section
   - Button positioned between variant selector and price

2. **frontend/src/components/DesignerCore.tsx**
   - Added `onSyncVariantImages` handler
   - Handler updates `variantBaseImages` for active page
   - Syncs all variants with images from Shopify
   - Adds to history for undo/redo support

### Code Flow

```typescript
// 1. User clicks "Sync Variant Images" button
// 2. Get all variants with images
const variantsWithImages = shopifyVariants.filter((v: any) => v.image);

// 3. Call sync handler
await onSyncVariantImages(variantsWithImages);

// 4. Handler updates page state
const updated = pages.map(p => {
  const newVariantBaseImages = { ...(p.variantBaseImages || {}) };
  
  variants.forEach((variant: any) => {
    if (variant.image) {
      const vId = String(variant.id);
      const vKey = vId.match(/\d+/)?.[0] || vId;
      newVariantBaseImages[vId] = variant.image;
      newVariantBaseImages[vKey] = variant.image;
    }
  });

  return { ...p, variantBaseImages: newVariantBaseImages };
});

// 5. Update state and history
setPages(updated);
addToHistory(updated);
```

## Use Cases

### Use Case 1: Product dengan Multiple Variants
**Scenario**: Product memiliki 5 variants (Small, Medium, Large, XL, XXL) dan setiap variant memiliki image berbeda di Shopify.

**Action**: Admin klik "Sync Variant Images"

**Result**: 
- Semua 5 variant images di-assign ke mockup
- Toast: "Synced 5 variant images to mockups"
- Setiap variant sekarang menampilkan image yang sesuai dari Shopify

### Use Case 2: Product tanpa Variants
**Scenario**: Product adalah simple product tanpa variants.

**Action**: N/A

**Result**: Button "Sync Variant Images" tidak ditampilkan (auto-hide)

### Use Case 3: Variants tanpa Images
**Scenario**: Product memiliki variants tapi tidak ada variant yang memiliki image di Shopify.

**Action**: Admin klik "Sync Variant Images"

**Result**: Toast error: "No variant images found in Shopify"

### Use Case 4: Public/Frontend Mode
**Scenario**: User membuka designer di frontend (public mode).

**Action**: N/A

**Result**: Button tidak ditampilkan karena `isPublicMode = true`

## Benefits

1. **Time Saving**: Admin tidak perlu manually assign image untuk setiap variant
2. **Consistency**: Memastikan mockup image sesuai dengan image di Shopify
3. **Bulk Operation**: Sync semua variants sekaligus dengan 1 klik
4. **Error Prevention**: Mengurangi human error saat manual assignment

## Testing Checklist

### Manual Testing
- [ ] Button muncul di admin mode untuk product dengan variants
- [ ] Button tidak muncul untuk product tanpa variants
- [ ] Button tidak muncul di public/frontend mode
- [ ] Klik button berhasil sync semua variant images
- [ ] Toast success muncul dengan jumlah variants yang di-sync
- [ ] Setiap variant menampilkan image yang correct setelah sync
- [ ] Undo/redo bekerja setelah sync
- [ ] Error handling bekerja jika tidak ada variant images

### Edge Cases
- [ ] Product dengan 1 variant saja
- [ ] Product dengan 50+ variants
- [ ] Variants dengan image URL yang invalid
- [ ] Variants dengan mixed (some have images, some don't)
- [ ] Sync multiple times (idempotent)

## Future Enhancements

1. **Selective Sync**: Checkbox untuk pilih variants mana yang mau di-sync
2. **Preview**: Show preview sebelum sync
3. **Conflict Resolution**: Warning jika variant sudah punya custom mockup
4. **Batch Sync**: Sync untuk multiple products sekaligus
5. **Auto-sync**: Option untuk auto-sync saat product data berubah

## Related Features

- Base Image Selector
- Variant Management
- Mockup System
- Shopify Integration

---

**Created by:** Kiro AI Assistant  
**Last updated:** 13 Februari 2026  
**Status:** ✅ Implemented and ready for testing

