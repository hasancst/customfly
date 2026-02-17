# Safe Area Bugs Analysis - 2026-02-17

## Context
Setelah git revert dan rebuild, ditemukan 2 bug terkait safe area:

1. **Safe area mengecil saat reload** - Safe area tidak mempertahankan ukuran yang benar saat page reload
2. **Base image meloncat saat resize safe area** - Base image position berubah saat safe area di-move atau di-resize

## Root Cause Analysis

### Bug 1: Safe Area Mengecil Saat Reload

**Location**: `frontend/src/components/DesignerCore.tsx` line 133

**Current Code**:
```typescript
const [safeAreaWidth, setSafeAreaWidth] = useState<number | undefined>(initialConfig.safeAreaWidth);
const [safeAreaHeight, setSafeAreaHeight] = useState<number | undefined>(initialConfig.safeAreaHeight);
```

**Problem**: 
- Saat config di database memiliki `safeAreaWidth` dan `safeAreaHeight` yang explicit (misalnya 95.4 dan 96.2), nilai ini akan digunakan
- Seharusnya jika nilai ini tidak ada (null/undefined), safe area dihitung dari `safeAreaPadding` (default 10% = 80% safe area)
- Tapi jika ada nilai explicit yang salah di database, safe area akan mengecil

**Expected Behavior**:
- Default safe area = 80% dari canvas (10% padding di setiap sisi)
- Jika `safeAreaWidth` dan `safeAreaHeight` adalah null/undefined, gunakan perhitungan dari `safeAreaPadding`
- Jika ada nilai explicit, gunakan nilai tersebut

**Calculation Logic** (di `Canvas.tsx` line 535-537):
```typescript
const wPercent = safeAreaWidth !== undefined ? safeAreaWidth / 100 : (1 - 2 * p);
const hPercent = safeAreaHeight !== undefined ? safeAreaHeight / 100 : (1 - 2 * p);
```

Dimana `p = safeAreaPadding / 100` (default 0.1 untuk 10% padding)

### Bug 2: Base Image Meloncat Saat Resize Safe Area

**Location**: `frontend/src/components/Canvas.tsx` lines 620-670

**Root Cause**: Framer Motion `drag` component incompatible dengan controlled position via transform

**Problem**:
1. Base image menggunakan `motion.div` dengan `drag` prop dari framer-motion
2. Position dikontrol via `transform` style dengan `baseImageProperties.x` dan `baseImageProperties.y`
3. Saat safe area berubah (move/resize), component re-render
4. Framer-motion kehilangan internal drag state dan reset position
5. Ini menyebabkan base image "jump" ke position yang salah

**Why Framer Motion Fails**:
- Framer-motion `drag` menggunakan internal state untuk tracking drag position
- Ketika parent component re-render (karena safe area state berubah), framer-motion component juga re-render
- Internal drag state hilang, menyebabkan position reset
- Controlled transform position tidak sync dengan framer-motion internal state

**Solution**: Replace framer-motion drag dengan native pointer events

## Fixes Applied

### Fix 1: Remove Offset Changes from Resize Handlers ✅

**File**: `frontend/src/components/Canvas.tsx` lines 620-670

**Changes**:
- Removed `newOffsetX` and `newOffsetY` calculations from resize handlers
- Removed `onUpdateSafeAreaOffset` call from resize handlers
- Now resize ONLY updates `safeAreaWidth` and `safeAreaHeight`
- Move ONLY updates `safeAreaOffset`

### Fix 2: Replace Framer Motion with Native Pointer Events ✅

**File**: `frontend/src/components/Canvas.tsx` lines 390-420

**Changes**:
- Replaced `<motion.div drag>` with regular `<div>`
- Implemented native `onPointerDown`, `onPointerMove`, `onPointerUp` handlers
- Same pattern as safe area move handler
- No more framer-motion internal state conflicts

**New Implementation**:
```typescript
<div
  onPointerDown={(e) => {
    e.stopPropagation();
    const startPos = { x: e.clientX, y: e.clientY };
    const startBasePos = { x: baseImageProperties?.x || 0, y: baseImageProperties?.y || 0 };
    const zoomMult = (validZoom / 100);

    const onMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startPos.x) / zoomMult;
      const dy = (moveEvent.clientY - startPos.y) / zoomMult;
      onUpdateBaseImage({
        x: startBasePos.x + dx,
        y: startBasePos.y + dy,
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }}
>
```

## Database State

Product 8232157511714 current config (after fix):
```
safeAreaPadding: 10
safeAreaWidth: null
safeAreaHeight: null
safeAreaOffset: { x: 4, y: 9 }
```

## Testing Steps

1. Set canvas to specific size in admin ✅
2. Set safe area padding to 10% ✅
3. Reload page - verify safe area is 80% of canvas
4. Move safe area - verify base image doesn't move ✅
5. Resize safe area - verify base image doesn't jump ✅
6. Save and reload - verify all settings persist correctly

## Status

✅ Fix 1: Resize handlers fixed - no more offset changes
✅ Fix 2: Base image drag replaced with native events - no more framer-motion conflicts
🔄 Ready for testing

