# Penjelasan: Kenapa Save Tidak Berhasil Update Base Image

**Tanggal:** 2026-02-16  
**Issue:** Base image tidak update di frontend setelah save

---

## Perbedaan "This Product Only" vs "Store Template"

### This Product Only
```typescript
onClick={() => onSave?.(true, false, 'product')}
```
- `isTemplate = true`
- `saveType = 'product'`
- `shopifyProductId = productId` (contoh: 8232157511714)
- **Tujuan:** Save design sebagai template untuk product ini saja
- **Visible to:** Customer yang buka product ini

### Store Template
```typescript
onClick={() => onSave?.(true, false, 'global')}
```
- `isTemplate = true`
- `saveType = 'global'`
- `shopifyProductId = 'GLOBAL'`
- **Tujuan:** Save design ke template library (bisa di-load di semua product)
- **Visible to:** Semua product yang load global template

---

## Alur Save "This Product Only"

### 1. User Klik "This Product Only"
```typescript
// Header.tsx
onClick={() => onSave?.(true, false, 'product')}
```

### 2. DesignerCore handleSave
```typescript
// DesignerCore.tsx
const handleSave = async (isTemplate = false, isSilent = false, saveTypeOrOutputSettings?: 'product' | 'global' | any) => {
    const isSaveType = saveTypeOrOutputSettings === 'product' || saveTypeOrOutputSettings === 'global';
    const saveType = isSaveType ? saveTypeOrOutputSettings as ('product' | 'global') : undefined;
    
    const data = {
        id: designId,
        name: designName,
        productId,
        isTemplate,
        saveType, // 'product'
        config: { ... },
        designJson: finalGlobal.map(p => ({ ...p, elements: p.elements }))
    };
    
    await onSave(data);
}
```

### 3. Designer.tsx onSave
```typescript
// Designer.tsx
onSave={async (data) => {
    const finalShopifyProductId = data.saveType === 'global' ? 'GLOBAL' : productId;
    // data.saveType = 'product' → finalShopifyProductId = '8232157511714'
    
    // 1. Save Design
    const designRes = await fetch('/imcst_api/design', {
        method: 'POST',
        body: JSON.stringify({
            id: data.id,
            name: data.name,
            designJson: data.designJson,
            isTemplate: data.isTemplate, // true
            shopifyProductId: finalShopifyProductId // '8232157511714'
        })
    });
    
    // 2. Save Config
    const configRes = await fetch('/imcst_api/config', {
        method: 'POST',
        body: JSON.stringify({
            productId, // '8232157511714'
            ...data.config,
            baseImage: data.designJson[0]?.baseImage || data.config.baseImage,
        })
    });
}}
```

---

## Masalah: Kenapa Base Image Tidak Ter-save?

### Kemungkinan 1: designJson Tidak Punya baseImage

Ketika user ganti image di admin:
```typescript
// DesignerCore.tsx - onSelectImage
setPages(prev => {
    const updated = prev.map(p => ({
        ...p,
        baseImage: normalizedUrl // ✅ State ter-update
    }));
    return updated;
});
```

State `pages` ter-update ✅

TAPI ketika save:
```typescript
// DesignerCore.tsx - handleSave
const finalGlobal = isLinkedCurrent ? pages : globalDesigns;

const data = {
    designJson: finalGlobal.map(p => ({
        ...p,
        elements: p.elements
        // ❌ MASALAH: Hanya copy elements, tidak copy baseImage!
    }))
};
```

**MASALAH:** `designJson` hanya copy `elements`, tidak copy `baseImage`!

### Kemungkinan 2: Variant-Specific Logic

Jika user sedang edit variant tertentu:
```typescript
const isLinkedCurrent = !variantDesigns[selectedVariantId];
const finalGlobal = isLinkedCurrent ? pages : globalDesigns;
```

- Jika variant linked → `finalGlobal = pages` ✅
- Jika variant unlinked → `finalGlobal = globalDesigns` ❌

Jika variant unlinked, `finalGlobal` adalah `globalDesigns` yang mungkin tidak ter-update!

### Kemungkinan 3: baseImage Tidak Di-copy

Lihat kode save:
```typescript
designJson: finalGlobal.map(p => ({
    ...p,
    elements: p.elements
}))
```

Ini seharusnya:
```typescript
designJson: finalGlobal.map(p => ({
    ...p,
    elements: p.elements,
    baseImage: p.baseImage, // ✅ Explicitly copy
    variantBaseImages: p.variantBaseImages,
    baseImageScale: p.baseImageScale,
    // ... other properties
}))
```

TAPI karena pakai spread operator `...p`, seharusnya semua properties ter-copy.

**KECUALI** jika `finalGlobal` tidak punya `baseImage` yang benar!

---

## Root Cause: finalGlobal Tidak Ter-update

### Skenario

1. User buka designer → Load data
   - `initialPages` dari database punya iPhone image
   - `pages` state = iPhone image
   - `globalDesigns` state = iPhone image

2. User ganti image ke placeholder
   - `pages` state = placeholder ✅
   - `globalDesigns` state = iPhone image (TIDAK TER-UPDATE) ❌

3. User klik "Save"
   - Cek: `isLinkedCurrent`?
   - Jika variant unlinked → `finalGlobal = globalDesigns` (iPhone image) ❌
   - Jika variant linked → `finalGlobal = pages` (placeholder) ✅

4. Save ke database
   - `designJson[0].baseImage` = finalGlobal[0].baseImage
   - Jika finalGlobal = globalDesigns → Save iPhone image ❌
   - Jika finalGlobal = pages → Save placeholder ✅

---

## Solusi: Update globalDesigns Saat Ganti Image

### Fix di DesignerCore.tsx

Ketika user ganti image, update BOTH `pages` dan `globalDesigns`:

```typescript
onSelectImage={(url, source, targetVariantId) => {
    const normalizedUrl = (!url || url === 'none') ? 'none' : url;
    
    // Update pages
    setPages(prev => {
        const updated = prev.map(p => ({
            ...p,
            baseImage: normalizedUrl
        }));
        addToHistory(updated);
        return updated;
    });
    
    // ✅ ALSO update globalDesigns
    setGlobalDesigns(prev => {
        return prev.map(p => ({
            ...p,
            baseImage: normalizedUrl
        }));
    });
}}
```

### Atau: Selalu Gunakan pages untuk Save

```typescript
const handleSave = async (...) => {
    // ✅ ALWAYS use current pages, not globalDesigns
    const data = {
        designJson: pages.map(p => ({
            ...p,
            elements: p.elements
        }))
    };
}
```

---

## Verifikasi

### Test 1: Cek State Saat Save

Tambah logging:
```typescript
const handleSave = async (...) => {
    console.log('[Save] State check:', {
        'pages[0].baseImage': pages[0]?.baseImage,
        'globalDesigns[0].baseImage': globalDesigns[0]?.baseImage,
        'finalGlobal[0].baseImage': finalGlobal[0]?.baseImage,
        isLinkedCurrent,
        selectedVariantId
    });
}
```

### Test 2: Cek Data yang Dikirim

```typescript
console.log('[Save] Sending to backend:', {
    'designJson[0].baseImage': data.designJson[0]?.baseImage,
    'config.baseImage': data.config.baseImage
});
```

### Test 3: Cek Response Backend

```typescript
if (designRes.ok && configRes.ok) {
    const savedDesign = await designRes.json();
    console.log('[Save] Backend response:', {
        'savedDesign.designJson[0].baseImage': savedDesign.designJson?.[0]?.baseImage
    });
}
```

---

## Kesimpulan

**Root Cause:**
- `globalDesigns` state tidak ter-update ketika user ganti image
- Ketika save, jika variant unlinked, pakai `globalDesigns` (image lama)
- Hasilnya: Database ter-save dengan image lama

**Fix:**
1. Update `globalDesigns` saat ganti image
2. Atau selalu pakai `pages` untuk save (ignore globalDesigns)
3. Tambah logging untuk debug

**Next Steps:**
1. Cek apakah variant linked atau unlinked
2. Tambah logging untuk verify state
3. Apply fix yang sesuai

---

**Dibuat oleh:** Kiro AI Assistant  
**Tanggal:** 2026-02-16
