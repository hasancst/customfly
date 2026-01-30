# Fix Text Tool Logic & Double-Click Font Size

## Masalah yang Diperbaiki

### 1. Logic Add Text Salah ❌
**Masalah Sebelumnya:**
- Ketika user memilih text yang sudah ada di canvas, kemudian klik tombol "Add Next Text", sistem menambahkan text baru
- Ini membingungkan karena seharusnya hanya UPDATE text yang dipilih, bukan menambah text baru
- Text baru seharusnya HANYA bisa ditambah lewat "Add More Tools" atau "Add More"

**Solusi:**
- Modifikasi `handleAddText()` di `TextTool.tsx`
- Tambah logic: jika `selectedElement` sudah visible (opacity !== 0) dan bukan monogram/bridge, maka HANYA update element tersebut
- Text baru HANYA ditambah jika user klik "Add More Tools" (tidak ada element yang dipilih)
- Button label berubah menjadi "Update Text" ketika sedang mengedit text yang sudah ada

### 2. Double-Click Membuat Font Besar ❌
**Masalah Sebelumnya:**
- Ketika double-click pada text di canvas untuk edit inline, ukuran font menjadi sangat besar
- Ini karena textarea editing menggunakan `localState.fontSize * (zoom / 100)` yang mengaplikasikan zoom 2x

**Solusi:**
- Ubah `fontSize` di textarea editing dari `localState.fontSize * (zoom / 100)` menjadi `element.fontSize`
- Sekarang ukuran font tetap sama dengan ukuran aslinya saat editing

## Perubahan File

### 1. `/www/wwwroot/custom.local/frontend/src/components/TextTool.tsx`

**Perubahan di `handleAddText()`:**
```typescript
// BARU: Jika element sudah visible, HANYA update (tidak add new)
if (selectedElement && selectedElement.opacity !== 0 && !isMonogram && !bridge) {
  // Just update the existing element's text
  onUpdateElement(selectedElement.id, {
    text: text || selectedElement.text,
    fontFamily,
    color,
    fontSize,
    fontWeight,
    textAlign,
    textMode,
    maxChars: maxChars > 0 ? maxChars : undefined,
    textCase: textCase !== 'none' ? textCase : undefined,
    textType: textType !== 'all' ? textType : undefined
  });
  return; // STOP di sini, tidak add element baru
}

// BARU: Hanya add new text jika tidak ada element yang dipilih
const newElement: CanvasElement = {
  id: `text-${Date.now()}`,
  type: 'text',
  text: finalText,
  x: centerX, // Tidak lagi random offset
  y: centerY,
  // ... rest of properties
};
onAddElement(newElement);
```

**Perubahan Button Label:**
```typescript
{selectedElement?.opacity === 0
  ? (selectedElement.type === 'textarea' ? 'Add Note Area' : 'Add New Text')
  : selectedElement?.opacity !== 0
    ? 'Update Text'  // ← BARU: Jelas bahwa ini UPDATE bukan ADD
    : (selectedElement?.type === 'textarea' ? 'Add Next Note' : 'Add Next Text')}
```

### 2. `/www/wwwroot/custom.local/frontend/src/components/DraggableElement.tsx`

**Perubahan di Inline Editing:**
```typescript
// SEBELUM:
fontSize: localState.fontSize * (zoom / 100),  // ❌ Membuat font besar

// SESUDAH:
fontSize: element.fontSize || 32,  // ✅ Ukuran asli tetap
```

## User Flow Baru

### Menambah Text Baru:
1. Klik "Add More Tools" atau "Add More" di toolbar
2. Pilih "Text" dari option types
3. Ketik text yang diinginkan
4. Klik "Add New Text"
5. Text muncul di canvas

### Mengedit Text yang Sudah Ada:
1. Klik text di canvas untuk memilihnya
2. Ubah text, font, warna, dll di sidebar
3. Klik "Update Text" untuk apply perubahan
4. **TIDAK** akan menambah text baru, hanya update yang dipilih

### Double-Click untuk Edit Inline:
1. Double-click text di canvas
2. Textarea muncul dengan ukuran font yang **sama** (tidak membesar)
3. Edit text langsung
4. Tekan Enter untuk save, Escape untuk cancel

## Testing Checklist
- [x] Build berhasil tanpa error
- [ ] Memilih text yang ada + klik button = UPDATE text (tidak add new)
- [ ] Klik "Add More Tools" + pilih Text = ADD text baru
- [ ] Button label berubah menjadi "Update Text" saat edit
- [ ] Double-click text = textarea dengan ukuran font normal
- [ ] Edit inline + Enter = text tersimpan dengan benar
- [ ] Text baru selalu muncul di center canvas (tidak random offset)

## File yang Diubah
1. `/www/wwwroot/custom.local/frontend/src/components/TextTool.tsx` - Fix add text logic
2. `/www/wwwroot/custom.local/frontend/src/components/DraggableElement.tsx` - Fix double-click font size
