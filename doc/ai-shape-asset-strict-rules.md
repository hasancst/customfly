# ⚠️ CRITICAL: AI Shape Asset Creation Rules

## MANDATORY REQUIREMENTS

### Rule #1: COMPLETE SVG TAGS ONLY
**SHAPES MUST BE COMPLETE SVG CODE, NOT JUST PATH DATA!**

❌ **NEVER DO THIS:**
```javascript
{
  name: "Star",
  path: "M12 2l2.5 7.5H22...",  // ❌ WRONG! This is just a path, not SVG!
  viewBox: "0 0 24 24"
}
```

✅ **ALWAYS DO THIS:**
```javascript
{
  name: "Star",
  svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='100' height='100'><path d='M12 2l2.5 7.5H22...' fill='currentColor'/></svg>"
}
```

### Rule #2: EXACT NUMBER OF SHAPES
If user asks for 5 shapes, create EXACTLY 5 shapes. Not 3, not 4, but 5!

### Rule #3: CORRECT FORMAT
```javascript
const shapes = [
  { name: 'Shape1', svg: '<svg>...</svg>' },
  { name: 'Shape2', svg: '<svg>...</svg>' },
  // ... all shapes
];

const value = shapes.map(s => `${s.name}|${s.svg}`).join('\n');

await prisma.asset.create({
  data: {
    shop: shop,
    type: 'shape',
    name: 'Group Name',
    label: 'Group Name',
    value: value,  // ← ALL shapes here as "name|svg\nname|svg\n..."
    config: {
      source: 'ai-generated',
      imported: new Date().toISOString(),
      shapeCount: shapes.length,
      format: 'name|svg (newline separated)'
    }
  }
});
```

## COMPLETE EXAMPLE: Creating 5 Shapes

```javascript
// Step 1: Create shapes array with COMPLETE SVG
const shapes = [
  {
    name: 'Circle',
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>"
  },
  {
    name: 'Square',
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect x='10' y='10' width='80' height='80' fill='#4ECDC4'/></svg>"
  },
  {
    name: 'Triangle',
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,90 10,90' fill='#FFE66D'/></svg>"
  },
  {
    name: 'Star',
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35' fill='#A8E6CF'/></svg>"
  },
  {
    name: 'Heart',
    svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><path d='M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z' fill='#FF6B9D'/></svg>"
  }
];

// Step 2: Convert to correct format
const value = shapes.map(s => `${s.name}|${s.svg}`).join('\n');

// Step 3: Create asset
await prisma.asset.create({
  data: {
    shop: shop,
    type: 'shape',
    name: 'My 5 Shapes',
    label: 'My 5 Shapes',
    value: value,
    isDefault: false,
    config: {
      source: 'ai-generated',
      imported: new Date().toISOString(),
      shapeCount: 5,
      format: 'name|svg (newline separated)'
    }
  }
});
```

## SVG Template

Use this template for creating SVG shapes:

```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'>
  <!-- Your shape here: circle, rect, polygon, path, etc. -->
  <circle cx='50' cy='50' r='40' fill='#color'/>
</svg>
```

## Common Shapes SVG Examples

### Circle
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>
```

### Square
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect x='10' y='10' width='80' height='80' fill='#4ECDC4'/></svg>
```

### Triangle
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,90 10,90' fill='#FFE66D'/></svg>
```

### Star (5-pointed)
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35' fill='#A8E6CF'/></svg>
```

### Heart
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><path d='M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z' fill='#FF6B9D'/></svg>
```

### Pentagon
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,40 75,85 25,85 10,40' fill='#95E1D3'/></svg>
```

### Hexagon
```xml
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='25,10 75,10 95,50 75,90 25,90 5,50' fill='#F38181'/></svg>
```

## VALIDATION CHECKLIST

Before creating a shape asset, verify:

- [ ] Each shape has COMPLETE `<svg>...</svg>` tags (not just path)
- [ ] Each SVG includes `xmlns='http://www.w3.org/2000/svg'`
- [ ] Each SVG has `viewBox` attribute
- [ ] Each SVG has `width` and `height` attributes
- [ ] Created EXACT number of shapes requested by user
- [ ] All shapes are in `value` field (NOT in config)
- [ ] Format is `name|svg` separated by newline
- [ ] `shapeCount` in config matches actual number of shapes

## WHAT HAPPENS IF YOU DO IT WRONG

If you create shapes with just `path` and `viewBox` instead of complete SVG:
1. User will see text instead of shapes
2. Auto-fix script will try to convert it
3. But it's better to do it right the first time!

## REMEMBER

**SHAPES = COMPLETE SVG CODE**
**NOT path data, NOT viewBox only, but COMPLETE `<svg>...</svg>` tags!**
