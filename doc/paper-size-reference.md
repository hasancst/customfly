# Paper Size Reference Guide

**Last Updated**: 2026-02-15  
**Purpose**: Complete reference for all supported paper sizes with exact dimensions

## Quick Reference Table

### All Supported Paper Sizes

| Size | Category | Width | Height | Pixels @ 96 DPI | Real-World Use |
|------|----------|-------|--------|-----------------|----------------|
| **Default** | Digital | 1000 px | 1000 px | 1000 × 1000 | Digital designs, square canvas |
| **A3** | ISO 216 | 297 mm | 420 mm | 1122.5 × 1587.4 | Large posters, presentations |
| **A4** | ISO 216 | 210 mm | 297 mm | 793.7 × 1122.5 | Standard documents, letters |
| **A5** | ISO 216 | 148 mm | 210 mm | 559.4 × 793.7 | Notebooks, flyers |
| **A6** | ISO 216 | 105 mm | 148 mm | 396.9 × 559.4 | Postcards, small flyers |
| **Letter** | ANSI | 215.9 mm | 279.4 mm | 816 × 1056 | US standard documents |
| **Legal** | ANSI | 215.9 mm | 355.6 mm | 816 × 1344 | US legal documents |
| **Tabloid** | ANSI | 279.4 mm | 431.8 mm | 1056 × 1632 | Large format, newspapers |
| **4×6** | Photo | 101.6 mm | 152.4 mm | 384 × 576 | Standard photo prints |
| **5×7** | Photo | 127 mm | 177.8 mm | 480 × 672 | Photo prints, cards |
| **8×10** | Photo | 203.2 mm | 254 mm | 768 × 960 | Large photo prints |
| **Business Card** | Business | 85.6 mm | 53.98 mm | 323.5 × 204 | US business cards |
| **Postcard** | Marketing | 101.6 mm | 152.4 mm | 384 × 576 | Standard postcards |
| **Custom** | User-defined | Variable | Variable | Variable | Any custom dimensions |

## Detailed Specifications

### ISO 216 Standard (International)

Used worldwide except North America. Based on √2 aspect ratio.

#### A3 (297 × 420 mm)
- **Inches**: 11.69 × 16.54"
- **Pixels**: 1122.5 × 1587.4 px
- **Use Cases**: Posters, large presentations, architectural drawings
- **Common In**: Europe, Asia, Australia

#### A4 (210 × 297 mm)
- **Inches**: 8.27 × 11.69"
- **Pixels**: 793.7 × 1122.5 px
- **Use Cases**: Standard documents, letters, reports
- **Common In**: Worldwide (except US)
- **Note**: Most common paper size globally

#### A5 (148 × 210 mm)
- **Inches**: 5.83 × 8.27"
- **Pixels**: 559.4 × 793.7 px
- **Use Cases**: Notebooks, small flyers, booklets
- **Common In**: Europe, Asia
- **Note**: Half of A4

#### A6 (105 × 148 mm)
- **Inches**: 4.13 × 5.83"
- **Pixels**: 396.9 × 559.4 px
- **Use Cases**: Postcards, small flyers, pocket notebooks
- **Common In**: Europe, Asia
- **Note**: Quarter of A4

### ANSI Standard (North America)

Used primarily in United States and Canada.

#### Letter (8.5 × 11")
- **Millimeters**: 215.9 × 279.4 mm
- **Pixels**: 816 × 1056 px
- **Use Cases**: Standard documents, letters, forms
- **Common In**: USA, Canada, Mexico
- **Note**: US equivalent of A4

#### Legal (8.5 × 14")
- **Millimeters**: 215.9 × 355.6 mm
- **Pixels**: 816 × 1344 px
- **Use Cases**: Legal documents, contracts
- **Common In**: USA, Canada
- **Note**: 3 inches taller than Letter

#### Tabloid (11 × 17")
- **Millimeters**: 279.4 × 431.8 mm
- **Pixels**: 1056 × 1632 px
- **Use Cases**: Newspapers, large format prints, posters
- **Common In**: USA, Canada
- **Note**: Also called Ledger or ANSI B

### Photo Sizes

Standard photographic print sizes.

#### 4×6 Photo (4 × 6")
- **Millimeters**: 101.6 × 152.4 mm
- **Pixels**: 384 × 576 px
- **Use Cases**: Standard photo prints, snapshots
- **Aspect Ratio**: 2:3 (same as 35mm film)
- **Note**: Most common photo print size

#### 5×7 Photo (5 × 7")
- **Millimeters**: 127 × 177.8 mm
- **Pixels**: 480 × 672 px
- **Use Cases**: Photo prints, greeting cards
- **Aspect Ratio**: 5:7
- **Note**: Popular for framing

#### 8×10 Photo (8 × 10")
- **Millimeters**: 203.2 × 254 mm
- **Pixels**: 768 × 960 px
- **Use Cases**: Large photo prints, portraits
- **Aspect Ratio**: 4:5
- **Note**: Standard frame size

### Business & Marketing

#### Business Card (3.37 × 2.125")
- **Millimeters**: 85.6 × 53.98 mm
- **Pixels**: 323.5 × 204 px
- **Use Cases**: Business cards, loyalty cards
- **Standard**: US business card size
- **Note**: ISO 7810 ID-1 is 85.6 × 53.98 mm

#### Postcard (4 × 6")
- **Millimeters**: 101.6 × 152.4 mm
- **Pixels**: 384 × 576 px
- **Use Cases**: Postcards, direct mail, invitations
- **Standard**: USPS standard postcard
- **Note**: Same as 4×6 photo size

### Digital

#### Default (1000 × 1000 px)
- **Millimeters**: N/A (direct pixels)
- **Pixels**: 1000 × 1000 px
- **Use Cases**: Digital designs, social media, web graphics
- **Note**: NOT a real paper size, digital canvas only
- **Special**: No conversion applied, always 1000px

#### Custom (User-defined)
- **Dimensions**: Set by user
- **Units**: px, mm, cm, or inch
- **Use Cases**: Non-standard sizes, special projects
- **Note**: Converted based on selected unit

## Conversion Reference

### Standard Conversions (96 DPI)

```
1 inch = 25.4 mm
1 inch = 96 pixels
1 mm = 3.7795275591 pixels
1 cm = 37.795275591 pixels
```

### Conversion Formulas

```typescript
// Millimeters to Pixels
pixels = millimeters × 3.7795275591

// Centimeters to Pixels
pixels = centimeters × 37.795275591

// Inches to Pixels
pixels = inches × 96

// Inches to Millimeters
millimeters = inches × 25.4

// Pixels to Millimeters
millimeters = pixels / 3.7795275591
```

### Example Conversions

```
A4 width: 210 mm × 3.7795275591 = 793.7 px
Letter width: 8.5 inch × 96 = 816 px
Letter width: 8.5 inch × 25.4 = 215.9 mm
```

## WYSIWYG Principle

**What You See Is What You Get**

### How It Works

1. **Design Phase**: Customer designs on canvas sized to real paper dimensions
2. **Display**: Canvas shows at 96 DPI (screen standard)
3. **Preview**: At 100% zoom, matches real paper size on screen
4. **Export**: Rendered at print DPI (300+ DPI)
5. **Print**: Output matches exact paper dimensions

### Example: A4 Design

```
Real Paper: 210 × 297 mm
Canvas Display: 793.7 × 1122.5 px (at 96 DPI)
At 100% Zoom: Matches real A4 paper on screen
Print Output: 210 × 297 mm (at 300 DPI)
Result: Customer sees exactly what they'll get
```

## Implementation Details

### File Locations

- **Constants**: `frontend/src/constants/paperSizes.ts`
- **Canvas**: `frontend/src/components/Canvas.tsx`
- **Designer**: `frontend/src/pages/DirectProductDesigner.tsx`
- **Open Designer**: `frontend/src/components/DesignerOpenCore.tsx`
- **Dropdown**: `frontend/src/components/Summary.tsx`

### Usage in Code

```typescript
import { getPaperSizeMM, getPaperSizePX, mmToPx } from '../constants/paperSizes';

// Get dimensions in millimeters
const sizeMM = getPaperSizeMM('A4');
// { width: 210, height: 297 }

// Get dimensions in pixels
const sizePX = getPaperSizePX('A4');
// { width: 793.7, height: 1122.5 }

// Convert custom value
const pixels = mmToPx(210);
// 793.7
```

### Special Case: Default

```typescript
// Default is special - already in pixels
if (paperSize === 'Default') {
    return { width: 1000, height: 1000 };
}

// Other sizes: convert from mm to px
const sizeMM = getPaperSizeMM(paperSize);
const sizePX = {
    width: sizeMM.width * 3.7795275591,
    height: sizeMM.height * 3.7795275591
};
```

## Regional Preferences

### Worldwide (Except North America)
- **Primary**: ISO 216 (A-series)
- **Most Common**: A4 (210 × 297 mm)
- **Large Format**: A3 (297 × 420 mm)
- **Small Format**: A5, A6

### North America (USA, Canada, Mexico)
- **Primary**: ANSI standard
- **Most Common**: Letter (8.5 × 11")
- **Legal Documents**: Legal (8.5 × 14")
- **Large Format**: Tabloid (11 × 17")

### Photography (Worldwide)
- **Standard**: 4×6" (most common)
- **Medium**: 5×7"
- **Large**: 8×10"

### Business (Worldwide)
- **Business Cards**: 85.6 × 53.98 mm (ISO 7810 ID-1)
- **Postcards**: 101.6 × 152.4 mm (4×6")

## Testing Checklist

### Visual Verification

- [ ] Select each paper size from dropdown
- [ ] Verify canvas dimensions match expected pixels
- [ ] Check at 100% zoom matches real paper on screen
- [ ] Test with physical ruler if possible

### Conversion Accuracy

- [ ] A4: 210mm → 793.7px ✓
- [ ] Letter: 8.5" → 816px ✓
- [ ] Default: 1000px (no conversion) ✓
- [ ] Custom 100mm → 377.95px ✓

### Cross-Component Consistency

- [ ] DirectProductDesigner.tsx uses correct values
- [ ] Canvas.tsx uses correct values
- [ ] DesignerOpenCore.tsx uses correct values
- [ ] Summary.tsx shows correct labels

## Common Issues & Solutions

### Issue: Paper size appears wrong
**Solution**: Check if Default is being converted (it shouldn't be)

### Issue: US sizes slightly off
**Solution**: Use exact values (215.9 not 216, 279.4 not 279)

### Issue: Custom size too large/small
**Solution**: Check unit selector (px vs mm vs cm vs inch)

### Issue: Inconsistent across components
**Solution**: All components must use `paperSizes.ts` constants

## Future Enhancements

### Potential Additions

- [ ] A0, A1, A2 (large ISO sizes)
- [ ] A7, A8 (small ISO sizes)
- [ ] B-series (B4, B5, B6)
- [ ] C-series envelopes (C4, C5, C6, DL)
- [ ] Poster sizes (18×24", 24×36")
- [ ] Social media sizes (Instagram, Facebook, Twitter)
- [ ] Screen sizes (1920×1080, 1280×720)

### Migration Path

To add new paper size:

1. Add to `paperSizes.ts`:
```typescript
'NewSize': {
  width: 100,  // in mm
  height: 150, // in mm
  label: 'New Size (100 × 150 mm)',
  description: 'Description here'
}
```

2. Add to `Summary.tsx` dropdown:
```typescript
<SelectItem value="NewSize">New Size (100 × 150 mm)</SelectItem>
```

3. Add to `DesignerOpenCore.tsx` if needed
4. Test WYSIWYG accuracy
5. Update this documentation

## Related Documentation

- `doc/fix-paper-size-wysiwyg-2026-02-15.md` - Initial WYSIWYG implementation
- `doc/fix-default-paper-size-2026-02-15.md` - Default size special case
- `doc/fix-paper-size-wysiwyg-complete-2026-02-15.md` - Complete implementation
- `frontend/src/constants/paperSizes.ts` - Source code

## Notes

- All paper sizes stored in millimeters (except Default)
- Conversion to pixels happens at render time using 96 DPI
- Print export uses higher DPI (300+) for quality
- Backend doesn't need paper size definitions
- Paper sizes are frontend-only concern
- WYSIWYG accuracy is critical for customer satisfaction

