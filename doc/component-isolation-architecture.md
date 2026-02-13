# Component Isolation Architecture

## Overview
Aplikasi ini memiliki 3 mode berbeda yang harus terisolasi satu sama lain:
1. **Admin Mode** - untuk konfigurasi produk
2. **Redirect/Modal Mode** - untuk customer customize via popup/redirect
3. **Direct Customize Mode** - untuk customer customize langsung di product page

## Architecture

### 1. Admin Mode
**Entry Point**: `frontend/src/pages/Designer.tsx`
**Core Component**: `frontend/src/components/DesignerCore.tsx`

**Karakteristik**:
- Full access ke semua fitur (toolbar lengkap, config, assets)
- Menyimpan ke database via authenticated API
- State management: local state dalam DesignerCore
- Auto-save: setiap 30 detik ke product config (bukan global)

**Komponen Khusus**:
- `Toolbar.tsx` - full toolbar dengan semua tools
- `Summary.tsx` - sidebar kanan dengan config
- `Header.tsx` - header dengan save button

### 2. Redirect/Modal Mode
**Entry Point**: `frontend/src/pages/DesignerPublic.tsx`
**Core Component**: `frontend/src/components/DesignerOpenCore.tsx`

**Karakteristik**:
- Limited access (hanya customization, tidak ada config)
- Menyimpan design customer ke database
- State management: local state dalam DesignerOpenCore
- Menggunakan data dari backend (read-only config)

**Komponen Khusus**:
- `PublicCustomizationPanel.tsx` - sidebar untuk customer input
- `DesignerOpenCore.tsx` - simplified designer tanpa admin features

### 3. Direct Customize Mode
**Entry Point**: `frontend/src/pages/DirectProductDesigner.tsx`
**Core Component**: Standalone (tidak menggunakan DesignerCore/DesignerOpenCore)

**Karakteristik**:
- Embedded langsung di product page Shopify
- Auto-detect variant changes dari Shopify form
- State management: local state dalam DirectProductDesigner
- Menggunakan PublicCustomizationPanel dengan hideVariantSelector=true

**Komponen Khusus**:
- `DirectProductDesigner.tsx` - standalone implementation
- Menggunakan `PublicCustomizationPanel` dengan props khusus
- Menggunakan `Canvas` dengan props khusus

## Shared Components (Props-Based, No Global State)

### Canvas.tsx
**Digunakan oleh**: Admin, Redirect/Modal, Direct
**Isolasi**: Semua data via props, tidak ada global state
**Props kunci**:
- `elements` - array of canvas elements
- `baseImage` - mockup image URL
- `zoom` - zoom level
- `isPublicMode` - flag untuk mode public

### PublicCustomizationPanel.tsx
**Digunakan oleh**: Redirect/Modal, Direct
**Isolasi**: Semua data via props, tidak ada global state
**Props kunci**:
- `elements` - array of editable elements
- `productData` - Shopify product data
- `hideVariantSelector` - true untuk direct mode (Shopify sudah punya selector)
- `userColors`, `baseImageColor`, dll - untuk mockup color feature

### DraggableElement.tsx
**Digunakan oleh**: Canvas (semua mode)
**Isolasi**: Pure component, hanya render berdasarkan props

## Isolation Rules

### Rule 1: No Shared State
- Setiap mode memiliki state management sendiri
- Tidak ada Redux, Context, atau global state yang shared
- Semua komunikasi via props

### Rule 2: Separate Entry Points
- Admin: `/admin/designer/:productId`
- Redirect/Modal: `/designer/:productId?shop=...`
- Direct: Embedded via `<div id="imcst-direct-designer">`

### Rule 3: Independent Data Flow
```
Admin Mode:
  Designer.tsx → DesignerCore.tsx → Canvas/Toolbar/Summary
  
Redirect/Modal Mode:
  DesignerPublic.tsx → DesignerOpenCore.tsx → Canvas/PublicCustomizationPanel
  
Direct Mode:
  DirectProductDesigner.tsx → Canvas/PublicCustomizationPanel
```

### Rule 4: Props-Only Communication
Shared components hanya menerima data via props:
```typescript
// ✅ GOOD - Props based
<Canvas 
  elements={elements}
  baseImage={baseImage}
  zoom={zoom}
/>

// ❌ BAD - Global state
const globalState = useGlobalStore();
<Canvas />
```

### Rule 5: Mode-Specific Features
Features yang hanya ada di mode tertentu harus di-check via props:
```typescript
// Di Canvas.tsx
{!isPublicMode && (
  <AdminOnlyFeature />
)}

// Di PublicCustomizationPanel.tsx
{!hideVariantSelector && (
  <VariantSelector />
)}
```

## Testing Isolation

Untuk memastikan isolasi tetap terjaga:

1. **Test Admin Mode**:
   - Buka `/admin/designer/:productId`
   - Edit design, save
   - Pastikan tidak mempengaruhi redirect/direct

2. **Test Redirect/Modal Mode**:
   - Buka `/designer/:productId?shop=...`
   - Customize product, add to cart
   - Pastikan tidak mempengaruhi admin/direct

3. **Test Direct Mode**:
   - Embed di product page
   - Change variant, customize
   - Pastikan tidak mempengaruhi admin/redirect

## Common Pitfalls to Avoid

### ❌ Don't: Add Global State
```typescript
// BAD - akan mempengaruhi semua mode
const globalZoom = createGlobalState(80);
```

### ❌ Don't: Share Refs Across Modes
```typescript
// BAD - ref akan conflict
const canvasRef = useRef();
```

### ❌ Don't: Use Same localStorage Keys
```typescript
// BAD - akan overwrite satu sama lain
localStorage.setItem('zoom', zoom);
```

### ✅ Do: Use Props
```typescript
// GOOD - isolated via props
<Canvas zoom={localZoom} />
```

### ✅ Do: Use Mode-Specific Keys
```typescript
// GOOD - different keys per mode
localStorage.setItem(`admin-zoom-${productId}`, zoom);
localStorage.setItem(`direct-zoom-${productId}`, zoom);
```

### ✅ Do: Check Mode Before Rendering
```typescript
// GOOD - conditional rendering
{isPublicMode ? <PublicFeature /> : <AdminFeature />}
```

## File Structure

```
frontend/src/
├── pages/
│   ├── Designer.tsx              # Admin entry point
│   ├── DesignerPublic.tsx        # Redirect/Modal entry point
│   └── DirectProductDesigner.tsx # Direct entry point
├── components/
│   ├── DesignerCore.tsx          # Admin core (full features)
│   ├── DesignerOpenCore.tsx      # Redirect/Modal core (limited)
│   ├── Canvas.tsx                # Shared (props-based)
│   ├── PublicCustomizationPanel.tsx # Shared (props-based)
│   ├── DraggableElement.tsx      # Shared (props-based)
│   ├── Toolbar.tsx               # Admin only
│   ├── Summary.tsx               # Admin only
│   └── Header.tsx                # Shared (different props per mode)
```

## Summary

Isolasi dijaga dengan:
1. ✅ Separate entry points dan core components
2. ✅ Props-only communication untuk shared components
3. ✅ No global state (Redux, Context, etc)
4. ✅ Mode-specific features via conditional rendering
5. ✅ Independent state management per mode

Dengan arsitektur ini, perubahan di satu mode tidak akan mempengaruhi mode lainnya.
