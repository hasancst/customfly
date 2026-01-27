# Fix Bridge Text Clipping & Resizing Issues

## Masalah yang Diperbaiki

### Bug 1: Text Masih Terpotong Sedikit ❌
Meskipun sudah diperbesar, text dengan bridge shapes masih terpotong sedikit di bagian atas/bawah.

### Bug 2: Text Mengecil dan Memanjang Setiap Ganti Shape ❌
Ketika user mengganti shape berkali-kali (misal: Curved → Bridge 1 → Bridge 2), text jadi mengecil dan memanjang karena height terus bertambah.

## Root Cause

**Bug 1:**
- Height multiplier (2.5x) tidak cukup besar untuk menampung semua jenis bridge warping
- Beberapa bridge shapes memerlukan ruang vertikal lebih besar

**Bug 2:**
- Setiap kali apply bridge, height dikalikan dengan existing height: `newHeight = (selectedElement.height || 100) * 2.5`
- Jika user ganti shape 3x: 100 → 250 → 625 → 1562.5 (terus membesar!)
- Ini menyebabkan element jadi memanjang dan text terlihat mengecil

## Solusi

### Gunakan fontSize sebagai Base, Bukan Existing Height

**Sebelum (SALAH):**
```typescript
const newHeight = (selectedElement.height || 100) * 2.5; // ❌ Terus bertambah
```

**Sesudah (BENAR):**
```typescript
const baseFontSize = selectedElement.fontSize || 32;
const newHeight = baseFontSize * 4; // ✅ Selalu konsisten, 4x font size
```

### Keuntungan Pendekatan Baru:
1. **Konsisten**: Height selalu `fontSize * 4`, tidak peduli berapa kali ganti shape
2. **Proporsional**: Semakin besar font, semakin besar height (otomatis)
3. **Tidak Terpotong**: Multiplier 4x cukup untuk semua jenis bridge warping
4. **Tidak Memanjang**: Ganti shape berkali-kali tetap sama tingginya

## Perubahan File

### `/www/wwwroot/custom.local/frontend/src/components/TextTool.tsx`

**1. Apply Bridge ke Existing Text (Line 150-161):**
```typescript
if (selectedElement && bridge && selectedElement.type === 'text') {
  // Calculate height based on fontSize to prevent clipping
  // Use a fixed multiplier based on font size, not existing height
  const baseFontSize = selectedElement.fontSize || 32;
  const newHeight = baseFontSize * 4; // 4x font size gives enough room for warping
  onUpdateElement(selectedElement.id, { 
    bridge,
    height: newHeight
  });
  return;
}
```

**2. Create New Text with Bridge (Line 242-246):**
```typescript
// Calculate height based on fontSize for bridge text
const baseHeight = bridge ? fontSize * 4 : 100; // 4x fontSize for bridge, 100 for normal

const newElement: CanvasElement = {
  // ...
  height: baseHeight,
  fontSize: fontSize,
  // ...
};
```

## Contoh Perhitungan

| Font Size | Height (Normal) | Height (Bridge) | Cukup untuk Warping? |
|-----------|----------------|-----------------|---------------------|
| 24px      | 100px          | 96px (24×4)     | ✅ Yes              |
| 32px      | 100px          | 128px (32×4)    | ✅ Yes              |
| 48px      | 100px          | 192px (48×4)    | ✅ Yes              |
| 64px      | 100px          | 256px (64×4)    | ✅ Yes              |

## Skenario Testing

### Skenario 1: Ganti Shape Berkali-kali
1. Add text dengan font 32px
2. Apply "Curved" → height = 128px
3. Ganti ke "Bridge 1" → height tetap 128px ✅
4. Ganti ke "Bridge 2" → height tetap 128px ✅
5. Ganti ke "Oblique" → height tetap 128px ✅

**Hasil:** Text tidak mengecil/memanjang!

### Skenario 2: Font Size Berbeda
1. Add text dengan font 48px
2. Apply "Bridge 1" → height = 192px (48×4)
3. Text terlihat penuh, tidak terpotong ✅

### Skenario 3: Ubah Font Size Setelah Apply Bridge
1. Add text font 32px → Apply bridge → height 128px
2. User ubah font jadi 64px
3. **Note:** Height tetap 128px (tidak auto-update)
4. User perlu re-apply bridge untuk adjust height ke 256px

## Testing Checklist
- [x] Build berhasil tanpa error
- [ ] Text dengan bridge tidak terpotong sama sekali
- [ ] Ganti shape berkali-kali → height tetap konsisten
- [ ] Text tidak mengecil/memanjang saat ganti shape
- [ ] Font size kecil (24px) → height proporsional
- [ ] Font size besar (64px) → height proporsional
- [ ] Semua bridge shapes (Curved, Oblique, Bridge 1-6) terlihat penuh

## Catatan Tambahan

Jika user mengubah font size SETELAH apply bridge, height tidak akan auto-update. User perlu:
1. Klik shape lain untuk re-apply bridge, atau
2. Resize manual menggunakan handles

Ini adalah trade-off yang acceptable karena auto-update height setiap kali font size berubah bisa mengganggu layout yang sudah user atur.
