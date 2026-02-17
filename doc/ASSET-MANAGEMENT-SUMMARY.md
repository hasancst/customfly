# Asset Management - Documentation Summary

## Problem Solved

AI was creating NEW groups when user asked to ADD items to EXISTING groups.

Example:
- User: "Add 5 shapes to Custom Shapes"
- AI (WRONG): Creates new group called "Custom Shapes"
- AI (RIGHT): Fetches existing "Custom Shapes" and adds 5 shapes to it

## Solution

Created comprehensive documentation to help AI distinguish between CREATE and ADD operations.

## Files Created

### 1. `doc/ai-distinguish-create-vs-add.md`
**Purpose:** Main guide for AI to understand CREATE vs ADD operations

**Key Content:**
- Decision tree for determining operation type
- Keywords detection (Indonesian & English)
- Step-by-step workflows for both scenarios
- Examples for all asset types (fonts, colors, gallery, options, shapes)
- Validation checklist
- Common mistakes to avoid

**When to use:** When user mentions adding items to groups

### 2. `.kiro/steering/asset-management-rules.md`
**Purpose:** Auto-included steering rule for all AI interactions

**Key Content:**
- Quick reference for CREATE vs ADD
- Correct separators for each asset type
- Shape format rules (complete SVG required)
- Workflow template
- Common user phrases in Indonesian & English
- Validation checklist

**Status:** Auto-included in all AI conversations

### 3. `doc/ai-add-items-to-assets.md` (Updated)
**Purpose:** Detailed guide for adding items to existing groups

**Updates:**
- Added critical warning at the top
- Emphasized checking if group exists first
- Added code example for group existence check

## How It Works

### User Says: "Tambah 5 shapes ke Custom Shapes"

AI will now:

1. **Detect keywords:** "tambah ke" → This is ADD operation
2. **Check existence:**
   ```javascript
   const group = await prisma.asset.findFirst({
     where: { shop, type: 'shape', name: 'Custom Shapes' }
   });
   ```
3. **If not found:** List available groups and STOP
4. **If found:** Parse existing items, add new items, update group

### User Says: "Buat group baru dengan 5 shapes"

AI will:

1. **Detect keywords:** "buat group baru" → This is CREATE operation
2. **Create new asset** with 5 shapes
3. **Don't check** for existing groups

## Keywords Reference

### ADD to Existing (Indonesian)
- tambah ke
- tambahkan ke
- masukkan ke
- insert ke
- append ke

### ADD to Existing (English)
- add to
- add items to
- insert to
- append to

### CREATE New (Indonesian)
- buat baru
- buat group baru
- create group baru

### CREATE New (English)
- create new
- create new group
- create group

## Separator Rules

**CRITICAL:** Each asset type uses different separator!

| Asset Type | Separator | Example |
|------------|-----------|---------|
| Fonts | `\n` (newline) | `Arial\nHelvetica\nRoboto` |
| Colors | `, ` (comma+space) | `Red\|#FF0000, Blue\|#0000FF` |
| Gallery | `\n` (newline) | `Logo1\|url1\nLogo2\|url2` |
| Options | `, ` (comma+space) | `Small\|S, Medium\|M, Large\|L` |
| Shapes | `\n` (newline) | `Circle\|<svg>...</svg>\nSquare\|<svg>...</svg>` |

## Shape Format Rules

**SHAPES MUST BE COMPLETE SVG CODE!**

❌ **WRONG:**
```javascript
{ path: "M12 2l2.5...", viewBox: "0 0 24 24" }
```

✅ **RIGHT:**
```javascript
"Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>"
```

## Validation Checklist for AI

Before executing ANY asset operation:

- [ ] Is this ADD or CREATE operation?
- [ ] If ADD: Does the group exist?
- [ ] If group not found: Did I list available groups?
- [ ] What separator should I use?
- [ ] For shapes: Am I using complete SVG code?
- [ ] Did I preserve existing items?
- [ ] Did I update metadata (count, lastUpdated)?

## Testing

To test if AI understands:

### Test 1: Add to Existing
**User:** "Add 3 shapes to Customfly Shapes"

**Expected AI behavior:**
1. Fetch "Customfly Shapes" group
2. If found: Parse existing, add 3 new shapes, update
3. If not found: List available shape groups, ask user

### Test 2: Create New
**User:** "Create new group called My Shapes with 5 shapes"

**Expected AI behavior:**
1. Create new asset with 5 shapes
2. Don't check for existing groups

### Test 3: Wrong Group Name
**User:** "Add 5 shapes to NonExistent Group"

**Expected AI behavior:**
1. Try to fetch "NonExistent Group"
2. Not found
3. List all available shape groups
4. Ask user which group to use
5. DON'T create new group

## Related Documentation

- `doc/ai-shape-asset-strict-rules.md` - Shape format rules
- `doc/ai-add-items-to-assets.md` - Adding items guide
- `doc/ai-distinguish-create-vs-add.md` - CREATE vs ADD guide
- `.kiro/steering/asset-management-rules.md` - Auto-included rules

## Auto-Fix Script

If AI still creates shapes with wrong format:

```bash
node backend/auto_fix_shapes.cjs
```

This will convert path+viewBox to complete SVG code.

## Summary

✅ Created 3 documentation files
✅ Updated existing documentation
✅ Added auto-included steering rule
✅ Covered all asset types
✅ Included Indonesian & English keywords
✅ Added validation checklists
✅ Provided code examples

**AI should now correctly distinguish between CREATE and ADD operations!**
