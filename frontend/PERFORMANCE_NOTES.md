# Performance Optimization Notes

## Issue: Resize lag saat drag element

### Root Cause:
- Setiap pointer move event trigger `updateElement`
- `updateElement` membuat copy baru dari seluruh `pages` array
- `useMemo` untuk `elements` di-recompute setiap kali `pages` berubah
- Ini menyebabkan re-render chain yang berat

### Current Mitigation:
1. ✅ `requestAnimationFrame` throttling di DraggableElement
2. ✅ `skipHistory: true` saat dragging
3. ✅ `useMemo` untuk elements computation

### Recommended Solutions:

#### Option 1: Batching Updates (Recommended)
```tsx
const updateElement = useCallback((id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
  setPages(prevPages => {
    const updatedPages = prevPages.map(p => {
      if (p.id === activePageId) {
        return {
          ...p,
          elements: p.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        };
      }
      return p;
    });
    
    if (!skipHistory) {
      addToHistory(updatedPages);
    }
    
    return updatedPages;
  });
}, [activePageId]);
```

#### Option 2: Separate State for Active Element
Simpan element yang sedang di-edit di state terpisah, baru commit ke pages saat selesai.

#### Option 3: Use Immer for Immutable Updates
Install `immer` untuk mempermudah immutable updates tanpa banyak spread operators.

### Performance Metrics to Monitor:
- Re-render count saat resize
- Frame rate (should stay above 30fps)
- Memory usage during long editing sessions

