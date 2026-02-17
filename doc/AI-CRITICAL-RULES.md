# 🚨 CRITICAL RULES FOR AI - MUST READ FIRST 🚨

## THE #1 MOST IMPORTANT RULE

**WHEN USER SAYS "add [items] to [group name]":**

### ❌ DO NOT DO THIS:
- Use CREATE_ASSET action
- Use CREATE_COLOR_PALETTE action
- Use CREATE_FONT_GROUP action
- Use CREATE_GALLERY action
- Create any new group

### ✅ ALWAYS DO THIS:
- Use ADD_ITEMS_TO_ASSET action
- Set assetIdentifier to the group name user mentioned
- Add items to that existing group

## Examples That MUST Use ADD_ITEMS_TO_ASSET

### Example 1
**User says:** "add 5 shapes to Custom"

**AI MUST respond with:**
```json
{
  "type": "ADD_ITEMS_TO_ASSET",
  "payload": {
    "assetIdentifier": "Custom",
    "items": [
      "Circle|<svg>...</svg>",
      "Square|<svg>...</svg>",
      "Triangle|<svg>...</svg>",
      "Star|<svg>...</svg>",
      "Heart|<svg>...</svg>"
    ]
  },
  "description": "Add 5 shapes to Custom group"
}
```

**AI MUST NOT respond with:**
```json
{
  "type": "CREATE_ASSET",  // ❌ WRONG!
  ...
}
```

### Example 2
**User says:** "add colors to Brand Colors"

**AI MUST use:** ADD_ITEMS_TO_ASSET with assetIdentifier="Brand Colors"

### Example 3
**User says:** "add fonts to My Fonts"

**AI MUST use:** ADD_ITEMS_TO_ASSET with assetIdentifier="My Fonts"

### Example 4
**User says:** "tambah 5 shapes ke Custom" (Indonesian)

**AI MUST use:** ADD_ITEMS_TO_ASSET with assetIdentifier="Custom"

## When to Use CREATE_ASSET

**ONLY use CREATE_ASSET when user EXPLICITLY says:**
- "create new group"
- "make new group"
- "buat group baru"
- "create new asset"

### Example of CREATE_ASSET
**User says:** "create new group called My Shapes with 5 shapes"

**AI can use:**
```json
{
  "type": "CREATE_ASSET",
  "payload": {
    "asset": {
      "type": "shape",
      "name": "My Shapes",
      "value": "..."
    }
  }
}
```

## Decision Tree

```
User Request
    ↓
Does user mention existing group name?
    ↓
YES → Does user say "create new"?
    ↓
    NO → Use ADD_ITEMS_TO_ASSET ✅
    YES → Use CREATE_ASSET ✅
    ↓
NO → Ask user for clarification
```

## Common Phrases That Mean "Add to Existing"

### English
- "add [items] to [group]"
- "add [items] in [group]"
- "add [items] inside [group]"
- "insert [items] to [group]"
- "put [items] in [group]"

### Indonesian
- "tambah [items] ke [group]"
- "tambahkan [items] ke [group]"
- "masukkan [items] ke [group]"
- "taruh [items] di [group]"

### Arabic
- "أضف [items] إلى [group]"
- "أدخل [items] في [group]"

### Spanish
- "agregar [items] a [group]"
- "añadir [items] a [group]"

### French
- "ajouter [items] à [group]"
- "insérer [items] dans [group]"

**ALL OF THESE → Use ADD_ITEMS_TO_ASSET!**

## Common Mistakes

### Mistake #1: Creating New Group When User Wants to Add

**User:** "add 5 shapes to Custom"

❌ **WRONG Response:**
```json
{
  "message": "I'll create a new shape asset with 5 shapes",
  "actions": [{
    "type": "CREATE_ASSET",
    "payload": {
      "asset": {
        "name": "Common Shapes",
        ...
      }
    }
  }]
}
```

✅ **CORRECT Response:**
```json
{
  "message": "I'll add 5 shapes to your Custom group",
  "actions": [{
    "type": "ADD_ITEMS_TO_ASSET",
    "payload": {
      "assetIdentifier": "Custom",
      "items": [...]
    },
    "description": "Add 5 shapes to Custom group"
  }]
}
```

### Mistake #2: Not Understanding "to [group name]"

When user says "to Custom" or "to Brand Colors", they are referring to an EXISTING group.

**Key words:**
- "to [name]" = existing group
- "in [name]" = existing group
- "inside [name]" = existing group

### Mistake #3: Ignoring Group Name

**User:** "add shapes to Custom"

❌ **WRONG:** Create new group with different name
✅ **CORRECT:** Add to "Custom" group (exact name user mentioned)

## Validation Before Responding

Before sending response, AI MUST check:

1. ✅ Did user mention a group name?
2. ✅ Did user say "add to" or similar phrase?
3. ✅ Did user say "create new"?

**If YES to #1 and #2, and NO to #3:**
→ Use ADD_ITEMS_TO_ASSET

**If YES to #3:**
→ Use CREATE_ASSET

## Shape Format Rules

**For shapes, items MUST be complete SVG code:**

❌ WRONG:
```javascript
"Circle"  // Just name
{ path: "M...", viewBox: "..." }  // Just path data
```

✅ RIGHT:
```javascript
"Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>"
```

## Summary

**THE GOLDEN RULE:**

```
User mentions group name + wants to add items
    ↓
Use ADD_ITEMS_TO_ASSET
    ↓
NOT CREATE_ASSET!
```

**Remember:**
- "add to Custom" = ADD_ITEMS_TO_ASSET
- "create new" = CREATE_ASSET
- When in doubt = Ask user

**If you use CREATE_ASSET when user said "add to [existing group]", YOU FAILED!**
