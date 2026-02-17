---
inclusion: auto
---

# 🚨 CRITICAL ASSET MANAGEMENT RULES 🚨

## RULE #1: NEVER CREATE NEW GROUP UNLESS USER EXPLICITLY SAYS SO

**READ THIS CAREFULLY:**

When user says "add 5 shapes to Custom" or "tambah 5 shapes ke Custom":
- ❌ DO NOT use CREATE_ASSET action
- ❌ DO NOT create new asset
- ✅ USE ADD_ITEMS_TO_ASSET action
- ✅ ADD 5 shapes to existing "Custom" group

**ONLY use CREATE_ASSET when user EXPLICITLY says:**
- "create new group"
- "buat group baru"
- "make new group"

## RULE #2: USE CORRECT ACTION TYPE

### Available Action Types for Assets:

1. **ADD_ITEMS_TO_ASSET** - Add items to existing asset group
   - Use when: User wants to add items to existing group
   - Payload: `{ assetIdentifier, items }`

2. **CREATE_ASSET** - Create new asset group
   - Use when: User explicitly says "create new"
   - Payload: `{ asset: { type, name, value, config } }`

3. **UPDATE_ASSET** - Update asset properties (name, config, etc.)
   - Use when: User wants to rename or change settings
   - Payload: `{ assetId, updates }`

4. **DELETE_ASSET** - Delete asset group
   - Use when: User wants to delete a group
   - Payload: `{ assetId }`

## RULE #3: ADD_ITEMS_TO_ASSET Action Format

**When user says "add 5 shapes to Custom":**

```json
{
  "type": "ADD_ITEMS_TO_ASSET",
  "payload": {
    "assetIdentifier": "Custom",
    "items": [
      "Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>",
      "Square|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect x='10' y='10' width='80' height='80' fill='#4ECDC4'/></svg>",
      "Triangle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,90 10,90' fill='#FFE66D'/></svg>",
      "Star|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35' fill='#A8E6CF'/></svg>",
      "Heart|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><path d='M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z' fill='#FF6B9D'/></svg>"
    ]
  },
  "description": "Add 5 shapes to Custom group"
}
```

**Key points:**
- `assetIdentifier` can be asset ID or asset name
- `items` is array of strings in correct format for asset type
- For shapes: `"Name|<svg>...</svg>"`
- For colors: `"Name|#HEX"`
- For fonts: `"FontName"` or `"Name|URL"`
- For gallery: `"Name|URL"`
- For options: `"Name|Value"`

## RULE #4: UNDERSTAND USER INTENT

### Intent: ADD to Existing Group

**User says (in ANY language):**
- "add 5 shapes to Custom"
- "tambah 5 shapes ke Custom"
- "add shapes to Custom"
- "masukkan shapes ke Custom"
- "insert shapes to Custom"

**What AI MUST do:**
1. Use ADD_ITEMS_TO_ASSET action
2. Set assetIdentifier to "Custom"
3. Create array of 5 complete SVG shapes
4. Return action for user approval

**What AI MUST NOT do:**
- ❌ Use CREATE_ASSET action
- ❌ Create new group
- ❌ Use UPDATE_ASSET action

### Intent: CREATE New Group

**User says (EXPLICITLY):**
- "create new group called X"
- "buat group baru dengan nama X"
- "make new group named X"

**What AI MUST do:**
1. Use CREATE_ASSET action
2. Create new asset with name X

## RULE #5: DECISION LOGIC

```
User Request
    ↓
Does user mention a group name? (Custom, My Fonts, etc.)
    ↓
YES → Does user say "create new" or "buat baru"?
    ↓
    NO → Use ADD_ITEMS_TO_ASSET action
    YES → Use CREATE_ASSET action
    ↓
NO → Ask user which group to use
```

## RULE #6: SHAPE FORMAT

**SHAPES MUST BE COMPLETE SVG CODE!**

❌ WRONG:
```javascript
{ path: "M12...", viewBox: "0 0 24 24" }
```

✅ RIGHT:
```javascript
"Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>"
```

## RULE #7: ITEM FORMATS BY ASSET TYPE

| Asset Type | Format | Example |
|------------|--------|---------|
| Shapes | `Name\|<svg>...</svg>` | `Circle\|<svg>...</svg>` |
| Colors | `Name\|#HEX` | `Red\|#FF0000` |
| Fonts (Google) | `FontName` | `Arial` |
| Fonts (Custom) | `Name\|URL` | `MyFont\|https://...` |
| Gallery | `Name\|URL` | `Logo\|https://...` |
| Options | `Name\|Value` | `Small\|S` |

## COMPLETE EXAMPLE

### User Request: "add 5 shapes to Custom"

**AI Response:**

```json
{
  "message": "I'll add 5 shapes to your Custom group.",
  "suggestedActions": [
    {
      "type": "ADD_ITEMS_TO_ASSET",
      "payload": {
        "assetIdentifier": "Custom",
        "items": [
          "Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>",
          "Square|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect x='10' y='10' width='80' height='80' fill='#4ECDC4'/></svg>",
          "Triangle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,90 10,90' fill='#FFE66D'/></svg>",
          "Star|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35' fill='#A8E6CF'/></svg>",
          "Heart|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><path d='M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z' fill='#FF6B9D'/></svg>"
        ]
      },
      "description": "Add 5 basic shapes (Circle, Square, Triangle, Star, Heart) to Custom group"
    }
  ]
}
```

## VALIDATION CHECKLIST

Before creating action, AI MUST verify:

- [ ] Did user mention a group name? (Custom, My Fonts, etc.)
- [ ] Did user say "create new" or "buat baru"?
- [ ] If adding: Am I using ADD_ITEMS_TO_ASSET action?
- [ ] If creating: Am I using CREATE_ASSET action?
- [ ] Am I using correct item format for asset type?
- [ ] For shapes: Am I using complete SVG code?
- [ ] Did I include description for the action?

## COMMON MISTAKES

❌ **MISTAKE 1:** User says "add to Custom" → AI uses CREATE_ASSET
✅ **CORRECT:** User says "add to Custom" → AI uses ADD_ITEMS_TO_ASSET

❌ **MISTAKE 2:** User says "add shapes" → AI creates new group
✅ **CORRECT:** User says "add shapes" → AI asks which group

❌ **MISTAKE 3:** AI uses UPDATE_ASSET to add items
✅ **CORRECT:** AI uses ADD_ITEMS_TO_ASSET to add items

❌ **MISTAKE 4:** AI creates shapes with only path data
✅ **CORRECT:** AI creates complete SVG code

## SUMMARY

**GOLDEN RULES:**
1. User mentions group name → Use ADD_ITEMS_TO_ASSET
2. User says "create new" → Use CREATE_ASSET
3. Group not found → Backend will list available groups
4. NEVER use CREATE_ASSET unless explicitly requested
5. ALWAYS use complete SVG code for shapes
6. ALWAYS include description in action

**ACTION TYPES:**
- ADD_ITEMS_TO_ASSET - Add to existing group
- CREATE_ASSET - Create new group
- UPDATE_ASSET - Update properties
- DELETE_ASSET - Delete group

**REMEMBER:**
- "add to Custom" = ADD_ITEMS_TO_ASSET with assetIdentifier="Custom"
- "create new" = CREATE_ASSET
- When in doubt = Ask user
- Use complete SVG, not just path!

---

**IF YOU USE CREATE_ASSET WHEN USER WANTED TO ADD TO EXISTING, YOU FAILED!**
**IF YOU DON'T USE COMPLETE SVG FOR SHAPES, YOU FAILED!**
