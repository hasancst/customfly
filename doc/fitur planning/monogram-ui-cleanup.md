# Monogram UI Cleanup - Remove Max Characters Control

## Perubahan

Menghapus kontrol "Max Characters" dari UI untuk elemen monogram karena sudah ada logic yang secara otomatis membatasi monogram hanya 3 huruf.

## Alasan

1. **Redundant Control**: Monogram sudah di-lock ke 3 karakter melalui `isLockedTo3` flag
2. **Cleaner UI**: Mengurangi clutter di Advanced Settings untuk monogram
3. **Better UX**: User tidak bingung dengan kontrol yang tidak berfungsi untuk monogram

## Implementasi

### Sebelum:
```tsx
<div className="space-y-1.5">
  <div className="flex items-center justify-between">
    <Label>Max Characters</Label>
    <span>0 = Unlimited</span>
  </div>
  <Input
    type="number"
    value={maxChars}
    onChange={...}
  />
</div>
```

### Sesudah:
```tsx
{!isLockedTo3 && (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label>Max Characters</Label>
      <span>0 = Unlimited</span>
    </div>
    <Input
      type="number"
      value={maxChars}
      onChange={...}
    />
  </div>
)}
```

## Behavior

- **Untuk Text/Textarea**: Kontrol "Max Characters" tetap ditampilkan
- **Untuk Monogram**: Kontrol "Max Characters" disembunyikan karena sudah fixed 3 karakter

## File yang Dimodifikasi

- `/www/wwwroot/custom.local/frontend/src/components/TextTool.tsx`
  - Line 568-590: Wrapped Max Characters section dengan `{!isLockedTo3 && (...)}`

## Testing

1. Buka designer
2. Pilih tool "Text" → Advanced Settings harus menampilkan "Max Characters"
3. Pilih tool "Monogram" → Advanced Settings **tidak** menampilkan "Max Characters"
4. Input monogram tetap terbatas 3 karakter (ABC)

---

**Tanggal**: 2026-01-31
**Status**: ✅ Implemented
