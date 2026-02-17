# AI Shape Asset Format Guide

## ⚠️ CRITICAL: Correct Format for Shape Assets

When creating or updating shape assets, you MUST follow this EXACT format.

### Database Structure

```javascript
{
  type: 'shape',
  name: 'Asset Group Name',
  label: 'Asset Group Name',
  value: 'name1|<svg>...</svg>\nname2|<svg>...</svg>\n...',  // ← SHAPES GO HERE!
  config: {
    source: 'ai-generated',
    imported: '2026-02-16T12:00:00.000Z',
    shapeCount: 5,
    format: 'name|svg (newline separated)'
  }
}
```

### ✅ CORRECT: Value Field Format

The `value` field MUST contain ALL shapes in this format:
```
ShapeName1|<svg>...</svg>
ShapeName2|<svg>...</svg>
ShapeName3|<svg>...</svg>
```

**Rules:**
- Each line = one shape
- Format: `name|svg_code` (pipe separator)
- Line separator: `\n` (newline)
- SVG code must be complete and valid
- ALL shapes go in `value`, NOT in `config`

### Complete Example (5 Shapes)

```javascript
const shapes = [
  { name: 'Circle', svg: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>' },
  { name: 'Square', svg: '<svg width="100" height="100"><rect width="80" height="80" x="10" y="10" fill="blue"/></svg>' },
  { name: 'Triangle', svg: '<svg width="100" height="100"><polygon points="50,10 90,90 10,90" fill="green"/></svg>' },
  { name: 'Star', svg: '<svg width="100" height="100"><polygon points="50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35" fill="yellow"/></svg>' },
  { name: 'Heart', svg: '<svg width="100" height="100"><path d="M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z" fill="pink"/></svg>' }
];

// Convert to correct format
const shapesValue = shapes.map(s => `${s.name}|${s.svg}`).join('\n');

// Create asset
await prisma.asset.create({
  data: {
    shop: shop,
    type: 'shape',
    name: 'My 5 Shapes',
    label: 'My 5 Shapes',
    value: shapesValue,  // ← ALL 5 shapes here!
    isDefault: false,
    config: {
      source: 'ai-generated',
      imported: new Date().toISOString(),
      shapeCount: 5,  // ← Must match actual count
      format: 'name|svg (newline separated)'
    }
  }
});
```

### Result in Database

```
value: "Circle|<svg width='100' height='100'><circle cx='50' cy='50' r='40' fill='red'/></svg>
Square|<svg width='100' height='100'><rect width='80' height='80' x='10' y='10' fill='blue'/></svg>
Triangle|<svg width='100' height='100'><polygon points='50,10 90,90 10,90' fill='green'/></svg>
Star|<svg width='100' height='100'><polygon points='50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35' fill='yellow'/></svg>
Heart|<svg width='100' height='100'><path d='M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z' fill='pink'/></svg>"
```

## ❌ WRONG Format (DO NOT USE)

### Wrong #1: Shapes in config
```javascript
{
  value: 'circle,square,triangle',  // ❌ WRONG!
  config: {
    shapes: [  // ❌ NEVER put shapes here!
      { name: 'Circle', svg: '<svg>...</svg>' }
    ]
  }
}
```

### Wrong #2: JSON array in value
```javascript
{
  value: JSON.stringify([...])  // ❌ WRONG!
}
```

### Wrong #3: Missing shapes
```javascript
// User asks for 5 shapes, but you only create 3
const shapes = [
  { name: 'Circle', svg: '...' },
  { name: 'Square', svg: '...' },
  { name: 'Triangle', svg: '...' }
  // ❌ Missing 2 shapes!
];
```

## Checklist Before Creating Shape Asset

- [ ] Created ALL requested shapes (if user asks for 5, create 5!)
- [ ] Each shape has valid SVG code
- [ ] Format is `name|svg` for each line
- [ ] All shapes are in `value` field (NOT in config)
- [ ] Lines are separated by `\n`
- [ ] `shapeCount` in config matches actual number of shapes
- [ ] Config only contains metadata (no shape data)

## Parsing Shapes in Frontend

```javascript
// Parse shapes from value
const shapes = asset.value.split('\n').filter(Boolean).map(line => {
  const parts = line.split('|');
  const name = parts[0];
  const svg = parts.slice(1).join('|'); // In case SVG contains |
  return { name, svg };
});
```

## Displaying Shapes in UI

```jsx
{shapes.map(shape => (
  <div key={shape.name}>
    <div dangerouslySetInnerHTML={{ __html: shape.svg }} />
    <span>{shape.name}</span>
  </div>
))}
```

## Summary

✅ **MUST DO**: Store ALL shapes as `name|svg` in `value` field, newline separated
✅ **MUST DO**: Create the EXACT number of shapes requested by user
✅ **MUST DO**: Config only contains metadata (source, count, format)
❌ **NEVER**: Store shapes in `config` 
❌ **NEVER**: Use JSON array format
❌ **NEVER**: Create fewer shapes than requested
