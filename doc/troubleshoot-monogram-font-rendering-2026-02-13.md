# Troubleshooting: Monogram Font Tidak Rendering

**Date**: 2026-02-13  
**Status**: 🔧 Debug Logging Added - Ready for Testing  
**Priority**: High

## Status Update

✅ Debug logging telah ditambahkan ke semua file kunci:
- `MonogramTool.tsx` - Log saat create monogram dengan custom font
- `DraggableElement.tsx` - Log saat render monogram
- `DesignerCore.tsx` - Log saat load font CSS (admin)
- `DesignerOpenCore.tsx` - Log saat load font CSS (frontend)

Frontend sudah di-build dan backend sudah di-restart. Sekarang siap untuk testing.

## Cara Testing

1. Buka admin atau frontend page
2. Buka browser DevTools (F12) > Console tab
3. Buat atau edit monogram element
4. Perhatikan console logs dengan prefix:
   - `[MonogramTool]` - Saat create/update monogram
   - `[DraggableElement]` - Saat render monogram
   - `[DesignerCore]` atau `[DesignerOpenCore]` - Saat load fonts

5. Jalankan debugging steps di bawah ini untuk identify root cause

## Masalah

Font monogram tidak bisa rendering dengan baik di admin maupun frontend. Masalah ini pernah terjadi sebelumnya dan sudah didokumentasikan di `doc/fitur planning/monogram-font-fix-2026-02-06.md`.

## Kemungkinan Penyebab

### 1. Font CSS Tidak Ter-load
- `@font-face` tidak di-generate dengan benar
- Font URL tidak accessible (CORS, 404, dll)
- Font file corrupt atau format tidak didukung

### 2. Font Name Mismatch
- Nama font di element (`fontFamily`) tidak match dengan nama di `@font-face`
- `cleanAssetName()` membersihkan nama secara berbeda di berbagai tempat
- Font variations tidak ter-parse dengan benar

### 3. Rendering Logic Issue
- Logika di `DraggableElement.tsx` tidak menggunakan `customFont` dengan benar
- Priority rendering salah (monogramType vs fontFamily)
- SVG `fontFamily` attribute tidak ter-apply

### 4. Asset Data Issue
- `fontAssetId` tidak tersimpan dengan benar
- Font asset tidak ter-load dari backend
- Data font di database corrupt atau incomplete

## Langkah Debugging

### Step 1: Cek Font CSS di Browser
```javascript
// Buka browser console dan jalankan:
const style = document.getElementById('designer-custom-fonts');
console.log(style?.textContent);

// Atau untuk public mode:
const style = document.getElementById('designer-custom-fonts');
console.log(style?.textContent);
```

**Expected Output:**
```css
@font-face { font-family: "Adenium Monogram"; src: url("https://..."); font-display: swap; }
@font-face { font-family: "Bickham Script"; src: url("https://..."); font-display: swap; }
```

**Check:**
- [ ] Apakah `@font-face` rules ada?
- [ ] Apakah nama font sudah bersih (tidak ada `|data:...`)?
- [ ] Apakah URL font valid dan accessible?

### Step 2: Cek Element Properties
```javascript
// Di browser console, inspect selected monogram element:
// (Klik monogram element di canvas terlebih dahulu)
console.log('Selected Element:', {
  type: element.type,
  fontFamily: element.fontFamily,
  fontAssetId: element.fontAssetId,
  monogramType: element.monogramType,
  text: element.text
});
```

**Expected Output:**
```javascript
{
  type: "monogram",
  fontFamily: "Adenium Monogram", // Harus ada jika custom font
  fontAssetId: "123", // Harus ada jika custom font
  monogramType: undefined, // Harus undefined jika custom font
  text: "ABC"
}
```

**Check:**
- [ ] Apakah `fontFamily` ada dan bersih?
- [ ] Apakah `fontAssetId` ada?
- [ ] Apakah `monogramType` undefined (untuk custom font)?

### Step 3: Cek Font Loading di Network Tab
1. Buka DevTools > Network tab
2. Filter by "Font" atau search nama font
3. Reload halaman
4. Cek apakah font file ter-download

**Check:**
- [ ] Apakah font file muncul di network tab?
- [ ] Apakah status 200 (success)?
- [ ] Apakah ada CORS error?
- [ ] Apakah file size reasonable (> 0 bytes)?

### Step 4: Cek Computed Style di Element
1. Inspect monogram SVG text element di DevTools
2. Lihat Computed tab
3. Cari property `font-family`

**Expected:**
```
font-family: "Adenium Monogram"
```

**Check:**
- [ ] Apakah font-family ter-apply?
- [ ] Apakah fallback ke system font?
- [ ] Apakah ada warning di console?

### Step 5: Test Manual Font Loading
```javascript
// Test load font manually di console:
const testFont = new FontFace('Test Font', 'url(https://your-font-url.ttf)');
testFont.load().then(() => {
  document.fonts.add(testFont);
  console.log('Font loaded successfully!');
}).catch(err => {
  console.error('Font load failed:', err);
});
```

## Kemungkinan Solusi

### Solusi 1: Pastikan cleanAssetName Konsisten
Pastikan `cleanAssetName()` dipanggil di semua tempat:
- MonogramTool saat create/update element
- ContextualToolbar saat update font
- DesignerCore/DesignerOpenCore saat generate @font-face
- DraggableElement saat render (jika perlu)

### Solusi 2: Debug Logging
Tambahkan console.log di key points:

**MonogramTool.tsx:**
```typescript
const handleAddMonogram = () => {
  // ...
  if (fontMode === 'custom' && selectedFontId) {
    const matched = flatCustomFonts.find((f: any) => String(f.assetId) === String(selectedFontId));
    console.log('[MonogramTool] Creating with custom font:', {
      selectedFontId,
      matched,
      fontFamily: matched?.value,
      fontAssetId: matched?.assetId
    });
  }
};
```

**DraggableElement.tsx:**
```typescript
case 'monogram':
  const customFont = element.fontFamily;
  console.log('[DraggableElement] Rendering monogram:', {
    fontFamily: element.fontFamily,
    fontAssetId: element.fontAssetId,
    monogramType: element.monogramType,
    customFont,
    willUseCustomFont: !!customFont
  });
```

**DesignerCore.tsx (font loading):**
```typescript
fontsToLoad.forEach(f => {
  if (f.config?.fontType === 'custom' && f.value && !f.value.includes('|')) {
    const cleanName = cleanAssetName(f.name);
    console.log('[DesignerCore] Loading font:', {
      originalName: f.name,
      cleanName,
      url: f.value
    });
    css += `@font-face { font-family: "${cleanName}"; src: url("${f.value}"); font-display: swap; }\n`;
  }
});
```

### Solusi 3: Force Font Reload
Jika font sudah ter-load tapi tidak ter-apply, coba force reload:

```typescript
// Di DesignerCore/DesignerOpenCore, setelah inject CSS:
if (style) {
  style.textContent = css;
  // Force browser to re-parse fonts
  document.fonts.ready.then(() => {
    console.log('[Font] All fonts loaded');
  });
}
```

### Solusi 4: Fallback Font
Tambahkan fallback font di SVG text:

```typescript
<text 
  fontFamily={customFont ? `"${customFont}", serif` : monogramType}
  {...monogramTextProps}
>
  {monogramText}
</text>
```

## Testing Checklist

### Admin Mode
- [ ] Buat monogram baru dengan Fixed Font (Diamond, Vine, dll)
- [ ] Verify font rendering correct
- [ ] Switch ke Custom Font mode
- [ ] Pilih font dari dropdown
- [ ] Verify custom font rendering correct
- [ ] Save design
- [ ] Reload halaman
- [ ] Verify font masih correct setelah reload

### Frontend Mode
- [ ] Buka frontend customization page
- [ ] Verify monogram dengan Fixed Font rendering correct
- [ ] Verify monogram dengan Custom Font rendering correct
- [ ] Edit text monogram
- [ ] Verify font tidak berubah saat edit

## Files to Check

1. `frontend/src/components/MonogramTool.tsx` - Font selection logic
2. `frontend/src/components/ContextualToolbar.tsx` - Font dropdown
3. `frontend/src/components/DraggableElement.tsx` - Rendering logic
4. `frontend/src/components/DesignerCore.tsx` - Font CSS generation (admin)
5. `frontend/src/components/DesignerOpenCore.tsx` - Font CSS generation (frontend)
6. `frontend/src/utils/fonts.ts` - cleanAssetName, parseFontVariations

## Related Documentation

- `doc/fitur planning/monogram-font-fix-2026-02-06.md` - Previous fix for same issue

---

**Created by:** Kiro AI Assistant  
**Last updated:** 13 Februari 2026  
**Status:** 🔧 Debug logging added - Ready for user testing

**Next Steps:**
1. User test monogram di admin/frontend
2. Check console logs untuk identify issue
3. Share console logs untuk further analysis
4. Apply fix based on findings
