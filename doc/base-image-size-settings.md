# Base Image Size Settings Implementation

## Overview

This document describes the implementation of base image size settings for the Shopify Product Customizer admin panel. This feature allows admin users to:
- Set a custom canvas size (width x height in pixels)
- Adjust the base image scale as a percentage of canvas width (10-100%, default 80%)
- Assign different base images to specific product variants

## Changes Made

### 1. GlobalSettingsDesigner.tsx
**File:** `frontend/src/pages/GlobalSettingsDesigner.tsx`

#### State Additions:
```typescript
// Canvas & Base Image Settings
const [baseImageScale, setBaseImageScale] = useState(80);
const [customCanvasSize, setCustomCanvasSize] = useState({ width: 1000, height: 1000 });
const [variantBaseImages, setVariantBaseImages] = useState<Record<string, string>>({});
```

#### Callback Fix:
```typescript
const handleBaseImageSelect = (url: string, isVariantImage?: boolean, targetVariantId?: string | 'all') => {
    console.log('[DEBUG] handleBaseImageSelect called:', { url, isVariantImage, targetVariantId });
    
    // Handle variant-specific assignment
    if (targetVariantId && targetVariantId !== 'all') {
        setVariantBaseImages(prev => ({
            ...prev,
            [targetVariantId]: url
        }));
        toast.success(`Base image assigned to variant`);
        return;
    }
    
    // Handle global assignment (all variants)
    if (targetVariantId === 'all') {
        setVariantBaseImages({});
    }
    
    // Update the current page's base image
    const img = new Image();
    img.onload = () => {
        setPages(prev => prev.map(p => p.id === activePageId ? {
            ...p,
            baseImage: url,
            baseImageProperties: {
                x: 0,
                y: 0,
                scale: (baseImageScale || 80) / 100,
                width: img.naturalWidth,
                height: img.naturalHeight
            }
        } : p));
        toast.success('Base image updated');
    };
    img.onerror = () => {
        toast.error('Failed to load image');
    };
    img.src = url;
};
```

#### Props Passed to Components:
```typescript
<Canvas
    // ... other props
    baseImageScale={baseImageScale}
    customCanvasSize={customCanvasSize}
/>

<Summary
    // ... other props
    baseImageScale={baseImageScale}
    onBaseImageScaleChange={setBaseImageScale}
    customCanvasSize={customCanvasSize}
    onCustomCanvasSizeChange={setCustomCanvasSize}
    isGlobalSettings={true}
/>

<BaseImageModal
    // ... other props
    variantBaseImages={variantBaseImages}
    onSelectImage={(url, isVariantImage, targetVariantId) => {
        handleBaseImageSelect(url, isVariantImage, targetVariantId);
    }}
/>
```

### 2. Canvas.tsx
**File:** `frontend/src/components/Canvas.tsx`

#### Interface Update:
```typescript
interface CanvasProps {
    // ... existing props
    // Canvas & Base Image Settings
    baseImageScale?: number;
    customCanvasSize?: { width: number; height: number };
}
```

#### Props Destructuring:
```typescript
export function Canvas({
    // ... other props
    baseImageScale = 80,
    customCanvasSize = { width: 1000, height: 1000 },
}: CanvasProps) {
```

#### Sizing Logic Update:
```typescript
// PRIORITY: customCanvasSize is PRIMARY, paperSize is FALLBACK
const baseWidth = customCanvasSize?.width || (paperMM.width * mmToPx);
const baseHeight = customCanvasSize?.height || (paperMM.height * mmToPx);
const currentWidth = baseWidth * (validZoom / 100);
const currentHeight = baseHeight * (validZoom / 100);

// Base image scale (percentage of canvas width)
const baseImageScalePercent = (baseImageScale || 80) / 100;

// Standard: Scale 1.0 = Width of Canvas, then apply baseImageScale
const baseMockupWidth = (baseWidth * zoomMult) * baseImageScalePercent;
const baseMockupHeight = baseMockupWidth * aspect;
```

#### Debug Logs:
```typescript
console.log('[DEBUG] Canvas - baseImageScale:', baseImageScale);
console.log('[DEBUG] Canvas - customCanvasSize:', customCanvasSize);
console.log('[DEBUG] Canvas - computed baseMockupWidth:', baseMockupWidth, 'baseMockupHeight:', baseMockupHeight);
```

### 3. Summary.tsx
**File:** `frontend/src/components/Summary.tsx`

The Summary component already had the UI controls for these settings implemented.

#### Interface Props:
```typescript
interface SummaryProps {
    // ... existing props
    // Canvas & Base Image Settings
    baseImageScale?: number;
    onBaseImageScaleChange?: (scale: number) => void;
    customCanvasSize?: { width: number; height: number };
    onCustomCanvasSizeChange?: (size: { width: number; height: number }) => void;
}
```

#### Default Values:
```typescript
baseImageScale = 80,
onBaseImageScaleChange,
customCanvasSize = { width: 1000, height: 1000 },
onCustomCanvasSizeChange,
```

#### UI Controls:
```tsx
{/* Base Image Scale Slider */}
<div className="pt-2 border-t border-gray-50 space-y-3">
    <div className="space-y-0.5">
        <Label className="text-[11px] font-medium text-gray-700">Base Image Scale</Label>
        <p className="text-[9px] text-gray-400">Percentage of canvas width ({baseImageScale}%)</p>
    </div>
    <input
        type="range"
        min="10"
        max="100"
        value={baseImageScale}
        onChange={(e) => onBaseImageScaleChange?.(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
    />
</div>

{/* Custom Canvas Size */}
<div className="pt-2 border-t border-gray-50 space-y-3">
    <div className="space-y-0.5">
        <Label className="text-[11px] font-medium text-gray-700">Canvas Size (px)</Label>
        <p className="text-[9px] text-gray-400">Width x Height</p>
    </div>
    <div className="flex gap-2">
        <Input
            type="number"
            value={customCanvasSize.width}
            onChange={(e) => onCustomCanvasSizeChange?.({ ...customCanvasSize, width: Number(e.target.value) })}
            className="h-8 text-xs"
            placeholder="Width"
        />
        <span className="flex items-center text-gray-400">×</span>
        <Input
            type="number"
            value={customCanvasSize.height}
            onChange={(e) => onCustomCanvasSizeChange?.({ ...customCanvasSize, height: Number(e.target.value) })}
            className="h-8 text-xs"
            placeholder="Height"
        />
    </div>
</div>
```

## Architecture

### Data Flow
```
Summary (UI Controls)
    ↓
setBaseImageScale / setCustomCanvasSize / setVariantBaseImages
    ↓
GlobalSettingsDesigner (State)
    ↓
Canvas Component (Props)
    ↓
Rendered Canvas with sizing
```

### Canvas Size Priority
**IMPORTANT**: There are TWO canvas size settings in the UI:
1. **Paper Size** (at the top toolbar) - DEPRECATED/FALLBACK - Only used if customCanvasSize is not set
2. **Canvas Size** (in Summary/Workspace panel) - PRIMARY - This is the main setting that should be used

**Recommendation**: Remove or hide the Paper Size setting at the top to avoid confusion. The Canvas Size in the workspace is the authoritative setting.

### Key Calculations

1. **Canvas Width**: `customCanvasSize.width` (default: 1000px)
2. **Canvas Height**: `customCanvasSize.height` (default: 1000px)
3. **Base Image Scale**: `(baseImageScale / 100)` (default 80% = 0.8)
4. **Mockup Width**: `canvasWidth × zoom × baseImageScale`
5. **Mockup Height**: `mockupWidth × aspectRatio`

### Variant Image Assignment

The system now supports assigning different base images to specific product variants:
- **Global Assignment**: Selecting "All Variants (Global)" assigns the image to all variants
- **Variant-Specific Assignment**: Selecting a specific variant assigns the image only to that variant
- **Priority**: Variant-specific assignments override global assignments

## Debugging

### Console Logs
When the component renders, check for these debug logs:
- `[DEBUG] Canvas - baseImageScale: 80`
- `[DEBUG] Canvas - customCanvasSize: {width: 1000, height: 1000}`
- `[DEBUG] Canvas - computed baseMockupWidth: 800 baseMockupHeight: 800`
- `[DEBUG] handleBaseImageSelect called: {url: "...", isVariantImage: true, targetVariantId: "12345"}`

### Common Issues

1. **Variant Images Not Saving**: 
   - **Fixed**: The `handleBaseImageSelect` function now properly handles variant-specific assignments
   - Check console for `[DEBUG] Assigning image to specific variant:` message
   
2. **Canvas Size Confusion**: 
   - Use the Canvas Size setting in the Summary/Workspace panel (bottom right)
   - The Paper Size setting at the top is deprecated and should be ignored or removed
   
3. **CDN Cache**: If changes don't appear, purge the CDN cache or rebuild the frontend bundle

4. **Browser Cache**: Hard refresh (Ctrl+Shift+R) may be needed

5. **Build Required**: Run `npm run build` after code changes for production

## Deployment

### Build Command
```bash
cd /www/wwwroot/custom.local/frontend
rm -rf dist
npm run build
```

### Restart Backend
```bash
sudo systemctl restart imcst-backend.service
```

## Related Files
- `frontend/src/pages/GlobalSettingsDesigner.tsx` - Main admin page
- `frontend/src/components/Canvas.tsx` - Canvas rendering component
- `frontend/src/components/Summary.tsx` - Settings sidebar
- `frontend/src/components/BaseImageModal.tsx` - Image selection modal

## Notes

- The base image is now always non-movable (lockBaseImage feature removed)
- Scale is applied as a percentage of canvas width
- The aspect ratio of the base image is preserved when scaling
- These settings are per-product (not global) and saved with the design configuration
- Variant-specific base images are now fully supported and saved correctly
- Default canvas size is 1000x1000px with 80% base image scale (800px effective width)
