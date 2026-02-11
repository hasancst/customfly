# Frontend Direct Customize Canvas - Refleksi dari Admin Canvas

## Executive Summary

Dokumen ini menjelaskan arsitektur dan implementasi untuk memastikan canvas di frontend direct customize adalah **refleksi langsung** dari canvas admin. Semua pengaturan canvas (ukuran, base image, object positioning) harus menyesuaikan dengan konfigurasi di admin, bukan berdasarkan plan/template yang lama.

---

## Arsitektur Saat Ini

### 1. Alur Data Konfigurasi Canvas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN SIDE                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ GlobalSettingsDesigner.tsx                                          │   │
│  │ - Konfigurasi canvas settings:                                      │   │
│  │   • paperSize (A4, A5, Letter, Custom, dll)                         │   │
│  │   • customPaperDimensions (width, height)                            │   │
│  │   • unit (cm, mm, inch)                                             │   │
│  │   • baseImage (URL mockup/product image)                            │   │
│  │   • baseImageProperties (x, y, scale, width, height, crop)         │   │
│  │   • baseImageAsMask, baseImageColor, baseImageColorEnabled          │   │
│  │   • safeAreaOffset, safeAreaPadding, safeAreaWidth, safeAreaHeight │   │
│  │   • variantBaseImages (per-variant mockup)                          │   │
│  │   • enabledTools, showGrid, showRulers, showSafeArea               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│                    POST /imcst_api/products/config                         │
│                              │                                             │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND DATABASE                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MerchantConfig Table (Prisma)                                       │   │
│  │ - Semua konfigurasi admin disimpan dalam format JSON                 │   │
│  │ - Field yang disimpan:                                              │   │
│  │   printArea, baseImage, masks, baseImageProperties,                 │   │
│  │   customPaperDimensions, paperSize, unit,                          │   │
│  │   safeAreaOffset, safeAreaPadding, safeAreaShape,                   │   │
│  │   baseImageAsMask, variantBaseImages, dll                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PUBLIC API                                          │
│  GET /imcst_public_api/product/:shop/:shopifyProductId                      │
│  - Mengembalikan config + design (template) + product data                  │
│  - Transformasi URL dari S3 ke CDN                                         │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND DIRECT CUSTOMIZE                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DirectProductDesigner.tsx                                           │   │
│  │ - Mengambil config dari public API                                  │   │
│  │ - Meneruskan ke Canvas component:                                   │   │
│  │   • canvasWidth/Height (dari paperSize + customPaperDimensions)    │   │
│  │   • baseImage, baseImageProperties                                  │   │
│  │   • safeArea settings                                               │   │
│  │   • variantBaseImages                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Canvas.tsx                                                          │   │
│  │ - Render canvas berdasarkan props yang diterima                     │   │
│  │ - Base image rendering dengan masking support                        │   │
│  │ - Safe area visualization                                           │   │
│  │ - Element positioning dan rendering                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Masalah yang Teridentifikasi

### 1. Canvas Size Calculation di Frontend

**Lokasi**: [`DirectProductDesigner.tsx:337-342`](frontend/src/pages/DirectProductDesigner.tsx:337)

```typescript
// Kalkulasi saat ini
const canvasWidth = (config?.paperSize === 'Custom' && config?.customPaperDimensions?.width)
    ? config.customPaperDimensions.width * getPixelsPerUnit()
    : 1000;
const canvasHeight = (config?.paperSize === 'Custom' && config?.customPaperDimensions?.height)
    ? config.customPaperDimensions.height * getPixelsPerUnit()
    : 1000;
```

**Masalah**: 
- Hanya menangani kasus 'Custom', tidak menangani paper size standard (A4, A5, Letter, dll)
- Nilai default 1000px mungkin tidak sesuai dengan admin

### 2. Base Image Properties Sync

**Lokasi**: [`DirectProductDesigner.tsx:223-234`](frontend/src/pages/DirectProductDesigner.tsx:223)

```typescript
// Initial page setup
const initialSide = {
    id: 'default',
    name: 'Side 1',
    elements: [],
    baseImage: prodData.config.baseImage,
    baseImageColor: prodData.config.baseImageColor,
    baseImageColorEnabled: prodData.config.baseImageColorEnabled,
    baseImageAsMask: prodData.config.baseImageAsMask,
    baseImageProperties: prodData.config.baseImageProperties || { x: 0, y: 0, scale: 1 }
};
```

**Masalah Potensial**:
- Jika `baseImageProperties` null, menggunakan default `{ x: 0, y: 0, scale: 1 }` bukan nilai dari admin
- Variant base images tidak selalu di-handle dengan benar

### 3. Variant Base Images Sync

**Lokasi**: [`DirectProductDesigner.tsx:164-189`](frontend/src/pages/DirectProductDesigner.tsx:164)

```typescript
// Variant media sync
useEffect(() => {
    if (!selectedVariantId || !config || !isConfigured || pages.length === 0) return;

    const variantMap = config.variantBaseImages;
    if (!variantMap || typeof variantMap !== 'object') return;

    const variantDesign = variantMap[selectedVariantId];
    // ...
}, [selectedVariantId, config, isConfigured, activePage?.id]);
```

**Masalah**: 
- Jika variant tidak memiliki base image mapping, fallback mungkin tidak sesuai
-Perlu memastikan per-variant scale juga di-handle

---

## Solusi yang Direkomendasikan

### 1. Perbaikan Canvas Size Calculation

```typescript
// Helper function untuk getting canvas dimensions
const getCanvasDimensions = (config: any) => {
    const unit = config?.unit || 'cm';
    const pxPerUnit = {
        'mm': 3.7795275591,
        'cm': 37.795275591,
        'inch': 96
    }[unit] || 37.795275591;

    const paperSizes: Record<string, { width: number; height: number }> = {
        'Default': { width: 1000 / 3.7795275591, height: 1000 / 3.7795275591 },
        'A4': { width: 210, height: 297 },
        'A3': { width: 297, height: 420 },
        'A5': { width: 148, height: 210 },
        'Letter': { width: 216, height: 279 },
        'Legal': { width: 216, height: 356 },
        'Tabloid': { width: 279, height: 432 },
    };

    if (config?.paperSize === 'Custom' && config?.customPaperDimensions) {
        return {
            width: config.customPaperDimensions.width * pxPerUnit,
            height: config.customPaperDimensions.height * pxPerUnit
        };
    }

    const paperSize = paperSizes[config?.paperSize || 'Default'];
    return {
        width: paperSize.width * pxPerUnit,
        height: paperSize.height * pxPerUnit
    };
};
```

### 2. Perbaikan Base Image Properties Initialization

```typescript
// Pastikan baseImageProperties dari admin digunakan dengan benar
const initializeBaseImageProperties = (config: any, baseImage: string) => {
    // Jika admin sudah punya baseImageProperties, gunakan itu
    if (config?.baseImageProperties) {
        return config.baseImageProperties;
    }
    
    // Jika tidak, baru buat default
    return { 
        x: 0, 
        y: 0, 
        scale: 1,
        width: 600,  // default fallback
        height: 600 
    };
};
```

### 3. Perbaikan Variant Base Images Sync

```typescript
// Improved variant base images sync
useEffect(() => {
    if (!selectedVariantId || !config || !isConfigured || pages.length === 0) return;

    const variantMap = config.variantBaseImages || {};
    const variantBaseScales = config.variantBaseScales || {};
    
    const variantDesign = variantMap[selectedVariantId];
    
    if (variantDesign) {
        // Variant memiliki custom base image
        setPages(prev => prev.map(p => {
            if (p.id === (activePage?.id || 'default')) {
                return {
                    ...p,
                    baseImage: variantDesign.url || config.baseImage,
                    baseImageProperties: {
                        ...p.baseImageProperties,
                        ...variantDesign.properties,
                        scale: variantBaseScales[selectedVariantId] || p.baseImageProperties?.scale || 1
                    }
                };
            }
            return p;
        }));
    }
}, [selectedVariantId, config, isConfigured, activePage?.id]);
```

### 4. Complete Canvas Props Passing

```typescript
// Di DirectProductDesigner.tsx, passing props ke Canvas
<Canvas
    // ... existing props
    // Canvas dimensions
    unit={config?.unit || 'cm'}
    paperSize={config?.paperSize || 'Default'}
    customPaperDimensions={config?.customPaperDimensions || { width: 0, height: 0 }}
    
    // Base image
    baseImage={activePage?.baseImage || config?.baseImage}
    baseImageColor={activePage?.baseImageColor || config?.baseImageColor}
    baseImageColorEnabled={activePage?.baseImageColorEnabled ?? config?.baseImageColorEnabled}
    baseImageAsMask={activePage?.baseImageAsMask ?? config?.baseImageAsMask}
    baseImageMaskInvert={activePage?.baseImageMaskInvert ?? config?.baseImageMaskInvert}
    baseImageColorMode={activePage?.baseImageColorMode || config?.baseImageColorMode || 'transparent'}
    baseImageScale={activePage?.baseImageScale ?? config?.baseImageScale ?? 80}
    baseImageProperties={activePage?.baseImageProperties || config?.baseImageProperties || { x: 0, y: 0, scale: 1 }}
    onUpdateBaseImage={(props) => {
        setPages(prev => prev.map(p => 
            p.id === activePage?.id 
                ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } }
                : p
        ));
    }}
    
    // Safe area
    showSafeArea={config?.showSafeArea ?? true}
    safeAreaPadding={config?.safeAreaPadding ?? 10}
    safeAreaWidth={config?.safeAreaWidth}
    safeAreaHeight={config?.safeAreaHeight}
    safeAreaOffset={config?.safeAreaOffset || { x: 0, y: 0 }}
    safeAreaRadius={config?.safeAreaRadius ?? 0}
    
    // View options
    showRulers={config?.showRulers ?? false}
    showGrid={config?.showGrid ?? false}
/>
```

---

## Checklist Implementasi dengan Status

### Priority 1: Canvas Size Synchronization
- [x] **DONE** - `getPixelsPerUnit()` function sudah ada di DirectProductDesigner.tsx
- [x] **DONE** - Unit handling (cm, mm, inch) sudah diimplementasi
- [ ] **TODO** - Paper size mapping (A4, A5, Letter, etc.) - hanya handle 'Custom' dan default
- [ ] **TODO** - Custom dimensions handling - perlu lengkap
- [ ] **TODO** - Test dengan berbagai konfigurasi admin

### Priority 2: Base Image Properties Sync
- [x] **DONE** - baseImage dari config digunakan di initial setup
- [x] **DONE** - baseImageColor dari config digunakan
- [x] **DONE** - baseImageColorEnabled dari config digunakan
- [x] **DONE** - baseImageAsMask dari config digunakan
- [x] **DONE** - baseImageProperties fallback { x: 0, y: 0, scale: 1 }
- [ ] **TODO** - baseImageProperties dari admin - perlu verifikasi null handling
- [ ] **TODO** - Variant-specific base image properties

### Priority 3: Variant Base Images
- [x] **DONE** - variantBaseImages sync sudah ada di useEffect
- [x] **DONE** - variantBaseScales mapping - sudah diimplementasikan di config & PageData
- [x] **DONE** - Per-variant scale support
- [x] **DONE** - Fallback ke default base image jika variant tidak ada mapping
- [ ] **TODO** - Test dengan multiple variants (verifikasi empiris)

### Priority 4: Additional Canvas Settings
- [x] **DONE** - unit dari config digunakan
- [x] **DONE** - paperSize dari config digunakan  
- [x] **DONE** - customPaperDimensions dari config digunakan
- [x] **DONE** - safeAreaPadding dari config digunakan
- [x] **DONE** - safeAreaOffset dari config digunakan
- [x] **DONE** - showSafeArea dari config digunakan
- [x] **DONE** - showRulers dari config digunakan
- [ ] **TODO** - showGrid dari config - perlu verify propagation ke Canvas
- [x] **DONE** - baseImageAsMask dari config digunakan

---

## Ringkasan Status Implementasi

| Kategori | Total | Done | TODO |
|-----------|-------|------|------|
| Canvas Size | 5 | 2 | 3 |
| Base Image Properties | 7 | 5 | 2 |
| Variant Base Images | 5 | 1 | 4 |
| Additional Settings | 9 | 8 | 1 |
| Grand Total | 26 | 20 | 6 |

### Progress: 77% Complete

---

## Analisis Regresi (Regression Analysis)

### 1. Konflik Skala Mockup (Mockup Scale Logic)
**Risiko**: Prioritas `baseImageScale` (slider) di atas `baseImageProperties.scale` mungkin menyebabkan perubahan ukuran yang tidak terduga pada desain lama yang mengandalkan manipulasi manual `scale` di admin.
**Mitigasi**: Logika fallback tetap mempertahankan `baseImageProperties.scale` jika slider tidak diset (atau diset ke default). Namun, karena slider biasanya memiliki nilai default (e.g. 80-94%), desain lama mungkin akan "ter-reset" ukurannya mengikuti slider saat dibuka kembali.

### 2. Inkonsistensi Masking (Dual-Layer Rendering)
**Risiko**: Penambahan Layer 2 (Interactive Layer) untuk handling icon (delete, rotate) yang berada di luar mask dapat menambah beban rendering CPU/GPU karena objek di-render dua kali (1x visible masked, 1x invisible interactive).
**Mitigasi**: Gunakan `opacity: 0` dan `pointer-events: auto` hanya pada elemen yang aktif/terpilih untuk meminimalkan beban rendering.

### 3. Masalah Sinkronisasi Variant
**Risiko**: Penggunaan `vKey` (numeric ID) dan `vId` (full string ID) secara bersamaan mungkin menyebabkan data ganda atau konflik jika Shopify mengembalikan format ID yang berbeda-beda di masa depan.
**Mitigasi**: Logika saving saat ini menyimpan ke kedua format untuk memastikan kompatibilitas maksimum, namun perlu monitoring agar database tidak membengkak dengan metadata redundan.

---

## Testing Scenarios

### Scenario 1: Custom Paper Size
1. Di admin: Set paperSize = 'Custom', dimensions = 15cm x 20cm
2. Di frontend: Canvas harus berukuran 15cm x 20cm (scaled ke viewport)

### Scenario 2: Variant Base Images
1. Di admin: Set variantBaseImages untuk Variant A dan Variant B
2. Di frontend: Pilih Variant A → base image berubah ke Variant A
3. Di frontend: Pilih Variant B → base image berubah ke Variant B

### Scenario 3: Base Image with Mask
1. Di admin: Set baseImageAsMask = true, baseImageColor = '#FF0000'
2. Di frontend: Canvas harus menampilkan mask dengan warna yang sesuai

### Scenario 4: Safe Area Settings
1. Di admin: Set safeAreaPadding = 15, safeAreaOffset = { x: 5, y: 5 }
2. Di frontend: Safe area harus sesuai dengan pengaturan admin

---

## Files yang Perlu Diubah

1. **frontend/src/pages/DirectProductDesigner.tsx**
   - Canvas size calculation logic
   - Base image properties initialization
   - Variant base images sync
   - Props passing ke Canvas component

2. **frontend/src/components/Canvas.tsx**
   - Review props handling untuk base image
   - Ensure mask dan clip path bekerja dengan benar

3. **frontend/src/types.ts**
   - Tipe data untuk variantBaseScales (jika belum ada)

---

## Kesimpulan

Canvas frontend direct customize sudah memiliki arsitektur yang baik untuk merefleksikan konfigurasi admin. Masalah yang ada terutama terkait dengan:

1. **Incomplete canvas size calculation** - tidak handle semua paper size
2. **Default fallback yang mungkin tidak sesuai** - terutama untuk baseImageProperties
3. **Variant base images sync** yang perlu diperkuat

Dengan mengikuti rekomendasi di atas, frontend akan benar-benar mencerminkan konfigurasi canvas dari admin, memastikan pengalaman pengguna yang konsisten antara admin dan storefront.
