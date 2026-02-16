# Feature: Custom Size Unit Selector

**Date**: 2026-02-15  
**Status**: ✅ Complete  
**Request**: Add unit selector (cm, mm, px, inch) below custom size input for each product and global settings

## Changes Made

### 1. Added Unit Selector to Custom Size Form

**Location**: `frontend/src/components/Summary.tsx`

**Before**:
```tsx
{paperSize === 'Custom' && (
  <div className="grid grid-cols-2 gap-2 pt-1">
    <Input placeholder="W (mm)" />
    <Input placeholder="H (mm)" />
  </div>
)}
```

**After**:
```tsx
{paperSize === 'Custom' && (
  <div className="space-y-2 pt-1">
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder={`Width (${unit})`} />
      <Input placeholder={`Height (${unit})`} />
    </div>
    <div className="space-y-1">
      <Label>Unit</Label>
      <Select value={unit} onValueChange={onUnitChange}>
        <SelectItem value="px">Pixels (px)</SelectItem>
        <SelectItem value="cm">Centimeters (cm)</SelectItem>
        <SelectItem value="mm">Millimeters (mm)</SelectItem>
        <SelectItem value="inch">Inches (inch)</SelectItem>
      </Select>
    </div>
  </div>
)}
```

### 2. Added 'px' Unit Support

**Updated Type Definitions**:
- `frontend/src/components/Summary.tsx`
- `frontend/src/components/Canvas.tsx`
- `frontend/src/components/DesignerCore.tsx`
- `frontend/src/components/DesignerOpenCore.tsx`
- `frontend/src/pages/GlobalSettingsDesigner.tsx`

**Before**:
```typescript
unit: 'cm' | 'mm' | 'inch'
```

**After**:
```typescript
unit: 'cm' | 'mm' | 'inch' | 'px'
```

### 3. Updated Unit Conversion Functions

**Canvas.tsx**:
```typescript
const getPixelsPerUnit = () => {
  switch (unit) {
    case 'px': return 1;           // NEW
    case 'mm': return 3.7795275591;
    case 'cm': return 37.795275591;
    case 'inch': return 96;
    default: return 37.795275591;
  }
};
```

**DirectProductDesigner.tsx**:
```typescript
const pxPerUnit: Record<string, number> = {
  'px': 1,                    // NEW
  'mm': 3.7795275591,
  'cm': 37.795275591,
  'inch': 96
};
```

### 4. Updated Rulers Unit Selector

**Location**: `frontend/src/components/Summary.tsx` (Rulers section)

Added 'px' option to the unit dropdown that appears when rulers are enabled:
```tsx
<SelectContent>
  <SelectItem value="px">Pixels (px)</SelectItem>
  <SelectItem value="cm">Centimeters (cm)</SelectItem>
  <SelectItem value="mm">Millimeters (mm)</SelectItem>
  <SelectItem value="inch">Inches (inch)</SelectItem>
</SelectContent>
```

## User Experience

### Custom Size Configuration

1. User selects "Custom Size" from Canvas Size dropdown
2. Two input fields appear for Width and Height
3. Below inputs, a new "Unit" dropdown appears with options:
   - Pixels (px)
   - Centimeters (cm)
   - Millimeters (mm)
   - Inches (inch)
4. Placeholder text in inputs updates dynamically: `Width (cm)`, `Width (px)`, etc.
5. Unit selection applies to both width and height inputs

### Unit Conversion

**Conversion Rates** (to pixels):
- `px`: 1:1 (no conversion)
- `mm`: 1mm = 3.7795275591px (96 DPI)
- `cm`: 1cm = 37.795275591px (96 DPI)
- `inch`: 1in = 96px (96 DPI)

**Example**:
- Custom Size: 10cm × 10cm
- Unit: cm
- Canvas: 377.95px × 377.95px

- Custom Size: 1000 × 1000
- Unit: px
- Canvas: 1000px × 1000px

## Where This Applies

### 1. Product-Specific Settings
- Designer page for each product
- Path: `/designer/:productId`
- Saves to `MerchantConfig` table per product

### 2. Global Settings
- Global settings designer
- Path: `/global-settings`
- Saves to `MerchantConfig` with `shopifyProductId = 'GLOBAL'`

### 3. Storefront Designer
- Customer-facing designer
- Uses product-specific or global config
- Unit selector visible in admin preview mode

## Database Schema

No database changes required. The `unit` field already exists in `MerchantConfig`:

```prisma
model MerchantConfig {
  unit                     String?
  paperSize                String?
  customPaperDimensions    Json?
  // ... other fields
}
```

**Stored Values**:
- `unit`: `"px"` | `"cm"` | `"mm"` | `"inch"`
- `customPaperDimensions`: `{ width: number, height: number }`

## Testing Checklist

- [x] Build frontend successfully
- [ ] Test custom size with px unit
- [ ] Test custom size with cm unit
- [ ] Test custom size with mm unit
- [ ] Test custom size with inch unit
- [ ] Verify unit changes update placeholder text
- [ ] Verify canvas dimensions calculate correctly
- [ ] Test in product designer
- [ ] Test in global settings
- [ ] Test save and reload config
- [ ] Verify rulers display correct unit

## Files Changed

1. ✅ `frontend/src/components/Summary.tsx` - Added unit selector UI
2. ✅ `frontend/src/components/Canvas.tsx` - Added px conversion
3. ✅ `frontend/src/components/DesignerCore.tsx` - Updated type
4. ✅ `frontend/src/components/DesignerOpenCore.tsx` - Updated type
5. ✅ `frontend/src/pages/GlobalSettingsDesigner.tsx` - Updated type
6. ✅ `frontend/src/pages/DirectProductDesigner.tsx` - Added px conversion
7. ✅ Frontend rebuilt

## Notes

- Unit selector only appears when "Custom Size" is selected
- Default unit is 'cm' if not specified
- Unit applies to both width and height (cannot set different units per dimension)
- Conversion happens at render time, stored values are in the selected unit
- Rulers unit selector also updated to include 'px' option
