# Perbaikan Monogram Font Selection & Persistence

## Tanggal: 2026-02-06

## Masalah yang Diperbaiki

### 1. Font Monogram Tidak Persisten Setelah Reload
**Gejala**: Ketika user memilih custom font untuk monogram, setelah reload halaman font kembali ke default "flat" font.

**Penyebab**:
- `fontAssetId` tidak disimpan saat membuat atau mengupdate monogram
- Lookup font menggunakan `value` (nama font) bukan `assetId`
- Tidak ada sinkronisasi antara `fontMode` state dan element properties

**Solusi**:
1. **MonogramTool.tsx**:
   - Menambahkan `fontAssetId` ke element saat create dan update
   - Memperbaiki lookup menggunakan `String(assetId)` comparison
   - Menambahkan auto-update saat switch antara Fixed dan Custom mode
   - Menyederhanakan `handleAddMonogram` - update style sekarang dilakukan langsung dari button click

2. **ContextualToolbar.tsx**:
   - Memisahkan font list untuk monogram vs text biasa
   - **Untuk monogram mode Fixed (tidak ada fontAssetId)**: Hanya tampilkan Standard Monogram Styles
   - **Untuk monogram mode Custom (ada fontAssetId)**: Hanya tampilkan fonts dari asset yang dipilih
   - **Untuk text biasa**: Tampilkan semua fonts (tidak ada Standard Monogram Styles)
   - Menambahkan `fontAssetId` update untuk semua jenis element

### 2. Font Monogram dan Regular Bercampur di Dropdown
**Gejala**: Di contextual toolbar, font untuk monogram dan text biasa tercampur dalam satu dropdown.

**Penyebab**:
- Logika `availableFonts` tidak membedakan antara monogram mode Fixed dan Custom
- Standard Monogram Styles ditampilkan untuk semua monogram, bahkan yang sudah memilih custom font

**Solusi**:
```typescript
// Sebelum: Standard Monogram Styles ditampilkan untuk SEMUA monogram
if (isMonogram) {
    groups.push({ label: 'Standard Monogram Styles', fonts: [...] });
}

// Sesudah: Standard Monogram Styles hanya untuk mode Fixed
const hasCustomFont = isMonogram && selectedElement?.fontAssetId;

if (isMonogram && !hasCustomFont) {
    // Hanya tampilkan Standard Monogram Styles jika TIDAK ada fontAssetId
    groups.push({ label: 'Standard Monogram Styles', fonts: [...] });
}

if (isMonogram) {
    if (hasCustomFont) {
        // Mode Custom: hanya tampilkan fonts dari asset yang dipilih
        targetAssets = userFonts.filter(...);
    }
    // Mode Fixed: targetAssets kosong, hanya Standard Styles yang muncul
}
```

### 4. Font Rendering Issue (Flat Font)
**Gejala**: Setelah memilih font custom kedua, tampilan menjadi font biasa (flat) bukan monogram yang diinginkan.

**Penyebab**:
- Terjadi mismatch antara nama font di element (`fontFamily`) dengan nama di `@font-face` CSS.
- Sebagian font data mengandung metadata raw (setelah karakter `|`) yang tidak dibersihkan saat diupdate ke element, namun dibersihkan saat generate CSS.

**Solusi**:
- Memperketat pembersihan nama font menggunakan `cleanAssetName()` di semua titik entry (MonogramTool, ContextualToolbar, dan @font-face generator).
- Memastikan `fontFamily` yang disimpan di element hanya berisi nama font yang bersih (misal: "Adenium Monogram" bukan "Adenium Monogram|data...").

## File yang Dimodifikasi

1. **frontend/src/components/MonogramTool.tsx**
   - Line 55-75: Pembersihan paksa nama font di `flatCustomFonts`.
   - Line 140-150: Memastikan `handleAddMonogram` menggunakan data yang sudah bersih.

2. **frontend/src/components/ContextualToolbar.tsx**
   - Line 80-160: Refactored `availableFonts` untuk membersihkan semua font value.
   - Line 309-325: Explicit cleaning `cleanAssetName(val)` sebelum `handleUpdate`.

3. **frontend/src/utils/fonts.ts**
   - Memastikan `parseFontVariations` selalu mengembalikan nilai yang sudah dibersihkan.

4. **doc/design layout/bug.md**
   - Added entry #20 untuk dokumentasi bug fix ini.

## Testing Checklist

### Manual Testing
- [ ] Buat monogram baru dengan Fixed Font (Diamond, Vine, dll)
- [ ] Reload halaman → Verify font tetap sama
- [ ] Switch ke Custom Font mode
- [ ] Pilih font group dari dropdown
- [ ] Pilih specific font variation dari contextual toolbar
- [ ] Reload halaman → Verify custom font tetap sama
- [ ] Switch kembali ke Fixed Font → Verify kembali ke monogram style
- [ ] Verify dropdown font di contextual toolbar:
  - Untuk monogram: hanya Standard Monogram Styles + selected custom fonts
  - Untuk text: semua fonts tersedia

### Regression Testing
- [ ] Text element masih bisa memilih font dengan normal
- [ ] Font filtering (via fontAssetId) masih bekerja
- [ ] Monogram rendering (Diamond, Circle, Stacked, dll) masih correct
- [ ] Custom font loading via @font-face masih bekerja

## Catatan Teknis

### Font Asset ID Handling
- Semua ID comparison menggunakan `String()` wrapper untuk menghindari type mismatch
- `fontAssetId` sekarang required untuk custom fonts, memudahkan tracking dan loading

### State Management
- `fontMode` di MonogramTool sekarang sync dengan element properties
- Button click langsung update element, tidak menunggu "Add/Update" button
- `handleAddMonogram` sekarang hanya handle text update dan element creation

### Rendering Priority
Di `DraggableElement.tsx`, priority rendering:
1. `element.fontFamily` (custom font) - highest priority
2. `element.monogramType` (fixed style) - fallback
3. Default 'Vine' - last resort

## Breaking Changes
Tidak ada breaking changes. Backward compatible dengan design yang sudah ada.

## Future Improvements
1. Add visual indicator di MonogramTool untuk menunjukkan font yang aktif
2. Preview monogram dengan font yang dipilih sebelum apply
3. Tambahkan search/filter untuk font list yang panjang
