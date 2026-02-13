# Fix: Mockup Color Implementation for Frontend

**Date**: 2026-02-13  
**Status**: ⏸️ PENDING - Kompleksitas tinggi, butuh pendekatan berbeda  
**Priority**: Medium (dipending dulu)

## Summary

⏸️ Fitur mockup color selection untuk frontend customer telah diimplementasikan secara teknis, namun dipending karena kompleksitas dalam penerapannya. UI sudah ada, props sudah tersambung, tapi hasil visual belum sesuai ekspektasi.

## Alasan Pending

1. **Kompleksitas CSS Masking**: Berbagai pendekatan CSS mask (mask-composite, inverted mask, dll) tidak konsisten di berbagai browser
2. **Z-index Stacking Context**: Meskipun sudah dipindahkan ke luar container, masih ada issue dengan layer stacking
3. **Blend Mode Limitations**: `mixBlendMode: 'multiply'` tidak memberikan hasil yang diinginkan untuk semua kasus
4. **Transparent Area Detection**: Sulit mendeteksi area transparent dari mockup image secara akurat dengan CSS saja

## Pendekatan yang Sudah Dicoba

### 1. CSS Mask dengan Composite
- Menggunakan `mask-composite: exclude/subtract` untuk area transparent
- **Issue**: Tidak konsisten di Safari vs Chrome/Firefox
- **Issue**: CORS problem dengan mask image URL

### 2. Simple Overlay dengan Mix Blend Mode
- Overlay sederhana dengan `mixBlendMode: 'multiply'` dan `opacity: 0.5`
- **Issue**: Warna menutupi seluruh area, tidak hanya transparent area
- **Issue**: Hasil visual tidak natural

### 3. Z-index Positioning
- Memindahkan overlay keluar dari base image container
- Set z-index 35 (di atas semua element)
- **Issue**: Tetap tidak memberikan hasil yang diinginkan

## Solusi Alternatif yang Direkomendasikan

### Option A: Canvas-based Color Application (Recommended)
Gunakan HTML5 Canvas untuk apply color secara programmatic:
```typescript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Apply color only to non-transparent pixels
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      // Apply color multiplication
      data[i] = (data[i] * colorR) / 255;
      data[i + 1] = (data[i + 1] * colorG) / 255;
      data[i + 2] = (data[i + 2] * colorB) / 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};
img.src = baseImageUrl;
```

**Pros**: 
- Kontrol penuh atas pixel manipulation
- Bisa deteksi transparent area dengan akurat
- Konsisten di semua browser

**Cons**: 
- Lebih kompleks implementasinya
- Performance overhead untuk image besar
- Perlu handle CORS dengan benar

### Option B: Server-side Image Processing
Generate colored mockup di backend:
```javascript
// Backend API endpoint
POST /api/generate-colored-mockup
{
  baseImageUrl: string,
  color: string,
  variantId: string
}

// Response: URL to generated colored image
```

**Pros**:
- Hasil paling akurat dan konsisten
- Bisa di-cache untuk performance
- Tidak ada CORS issue

**Cons**:
- Butuh image processing library di backend (Sharp, ImageMagick)
- Storage overhead untuk cached images
- Latency untuk generate pertama kali

### Option C: SVG Filter (Intermediate)
Gunakan SVG color matrix filter:
```typescript
<svg style={{ position: 'absolute', width: 0, height: 0 }}>
  <defs>
    <filter id="colorize">
      <feColorMatrix
        type="matrix"
        values={`
          ${r/255} 0 0 0 0
          0 ${g/255} 0 0 0
          0 0 ${b/255} 0 0
          0 0 0 1 0
        `}
      />
    </filter>
  </defs>
</svg>
<img src={baseImage} style={{ filter: 'url(#colorize)' }} />
```

**Pros**:
- Lebih sederhana dari Canvas
- Performa bagus
- Browser support cukup baik

**Cons**:
- Terbatas pada color transformation
- Tidak bisa target hanya transparent area

## Changes Made

### 1. PublicCustomizationPanel.tsx

**Added Props:**
```typescript
interface PublicCustomizationPanelProps {
    // ... existing props
    userColors?: any[];
    baseImageColor?: string;
    baseImageColorEnabled?: boolean;
    onBaseImageColorChange?: (color: string) => void;
    onBaseImageColorEnabledChange?: (enabled: boolean) => void;
    selectedBaseColorAssetId?: string | null;
}
```

**Added Helper Function:**
```typescript
const parseAssetColors = (value: string) => {
    // Parse color assets from "Name | #HEX" format
    // Returns array of { name, value }
}
```

**Added UI:**
- Mockup Color section with toggle switch
- Color palette grid (32x32px icons, flex-wrap layout)
- Auto-enable when color is clicked
- Appears after Shopify product options

### 2. DesignerOpenCore.tsx

**Passed Props to PublicCustomizationPanel:**
```typescript
userColors={userColors}
baseImageColor={currentPages.baseImageColor}
baseImageColorEnabled={currentPages.baseImageColorEnabled || false}
onBaseImageColorChange={(color) => setPages(...)}
onBaseImageColorEnabledChange={(enabled) => setPages(...)}
selectedBaseColorAssetId={selectedBaseColorAssetId}
```

### 3. Canvas.tsx

**Final Color Overlay Implementation:**
```typescript
// Color overlay positioned OUTSIDE base image container
// This fixes z-index stacking context issue
{baseImageColorEnabled && baseImageColor && (
  <div
    className="absolute pointer-events-none"
    data-color-overlay="true"
    data-color={baseImageColor}
    style={{
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) translate(${baseX}px, ${baseY}px) scale(${scale})`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      zIndex: 35, // Above elements (25-26) and safe area (30)
      backgroundColor: baseImageColor,
      mixBlendMode: 'multiply',
      opacity: 0.5
    }}
  />
)}
```

**Key Technical Decisions:**
1. Moved overlay outside base image container (was getting covered by elements layer)
2. Used simple `mixBlendMode: 'multiply'` instead of CSS mask-composite (better browser compatibility)
3. Set z-index to 35 to ensure visibility above all other layers
4. Removed debug styling (red border and debug text) for production
5. Removed console.log statements for production

## Status Implementasi Saat Ini

### ✅ Yang Sudah Selesai
1. UI color list di PublicCustomizationPanel (32x32px icons)
2. Toggle switch untuk enable/disable
3. Props passing dari DesignerOpenCore ke PublicCustomizationPanel
4. Color overlay element (secara teknis render di DOM)
5. Auto-enable saat klik color

### ⚠️ Yang Belum Sesuai Ekspektasi
1. Color overlay tidak memberikan hasil visual yang natural
2. Warna tidak hanya apply di transparent area saja
3. Blend mode tidak konsisten di berbagai kondisi
4. Perlu pendekatan yang lebih robust (Canvas atau server-side)

### 🔧 Code yang Sudah Dibuat (Bisa Dipakai Nanti)
- `parseAssetColors()` helper function
- Color palette UI component
- Props interface untuk mockup color
- Basic overlay rendering logic

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `frontend/src/components/PublicCustomizationPanel.tsx` | Added color UI and props | ✅ Complete |
| `frontend/src/components/DesignerOpenCore.tsx` | Pass color props to PublicCustomizationPanel | ✅ Complete |
| `frontend/src/components/Canvas.tsx` | Color overlay with proper z-index positioning | ✅ Complete |

## Testing Checklist

### Admin (Backend)
- [x] Color list appears in Assets > Colors
- [x] UI untuk color selection
- [ ] Color overlay dengan hasil yang natural (pending)

### Frontend (Customer)
- [x] Color list appears in customization panel
- [x] Color icons properly sized (32x32px)
- [x] Toggle works
- [ ] Color overlay dengan hasil yang natural (pending)
- [ ] Color hanya apply di transparent area (pending)

## Next Steps (Ketika Dilanjutkan)

1. **Pilih Pendekatan**: Canvas-based (recommended) atau Server-side
2. **Implement Chosen Approach**: Sesuai dengan option yang dipilih
3. **Testing**: Test di berbagai browser dan kondisi
4. **Performance**: Optimize untuk image besar
5. **Caching**: Implement caching strategy jika pakai server-side

## Related Documentation

- `doc/fix-variant-base-image-priority-2026-02-12.md` - Base image resolution logic
- `doc/fix-base-image-upload-object-error-2026-02-12.md` - Base image URL handling
- `doc/fix-save-logic-custom-elements-2026-02-12.md` - Save logic for templates

---

**Created by:** Kiro AI Assistant  
**Last updated:** 13 Februari 2026  
**Status:** ⏸️ Pending - Butuh pendekatan Canvas-based atau server-side untuk hasil yang lebih baik

**Note**: UI dan props sudah siap, tinggal implement color application logic yang lebih robust.
