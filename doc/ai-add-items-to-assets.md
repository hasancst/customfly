# AI Guide: Adding Items to Existing Asset Groups

## ⚠️ CRITICAL WARNING

**BEFORE YOU START:**
- This guide is for ADDING items to EXISTING groups
- If user says "add to [group name]" → USE THIS GUIDE
- If user says "create new group" → DON'T use this guide, create new asset instead

**ALWAYS check if group exists first!**

```javascript
// Step 1: Check if group exists
const existingGroup = await prisma.asset.findFirst({
  where: { shop, type: 'shape', name: 'Group Name' }
});

if (!existingGroup) {
  console.log('❌ Group not found! Available groups:');
  const all = await prisma.asset.findMany({ where: { shop, type: 'shape' } });
  all.forEach(g => console.log(`- ${g.name}`));
  return; // STOP! Don't create new group!
}
```

## Overview

This guide explains how to add new items to existing asset groups (fonts, colors, gallery, options, shapes).

## General Process

1. Fetch the existing asset by ID or name
2. Parse the current `value` field
3. Add new items to the list
4. Update the asset with the new value
5. Update `config.shapeCount` or similar metadata

## Format Reference

### Fonts
- Format: `fontName\nfontName2\nfontName3`
- Separator: `\n` (newline)
- Example: `Arial\nHelvetica\nTimes New Roman`

### Colors
- Format: `name|#hexcode, name2|#hexcode2`
- Separator: `, ` (comma + space)
- Example: `Red|#FF0000, Blue|#0000FF, Green|#00FF00`

### Gallery
- Format: `name|imageUrl\nname2|imageUrl2`
- Separator: `\n` (newline)
- Example: `Logo 1|https://example.com/logo1.jpg\nLogo 2|https://example.com/logo2.jpg`

### Options
- Format: `name|value, name2|value2`
- Separator: `, ` (comma + space)
- Example: `Small|S, Medium|M, Large|L`

### Shapes
- Format: `name|<svg>...</svg>\nname2|<svg>...</svg>`
- Separator: `\n` (newline)
- Example: `Circle|<svg>...</svg>\nSquare|<svg>...</svg>`

## Example 1: Add Fonts to Existing Group

```javascript
// Step 1: Fetch existing asset
const existingAsset = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'font',
    name: 'My Fonts' // or use id
  }
});

if (!existingAsset) {
  throw new Error('Asset not found');
}

// Step 2: Parse current fonts
const currentFonts = existingAsset.value.split('\n').filter(Boolean);

// Step 3: Add new fonts
const newFonts = ['Roboto', 'Open Sans', 'Lato'];
const allFonts = [...currentFonts, ...newFonts];

// Step 4: Create new value
const newValue = allFonts.join('\n');

// Step 5: Update asset
await prisma.asset.update({
  where: { id: existingAsset.id },
  data: {
    value: newValue,
    config: {
      ...existingAsset.config,
      fontCount: allFonts.length,
      lastUpdated: new Date().toISOString()
    }
  }
});

console.log(`Added ${newFonts.length} fonts. Total: ${allFonts.length}`);
```

## Example 2: Add Colors to Existing Group

```javascript
// Step 1: Fetch existing asset
const existingAsset = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'color',
    name: 'Brand Colors'
  }
});

if (!existingAsset) {
  throw new Error('Asset not found');
}

// Step 2: Parse current colors
const currentColors = existingAsset.value.split(', ').filter(Boolean);

// Step 3: Add new colors
const newColors = [
  'Navy Blue|#001F3F',
  'Coral|#FF6B6B',
  'Mint|#4ECDC4'
];
const allColors = [...currentColors, ...newColors];

// Step 4: Create new value (comma + space separated)
const newValue = allColors.join(', ');

// Step 5: Update asset
await prisma.asset.update({
  where: { id: existingAsset.id },
  data: {
    value: newValue,
    config: {
      ...existingAsset.config,
      colorCount: allColors.length,
      lastUpdated: new Date().toISOString()
    }
  }
});

console.log(`Added ${newColors.length} colors. Total: ${allColors.length}`);
```

## Example 3: Add Shapes to Existing Group

```javascript
// Step 1: Fetch existing asset
const existingAsset = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'shape',
    name: 'Custom Shapes'
  }
});

if (!existingAsset) {
  throw new Error('Asset not found');
}

// Step 2: Parse current shapes
const currentShapes = existingAsset.value.split('\n').filter(Boolean);

// Step 3: Create new shapes (MUST be complete SVG!)
const newShapes = [
  "Diamond|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,50 50,90 10,50' fill='#9B59B6'/></svg>",
  "Oval|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><ellipse cx='50' cy='50' rx='40' ry='25' fill='#3498DB'/></svg>",
  "Plus|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><path d='M40,10 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z' fill='#E74C3C'/></svg>"
];

const allShapes = [...currentShapes, ...newShapes];

// Step 4: Create new value (newline separated)
const newValue = allShapes.join('\n');

// Step 5: Update asset
await prisma.asset.update({
  where: { id: existingAsset.id },
  data: {
    value: newValue,
    config: {
      ...existingAsset.config,
      shapeCount: allShapes.length,
      lastUpdated: new Date().toISOString()
    }
  }
});

console.log(`Added ${newShapes.length} shapes. Total: ${allShapes.length}`);

// CRITICAL: Always run auto-fix after creating/updating shapes
console.log('\n🔧 Running auto-fix to ensure correct format...');
const { execSync } = require('child_process');
try {
  execSync('node backend/auto_fix_shapes.cjs', { stdio: 'inherit' });
  console.log('✅ Auto-fix completed successfully!');
} catch (error) {
  console.error('⚠️  Auto-fix failed:', error.message);
}
```

## Example 4: Add Gallery Images

```javascript
// Step 1: Fetch existing asset
const existingAsset = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'gallery',
    name: 'Product Gallery'
  }
});

if (!existingAsset) {
  throw new Error('Asset not found');
}

// Step 2: Parse current images
const currentImages = existingAsset.value.split('\n').filter(Boolean);

// Step 3: Add new images
const newImages = [
  'Product Photo 1|https://example.com/product1.jpg',
  'Product Photo 2|https://example.com/product2.jpg',
  'Product Photo 3|https://example.com/product3.jpg'
];

const allImages = [...currentImages, ...newImages];

// Step 4: Create new value (newline separated)
const newValue = allImages.join('\n');

// Step 5: Update asset
await prisma.asset.update({
  where: { id: existingAsset.id },
  data: {
    value: newValue,
    config: {
      ...existingAsset.config,
      imageCount: allImages.length,
      lastUpdated: new Date().toISOString()
    }
  }
});

console.log(`Added ${newImages.length} images. Total: ${allImages.length}`);
```

## Example 5: Add Options

```javascript
// Step 1: Fetch existing asset
const existingAsset = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'option',
    name: 'Size Options'
  }
});

if (!existingAsset) {
  throw new Error('Asset not found');
}

// Step 2: Parse current options
const currentOptions = existingAsset.value.split(', ').filter(Boolean);

// Step 3: Add new options
const newOptions = [
  'Extra Small|XS',
  'Extra Large|XL',
  'XXL|XXL'
];

const allOptions = [...currentOptions, ...newOptions];

// Step 4: Create new value (comma + space separated)
const newValue = allOptions.join(', ');

// Step 5: Update asset
await prisma.asset.update({
  where: { id: existingAsset.id },
  data: {
    value: newValue,
    config: {
      ...existingAsset.config,
      optionCount: allOptions.length,
      lastUpdated: new Date().toISOString()
    }
  }
});

console.log(`Added ${newOptions.length} options. Total: ${allOptions.length}`);
```

## Finding Assets

### By Name
```javascript
const asset = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'shape', // or 'font', 'color', 'gallery', 'option'
    name: 'Asset Name'
  }
});
```

### By ID
```javascript
const asset = await prisma.asset.findUnique({
  where: { id: assetId }
});
```

### List All Assets of Type
```javascript
const assets = await prisma.asset.findMany({
  where: {
    shop: shop,
    type: 'shape'
  }
});

console.log('Available shape groups:');
assets.forEach(a => console.log(`- ${a.name} (${a.id})`));
```

## Important Notes

### For Shapes
- **MUST use complete SVG code**, not just path data
- Include `xmlns`, `viewBox`, `width`, `height` attributes
- See `ai-shape-asset-strict-rules.md` for details

### For Colors
- Use format `name|#hexcode`
- Hex code must include `#`
- Separator is `, ` (comma + space)

### For Fonts
- Just font names, one per line
- No special format needed
- Separator is `\n` (newline)

### For Gallery
- Format: `name|imageUrl`
- URLs must be valid and accessible
- Separator is `\n` (newline)

### For Options
- Format: `name|value`
- Can be text or hex colors
- Separator is `, ` (comma + space)

## Error Handling

```javascript
try {
  const existingAsset = await prisma.asset.findFirst({
    where: { shop: shop, type: 'shape', name: 'My Shapes' }
  });

  if (!existingAsset) {
    console.log('Asset not found. Available assets:');
    const allAssets = await prisma.asset.findMany({
      where: { shop: shop, type: 'shape' }
    });
    allAssets.forEach(a => console.log(`- ${a.name}`));
    return;
  }

  // Add items...
  
} catch (error) {
  console.error('Error adding items:', error);
}
```

## Validation

Before updating, validate:

```javascript
// For shapes - ensure SVG is valid
const isValidSVG = (svg) => {
  return svg.includes('<svg') && svg.includes('</svg>');
};

// For colors - ensure hex is valid
const isValidHex = (hex) => {
  return /^#[0-9A-F]{6}$/i.test(hex);
};

// Validate before adding
const newShapes = [
  "Circle|<svg>...</svg>"
];

const validShapes = newShapes.filter(shape => {
  const svg = shape.split('|')[1];
  return isValidSVG(svg);
});

if (validShapes.length !== newShapes.length) {
  console.warn(`${newShapes.length - validShapes.length} invalid shapes skipped`);
}
```

## Complete Workflow Example

```javascript
async function addItemsToAsset(shop, assetType, assetName, newItems) {
  // 1. Fetch asset
  const asset = await prisma.asset.findFirst({
    where: { shop, type: assetType, name: assetName }
  });

  if (!asset) {
    throw new Error(`Asset "${assetName}" not found`);
  }

  // 2. Parse current items
  const separator = (assetType === 'color' || assetType === 'option') ? ', ' : '\n';
  const currentItems = asset.value.split(separator).filter(Boolean);

  // 3. Combine items
  const allItems = [...currentItems, ...newItems];

  // 4. Create new value
  const newValue = allItems.join(separator);

  // 5. Update asset
  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      value: newValue,
      config: {
        ...asset.config,
        [`${assetType}Count`]: allItems.length,
        lastUpdated: new Date().toISOString()
      }
    }
  });

  return {
    added: newItems.length,
    total: allItems.length,
    assetId: asset.id
  };
}

// Usage
const result = await addItemsToAsset(
  'myshop.myshopify.com',
  'shape',
  'Custom Shapes',
  [
    "Star|<svg>...</svg>",
    "Heart|<svg>...</svg>"
  ]
);

console.log(`Added ${result.added} items. Total: ${result.total}`);
```

## Summary

✅ **Always fetch existing asset first**
✅ **Parse current value with correct separator**
✅ **Add new items to existing list**
✅ **Join with correct separator**
✅ **Update config metadata**
✅ **For shapes: use complete SVG code**
✅ **Validate items before adding**
