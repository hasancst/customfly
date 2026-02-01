# Remove Monogram Styles from Text Tool

## Perubahan

Menghapus section "Monogram Styles" dari tool "Add Text" karena sudah ada tool terpisah khusus untuk Monogram di toolbar.

## Alasan

1. **Separation of Concerns**: Monogram sudah memiliki tool tersendiri di toolbar dengan icon dan warna khusus (indigo)
2. **Cleaner UI**: Mengurangi kompleksitas di TextTool
3. **Better UX**: User tidak bingung dengan dua cara berbeda untuk menambahkan monogram
4. **Reduced Bundle Size**: Menghapus kode yang tidak perlu

## Yang Dihapus

### 1. Monogram Styles Collapsible Section
Seluruh section yang menampilkan 6 style monogram (Diamond, Vine, Circle, Scallop, Stacked, Round)

### 2. MONOGRAM_SHAPES Constant
Array yang berisi definisi 6 monogram shapes

### 3. MonogramShape Interface
Type definition untuk monogram shapes

### 4. selectedMonogram State
State untuk tracking monogram yang dipilih

### 5. Unused Imports
- `Layers` icon dari lucide-react
- `MonogramType` dari types

## Code Changes

### Sebelum:
```tsx
import { Layers, ... } from 'lucide-react';
import { CanvasElement, MonogramType } from '@/types';

const MONOGRAM_SHAPES: MonogramShape[] = [...];

export function TextTool(...) {
  const [selectedMonogram, setSelectedMonogram] = useState<MonogramShape | null>(null);
  
  // ...
  
  <Collapsible defaultOpen={isLockedTo3}>
    <CollapsibleTrigger>
      <Layers />
      Monogram Styles
    </CollapsibleTrigger>
    <CollapsibleContent>
      {MONOGRAM_SHAPES.map(...)}
    </CollapsibleContent>
  </Collapsible>
}
```

### Sesudah:
```tsx
import { ... } from 'lucide-react'; // No Layers
import { CanvasElement } from '@/types'; // No MonogramType

// No MONOGRAM_SHAPES
// No MonogramShape interface

export function TextTool(...) {
  // No selectedMonogram state
  
  const isMonogramSelected = selectedElement?.type === 'monogram';
  const isLockedTo3 = isMonogramSelected;
  
  // No Monogram Styles section
}
```

## Impact

### Bundle Size Reduction:
- **Header chunk**: 499.82 kB → 496.51 kB (3.31 kB reduction)
- Removed ~40 lines of unused code

### User Experience:
- **Sebelum**: User bisa menambahkan monogram dari 2 tempat (Text tool dan Monogram tool)
- **Sesudah**: User hanya menggunakan Monogram tool yang dedicated

### Behavior:
- Tool "Add Text" sekarang hanya untuk text biasa dan textarea
- Tool "Monogram" tetap berfungsi normal dengan semua 6 style
- Editing monogram yang sudah ada tetap berfungsi (3-character limit, uppercase, dll)

## File yang Dimodifikasi

- `/www/wwwroot/custom.local/frontend/src/components/TextTool.tsx`
  - Removed imports: `Layers`, `MonogramType`
  - Removed: `MonogramShape` interface
  - Removed: `MONOGRAM_SHAPES` constant
  - Removed: `selectedMonogram` state
  - Removed: Monogram Styles collapsible section
  - Simplified: `isMonogramSelected` logic

## Testing Checklist

- [x] Build berhasil tanpa error
- [ ] Tool "Add Text" tidak menampilkan Monogram Styles
- [ ] Tool "Monogram" masih berfungsi normal
- [ ] Editing monogram existing tetap berfungsi
- [ ] 3-character limit untuk monogram tetap aktif
- [ ] Max Characters hidden untuk monogram

---

**Tanggal**: 2026-01-31
**Status**: ✅ Implemented & Built
**Bundle Impact**: -3.31 kB
