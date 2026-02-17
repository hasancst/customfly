# Auto-Fix Shapes - Automatic Correction Guide

## Problem

AI sometimes creates shapes with wrong format:
- Only path data instead of complete SVG
- Missing xmlns, viewBox, width, height attributes
- Incomplete SVG tags

## Solution

**ALWAYS run auto-fix script after creating or updating shapes!**

## How to Use

### Method 1: Automatic (Recommended)

AI should ALWAYS run this code after any shape create/update operation:

```javascript
const { execSync } = require('child_process');

// After creating or updating shapes, ALWAYS run auto-fix
console.log('\n🔧 Running auto-fix to ensure correct format...');
try {
  execSync('node backend/auto_fix_shapes.cjs', { stdio: 'inherit' });
  console.log('✅ Auto-fix completed successfully!');
} catch (error) {
  console.error('⚠️  Auto-fix failed:', error.message);
  console.log('⚠️  Shapes may have incorrect format');
}
```

### Method 2: Manual (For Testing)

Run this command manually:

```bash
node backend/auto_fix_shapes.cjs
```

## When to Run Auto-Fix

**ALWAYS run after:**
1. Creating new shape asset
2. Adding shapes to existing group
3. Updating shape items
4. Importing shapes from external source

**Example workflow:**

```javascript
// 1. Create or update shapes
await prisma.asset.create({
  data: {
    shop: shop,
    type: 'shape',
    name: 'My Shapes',
    value: shapesValue
  }
});

console.log('✅ Shapes created');

// 2. ALWAYS run auto-fix immediately
const { execSync } = require('child_process');
console.log('🔧 Running auto-fix...');
try {
  execSync('node backend/auto_fix_shapes.cjs', { stdio: 'inherit' });
  console.log('✅ Auto-fix completed!');
} catch (error) {
  console.error('⚠️  Auto-fix failed:', error.message);
}
```

## What Auto-Fix Does

1. **Scans all shape assets** in the database
2. **Detects wrong format:**
   - Shapes in `config.shapes` array (should be in `value` field)
   - Shapes with only `path` and `viewBox` (missing complete SVG)
3. **Converts to correct format:**
   - Moves shapes from `config` to `value`
   - Generates complete SVG from path+viewBox
   - Uses format: `name|<svg>...</svg>`
4. **Updates database** with corrected format

## Example Output

```
🔧 Auto-fixing Shape Assets...

❌ Wrong format: Basic Shapes
   Converting 5 shapes...
   🔧 Generated SVG for: Circle
   🔧 Generated SVG for: Square
   🔧 Generated SVG for: Triangle
   🔧 Generated SVG for: Star
   🔧 Generated SVG for: Heart
   ✅ Fixed!

════════════════════════════════════════════════════════════
📊 Summary:
════════════════════════════════════════════════════════════
✅ Already correct: 4
🔧 Fixed: 1
📦 Total: 5
════════════════════════════════════════════════════════════

🎉 Done!
```

## Integration with AI

### In Steering Rules

The `.kiro/steering/asset-management-rules.md` file now includes:

```javascript
// CRITICAL: Always run auto-fix after shape operations
console.log('\n🔧 Running auto-fix...');
const { execSync } = require('child_process');
try {
  execSync('node backend/auto_fix_shapes.cjs', { stdio: 'inherit' });
  console.log('✅ Auto-fix completed!');
} catch (error) {
  console.error('⚠️  Auto-fix failed:', error.message);
}
```

### In Documentation

All shape-related documentation now includes auto-fix step:
- `doc/ai-add-items-to-assets.md`
- `doc/ai-shape-asset-strict-rules.md`
- `.kiro/steering/asset-management-rules.md`

## For Customers

**Customers don't need to run anything manually!**

Auto-fix runs automatically every time AI creates or updates shapes. The process is:

1. Customer asks AI to add shapes
2. AI creates/updates shapes
3. AI automatically runs auto-fix
4. Shapes are corrected if needed
5. Customer sees correct shapes immediately

## Error Handling

If auto-fix fails:

```javascript
try {
  execSync('node backend/auto_fix_shapes.cjs', { stdio: 'inherit' });
  console.log('✅ Auto-fix completed!');
} catch (error) {
  console.error('⚠️  Auto-fix failed:', error.message);
  console.log('⚠️  Shapes may have incorrect format');
  console.log('💡 You can run manually: node backend/auto_fix_shapes.cjs');
}
```

## Testing

### Test 1: Create shapes with wrong format

```javascript
// Create shapes with wrong format (path only)
await prisma.asset.create({
  data: {
    shop: shop,
    type: 'shape',
    name: 'Test Shapes',
    config: {
      shapes: [
        { name: 'Circle', path: 'M50,50 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0', viewBox: '0 0 100 100' }
      ]
    }
  }
});

// Run auto-fix
execSync('node backend/auto_fix_shapes.cjs');

// Verify: shapes should now be in value field with complete SVG
```

### Test 2: Add shapes to existing group

```javascript
// Add shapes
const group = await prisma.asset.findFirst({ where: { name: 'Custom' } });
const current = group.value.split('\n');
const newShapes = ['Star|<svg>...</svg>'];
const all = [...current, ...newShapes];

await prisma.asset.update({
  where: { id: group.id },
  data: { value: all.join('\n') }
});

// Auto-fix
execSync('node backend/auto_fix_shapes.cjs');
```

## Summary

✅ Auto-fix runs automatically after shape operations
✅ Customers don't need to run anything manually
✅ Shapes are always in correct format
✅ AI includes auto-fix in all shape workflows
✅ Error handling ensures graceful degradation

**Key Point:** AI MUST ALWAYS run auto-fix after creating or updating shapes. This is not optional!

## Checklist for AI

When working with shapes, AI MUST:

- [ ] Create or update shapes
- [ ] Run auto-fix script immediately
- [ ] Check if auto-fix succeeded
- [ ] Log success or error message
- [ ] Continue with next operation

**If AI doesn't run auto-fix, shapes may have wrong format and won't display correctly!**
