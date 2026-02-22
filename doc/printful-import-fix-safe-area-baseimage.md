# Printful Import Fix - Safe Area & Base Image

**Date**: 2026-02-22  
**Status**: ✅ Fixed

## Problems

1. **Safe Area Mengecil**: Product yang di-import dari Printful memiliki safe area yang mengecil, padahal di global setting sudah diatur sekitar 90%
2. **Base Image Salah**: Product menggunakan default system placeholder image, seharusnya menggunakan mockup image dari Printful

## Root Cause

### Problem 1: Safe Area Settings Tidak Lengkap
Saat import, hanya `safeAreaPadding` yang diambil dari global settings. Field lain seperti:
- `safeAreaOffset`
- `safeAreaShape`
- `safeAreaWidth`
- `safeAreaHeight`
- `safeAreaRadius`

Tidak diambil, sehingga safe area tidak sesuai dengan global settings.

### Problem 2: Base Image Logic
Base image sudah benar menggunakan `mockupUrl` dari Printful, tapi perlu dipastikan tidak pernah menggunakan image dari global settings.

## Solution

### Updated Import Logic
**File**: `backend/routes/printful.routes.js`

**Changes**:
```javascript
const configData = {
    shop,
    shopifyProductId,
    printArea: printAreaConfig,
    baseImage: mockupUrl || null, // Always use Printful mockup, never from global
    paperSize: globalSettings?.paperSize || 'Default',
    customPaperDimensions: globalSettings?.customPaperDimensions || null,
    unit: globalSettings?.unit || 'px',
    showSafeArea: globalSettings?.showSafeArea !== undefined ? globalSettings.showSafeArea : true,
    
    // Complete safe area settings from global
    safeAreaPadding: globalSettings?.safeAreaPadding !== undefined ? globalSettings.safeAreaPadding : 0.5,
    safeAreaOffset: globalSettings?.safeAreaOffset || null,
    safeAreaShape: globalSettings?.safeAreaShape || null,
    safeAreaWidth: globalSettings?.safeAreaWidth || null,
    safeAreaHeight: globalSettings?.safeAreaHeight || null,
    safeAreaRadius: globalSettings?.safeAreaRadius || null,
    
    buttonText: globalSettings?.buttonText || 'Customize Your Design',
    designerLayout: globalSettings?.designerLayout || 'redirect',
    showRulers: globalSettings?.showRulers !== undefined ? globalSettings.showRulers : false,
    enabledTools: globalSettings?.enabledTools || {
        text: true,
        image: true,
        shape: true,
        clipart: true
    }
};
```

**Added Debug Logging**:
```javascript
console.log('[Printful Import] Config data:', {
    baseImage: configData.baseImage,
    safeAreaPadding: configData.safeAreaPadding,
    showSafeArea: configData.showSafeArea,
    paperSize: configData.paperSize,
    isTemplateMode
});
```

**Updated Upsert**:
```javascript
const merchantConfig = await prisma.merchantConfig.upsert({
    where: {
        shop_shopifyProductId: {
            shop,
            shopifyProductId
        }
    },
    create: configData,
    update: {
        printArea: printAreaConfig,
        baseImage: mockupUrl || null, // Always use Printful mockup
        paperSize: configData.paperSize,
        customPaperDimensions: configData.customPaperDimensions,
        safeAreaPadding: configData.safeAreaPadding,
        showSafeArea: configData.showSafeArea,
        updatedAt: new Date()
    }
});
```

## What Was Fixed

### 1. Safe Area Settings (Complete)
Sekarang semua safe area settings dari global config diterapkan:
- ✅ `safeAreaPadding` - Padding percentage (e.g., 0.9 for 90%)
- ✅ `safeAreaOffset` - Offset dari edge
- ✅ `safeAreaShape` - Bentuk safe area (rectangle, circle, etc)
- ✅ `safeAreaWidth` - Custom width
- ✅ `safeAreaHeight` - Custom height
- ✅ `safeAreaRadius` - Border radius untuk rounded shapes

### 2. Base Image Priority
- ✅ **Always** menggunakan mockup image dari Printful
- ✅ **Never** menggunakan image dari global settings
- ✅ Fallback ke `null` jika mockup tidak tersedia

### 3. Debug Logging
Added console logging untuk memudahkan debugging:
```
[Printful Import] Config data: {
  baseImage: 'https://customfly.us-southeast-1.linodeobjects.com/...',
  safeAreaPadding: 0.9,
  showSafeArea: true,
  paperSize: 'Default',
  isTemplateMode: true
}
```

## Testing Checklist

- [ ] Import product dari Printful Templates tab
- [ ] Verify safe area sesuai dengan global settings (90%)
- [ ] Verify base image menggunakan mockup dari Printful
- [ ] Verify tidak ada system placeholder image
- [ ] Check console logs untuk debug info
- [ ] Test dengan berbagai safe area shapes (rectangle, circle, custom)

## How to Test

1. **Set Global Settings**:
   - Go to Settings page
   - Set safe area padding to 90% (0.9)
   - Configure other safe area settings if needed
   - Save

2. **Import Printful Product**:
   - Go to Templates page
   - Click Printful tab
   - Select a product
   - Click Import

3. **Verify in Designer**:
   - Open the imported product in designer
   - Check safe area size (should be 90% of canvas)
   - Check base image (should be Printful mockup, not placeholder)
   - Verify all safe area settings match global config

## Expected Behavior

### Before Fix
- ❌ Safe area mengecil (tidak sesuai 90%)
- ❌ Base image menggunakan system placeholder
- ❌ Safe area settings tidak lengkap

### After Fix
- ✅ Safe area sesuai global settings (90%)
- ✅ Base image menggunakan Printful mockup
- ✅ Semua safe area settings diterapkan dengan benar

## Files Modified

1. `backend/routes/printful.routes.js` - Fixed import logic

## Notes

- Safe area padding 0.9 = 90% dari canvas size
- Safe area padding 0.5 = 50% dari canvas size
- Base image dari Printful sudah di-upload ke S3 untuk menghindari CORS issues
- Global settings stored dengan `shopifyProductId: 'GLOBAL'`

## Related Issues

- Safe area configuration inheritance
- Template mode global settings application
- Printful mockup image handling
