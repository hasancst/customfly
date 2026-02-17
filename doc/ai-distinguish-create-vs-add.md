# ⚠️ CRITICAL: Create Group vs Add Items - AI Must Distinguish!

## THE PROBLEM

When user says "add 5 shapes to Custom Shapes", AI creates a NEW group instead of adding items to EXISTING group!

## THE SOLUTION

**UNDERSTAND USER INTENT, NOT JUST KEYWORDS!**

AI must think logically about what user wants:
- Does user want to ADD to existing group?
- Or CREATE a brand new group?

**ALWAYS check if the group EXISTS first when adding!**

## DECISION LOGIC (Language Independent)

```
User Request (in ANY language)
    ↓
Does user mention a specific group name?
    ↓
YES → Does user explicitly say "create new group"?
    ↓
    NO → FETCH that group → ADD items to it
    YES → CREATE new group
    ↓
NO → Ask user: "Add to existing or create new?"
```

## 🌍 MULTI-LANGUAGE SUPPORT

**AI should understand intent in ANY language, not just specific keywords!**

### Intent: ADD to Existing Group

**English:**
- "add shape to Custom"
- "add 5 shapes"
- "insert new shapes to My Group"
- "I want to add fonts"

**Indonesian:**
- "tambah shape ke Custom"
- "tambahkan 5 shapes"
- "masukkan shape baru ke My Group"
- "saya mau tambah fonts"

**Arabic:**
- "أضف شكل إلى Custom"
- "أضف 5 أشكال"
- "أدخل أشكال جديدة إلى My Group"

**Spanish:**
- "agregar forma a Custom"
- "añadir 5 formas"
- "insertar nuevas formas en My Group"

**French:**
- "ajouter forme à Custom"
- "ajouter 5 formes"
- "insérer nouvelles formes dans My Group"

**German:**
- "Form zu Custom hinzufügen"
- "5 Formen hinzufügen"
- "neue Formen zu My Group einfügen"

**Chinese:**
- "添加形状到 Custom"
- "添加 5 个形状"
- "插入新形状到 My Group"

**Japanese:**
- "Custom にシェイプを追加"
- "5つのシェイプを追加"
- "My Group に新しいシェイプを挿入"

**ALL ABOVE → ADD to existing group!**

### Intent: CREATE New Group

**English:**
- "create new group called X"
- "make new group with 5 shapes"
- "I want a new group"

**Indonesian:**
- "buat group baru dengan nama X"
- "bikin grup baru dengan 5 shapes"
- "saya mau group baru"

**Arabic:**
- "إنشاء مجموعة جديدة باسم X"
- "إنشاء مجموعة جديدة مع 5 أشكال"

**Spanish:**
- "crear nuevo grupo llamado X"
- "hacer nuevo grupo con 5 formas"

**French:**
- "créer nouveau groupe appelé X"
- "faire nouveau groupe avec 5 formes"

**German:**
- "neue Gruppe namens X erstellen"
- "neue Gruppe mit 5 Formen erstellen"

**Chinese:**
- "创建名为 X 的新组"
- "创建包含 5 个形状的新组"

**Japanese:**
- "X という名前の新しいグループを作成"
- "5つのシェイプを含む新しいグループを作成"

**ALL ABOVE → CREATE new group!**

## KEYWORDS TO DETECT "ADD TO EXISTING"

**IMPORTANT:** Don't rely only on keywords! Understand the INTENT!

User intent is ADD when:
- User mentions a specific group name (Custom, My Fonts, Brand Colors, etc.)
- User does NOT say "create new group" or "buat group baru"
- User wants to add/insert/append items

**Examples in ANY language:**
- English: "add to [group]", "add items to [group]", "insert to [group]"
- Indonesian: "tambah ke [group]", "tambahkan ke [group]", "masukkan ke [group]"
- Arabic: "أضف إلى [group]", "أدخل إلى [group]"
- Spanish: "agregar a [group]", "añadir a [group]"
- French: "ajouter à [group]", "insérer dans [group]"
- German: "zu [group] hinzufügen", "in [group] einfügen"
- Chinese: "添加到 [group]", "插入到 [group]"
- Japanese: "[group] に追加", "[group] に挿入"

## KEYWORDS TO DETECT "CREATE NEW"

**IMPORTANT:** Don't rely only on keywords! Understand the INTENT!

User intent is CREATE when:
- User explicitly says "create new group" or "buat group baru"
- User provides a NEW group name that doesn't exist
- User clearly wants a NEW group

**Examples in ANY language:**
- English: "create new group", "make new group", "new group called X"
- Indonesian: "buat group baru", "bikin group baru", "group baru dengan nama X"
- Arabic: "إنشاء مجموعة جديدة", "مجموعة جديدة باسم X"
- Spanish: "crear nuevo grupo", "nuevo grupo llamado X"
- French: "créer nouveau groupe", "nouveau groupe appelé X"
- German: "neue Gruppe erstellen", "neue Gruppe namens X"
- Chinese: "创建新组", "名为 X 的新组"
- Japanese: "新しいグループを作成", "X という名前の新しいグループ"

## STEP-BY-STEP WORKFLOW

### Scenario 1: User Wants to ADD Items

**User says:** "Add 5 shapes to Custom Shapes"

```javascript
// Step 1: CHECK if group exists
const existingGroup = await prisma.asset.findFirst({
  where: {
    shop: shop,
    type: 'shape',
    name: 'Custom Shapes'
  }
});

// Step 2: If NOT found, list available groups
if (!existingGroup) {
  console.log('❌ Group "Custom Shapes" not found!');
  console.log('Available shape groups:');
  const allGroups = await prisma.asset.findMany({
    where: { shop: shop, type: 'shape' }
  });
  allGroups.forEach(g => console.log(`- ${g.name}`));
  return; // STOP! Don't create new group!
}

// Step 3: Parse existing items
const currentItems = existingGroup.value.split('\n').filter(Boolean);

// Step 4: Create NEW items (5 shapes as requested)
const newShapes = [
  "Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>",
  "Square|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect x='10' y='10' width='80' height='80' fill='#4ECDC4'/></svg>",
  "Triangle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 90,90 10,90' fill='#FFE66D'/></svg>",
  "Star|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><polygon points='50,10 61,35 88,35 66,52 72,78 50,63 28,78 34,52 12,35 39,35' fill='#A8E6CF'/></svg>",
  "Heart|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><path d='M50,90 L20,60 Q10,50 10,40 Q10,20 30,20 Q40,20 50,30 Q60,20 70,20 Q90,20 90,40 Q90,50 80,60 Z' fill='#FF6B9D'/></svg>"
];

// Step 5: COMBINE existing + new
const allItems = [...currentItems, ...newShapes];

// Step 6: UPDATE existing group
await prisma.asset.update({
  where: { id: existingGroup.id },
  data: {
    value: allItems.join('\n'),
    config: {
      ...existingGroup.config,
      shapeCount: allItems.length,
      lastUpdated: new Date().toISOString()
    }
  }
});

console.log(`✅ Added ${newShapes.length} shapes to "${existingGroup.name}"`);
console.log(`📊 Total shapes: ${allItems.length}`);
```

### Scenario 2: User Wants to CREATE New Group

**User says:** "Create new group called My Shapes with 5 shapes"

```javascript
// Step 1: Create shapes array
const shapes = [
  "Circle|<svg>...</svg>",
  "Square|<svg>...</svg>",
  "Triangle|<svg>...</svg>",
  "Star|<svg>...</svg>",
  "Heart|<svg>...</svg>"
];

// Step 2: Create NEW asset
await prisma.asset.create({
  data: {
    shop: shop,
    type: 'shape',
    name: 'My Shapes',
    label: 'My Shapes',
    value: shapes.join('\n'),
    config: {
      source: 'ai-generated',
      shapeCount: 5
    }
  }
});

console.log('✅ Created new group "My Shapes" with 5 shapes');
```

## EXAMPLES FOR ALL ASSET TYPES

### Add Fonts to Existing Group

```javascript
// User: "Add Arial, Helvetica to My Fonts"

const group = await prisma.asset.findFirst({
  where: { shop, type: 'font', name: 'My Fonts' }
});

if (!group) {
  console.log('❌ Group not found!');
  return;
}

const current = group.value.split('\n').filter(Boolean);
const newFonts = ['Arial', 'Helvetica'];
const all = [...current, ...newFonts];

await prisma.asset.update({
  where: { id: group.id },
  data: { value: all.join('\n') }
});
```

### Add Colors to Existing Group

```javascript
// User: "Add Red and Blue to Brand Colors"

const group = await prisma.asset.findFirst({
  where: { shop, type: 'color', name: 'Brand Colors' }
});

if (!group) {
  console.log('❌ Group not found!');
  return;
}

const current = group.value.split(', ').filter(Boolean);
const newColors = ['Red|#FF0000', 'Blue|#0000FF'];
const all = [...current, ...newColors];

await prisma.asset.update({
  where: { id: group.id },
  data: { value: all.join(', ') } // Note: comma+space for colors!
});
```

### Add Gallery Images to Existing Group

```javascript
// User: "Add 3 images to Product Gallery"

const group = await prisma.asset.findFirst({
  where: { shop, type: 'gallery', name: 'Product Gallery' }
});

if (!group) {
  console.log('❌ Group not found!');
  return;
}

const current = group.value.split('\n').filter(Boolean);
const newImages = [
  'Image 1|https://example.com/1.jpg',
  'Image 2|https://example.com/2.jpg',
  'Image 3|https://example.com/3.jpg'
];
const all = [...current, ...newImages];

await prisma.asset.update({
  where: { id: group.id },
  data: { value: all.join('\n') }
});
```

## VALIDATION CHECKLIST

Before executing, AI MUST answer these questions:

1. ❓ Did user mention an existing group name?
   - YES → Fetch that group first
   - NO → Create new group

2. ❓ Did user say "add to" or "tambah ke"?
   - YES → This is ADD operation, not CREATE

3. ❓ Does the group exist?
   - YES → Update it
   - NO → Show available groups, DON'T create new one

4. ❓ What separator to use?
   - Colors/Options: `, ` (comma + space)
   - Fonts/Gallery/Shapes: `\n` (newline)

## COMMON MISTAKES TO AVOID

❌ **WRONG:** User says "add to Custom Shapes" → AI creates new group
✅ **RIGHT:** User says "add to Custom Shapes" → AI fetches existing group and adds items

❌ **WRONG:** Group not found → AI creates new group anyway
✅ **RIGHT:** Group not found → AI shows available groups and asks user

❌ **WRONG:** AI uses wrong separator (newline for colors)
✅ **RIGHT:** AI uses correct separator (comma+space for colors)

## SUMMARY

**GOLDEN RULE:**
- User mentions existing group name → FETCH and UPDATE
- User says "create new" → CREATE new group
- When in doubt → LIST available groups and ASK user

**ALWAYS:**
1. Check if group exists first
2. Use correct separator
3. Preserve existing items
4. Update metadata (count, lastUpdated)

**NEVER:**
- Create new group when user wants to add to existing
- Overwrite existing items
- Use wrong separator
