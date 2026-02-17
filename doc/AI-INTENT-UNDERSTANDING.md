# AI Intent Understanding - Multi-Language Support

## Core Principle

**AI MUST UNDERSTAND USER INTENT, NOT JUST MATCH KEYWORDS!**

The goal is to make AI flexible enough to understand what user wants in ANY language.

## Two Main Operations

### 1. ADD Items to Existing Group
**What user wants:** Add new items to a group that already exists

**How to detect:**
- User mentions a specific group name
- User does NOT say "create new group"
- Context suggests adding to existing

**Logic:**
```
IF (user mentions group name) AND (NOT "create new")
  THEN → Fetch group → Add items
```

### 2. CREATE New Group
**What user wants:** Create a brand new group

**How to detect:**
- User explicitly says "create new" or "buat baru"
- User wants a NEW group, not adding to existing
- Context suggests creating something new

**Logic:**
```
IF (user says "create new") OR (clearly wants new group)
  THEN → Create new asset
```

## Language-Independent Detection

### Scenario 1: User mentions existing group

**User says (in ANY language):**
- "add shape to Custom"
- "tambah shape ke Custom"
- "أضف شكل إلى Custom"
- "agregar forma a Custom"
- "ajouter forme à Custom"
- "Custom にシェイプを追加"

**AI should understand:**
- User mentioned "Custom" (a group name)
- User wants to ADD
- Action: Fetch "Custom" group and add items

### Scenario 2: User wants new group

**User says (in ANY language):**
- "create new group called My Shapes"
- "buat group baru dengan nama My Shapes"
- "إنشاء مجموعة جديدة باسم My Shapes"
- "crear nuevo grupo llamado My Shapes"
- "créer nouveau groupe appelé My Shapes"
- "My Shapes という新しいグループを作成"

**AI should understand:**
- User said "create new" or "buat baru"
- User wants to CREATE
- Action: Create new asset group

### Scenario 3: Ambiguous request

**User says:**
- "add shape" (no group mentioned)
- "tambah shape" (tidak sebutkan group)
- "أضف شكل" (لم يذكر المجموعة)

**AI should:**
1. List available groups
2. Ask user: "Which group? Available: Custom, Customfly Shapes, My Shapes"
3. Wait for user response
4. Then proceed with ADD operation

## Context Awareness

AI should use context to understand intent:

### Example 1: User is viewing a group
```
Context: User is on "Custom" group detail page
User: "add 5 shapes"
AI: → User wants to add to "Custom" (current group)
```

### Example 2: User just created a group
```
Context: User just created "My Shapes" group
User: "add more shapes"
AI: → User wants to add to "My Shapes" (recently created)
```

### Example 3: No context
```
Context: User is on main assets page
User: "add shapes"
AI: → Ask which group to add to
```

## Supported Languages

AI should understand intent in these languages (and more):

1. **English** - add, create, insert, append
2. **Indonesian** - tambah, buat, masukkan
3. **Arabic** - أضف, إنشاء, أدخل
4. **Spanish** - agregar, crear, añadir
5. **French** - ajouter, créer, insérer
6. **German** - hinzufügen, erstellen, einfügen
7. **Chinese** - 添加, 创建, 插入
8. **Japanese** - 追加, 作成, 挿入
9. **Portuguese** - adicionar, criar, inserir
10. **Russian** - добавить, создать, вставить
11. **Italian** - aggiungere, creare, inserire
12. **Dutch** - toevoegen, creëren, invoegen
13. **Korean** - 추가, 생성, 삽입
14. **Turkish** - ekle, oluştur, ekle
15. **Polish** - dodaj, utwórz, wstaw

## Intent Detection Algorithm

```javascript
function detectIntent(userMessage, context) {
  const message = userMessage.toLowerCase();
  
  // Check for explicit "create new" in any language
  const createKeywords = [
    'create new', 'buat baru', 'إنشاء جديد', 'crear nuevo',
    'créer nouveau', 'neue erstellen', '创建新', '新しい作成',
    'criar novo', 'создать новый', 'creare nuovo', 'nieuwe maken',
    '새로 생성', 'yeni oluştur', 'utwórz nowy'
  ];
  
  if (createKeywords.some(keyword => message.includes(keyword))) {
    return 'CREATE';
  }
  
  // Check if user mentions a group name
  const availableGroups = ['custom', 'customfly shapes', 'my fonts', 'brand colors'];
  const mentionsGroup = availableGroups.some(group => 
    message.includes(group.toLowerCase())
  );
  
  if (mentionsGroup) {
    return 'ADD';
  }
  
  // Check context
  if (context.currentGroup) {
    return 'ADD'; // User is viewing a group, likely wants to add
  }
  
  // Ambiguous - ask user
  return 'ASK';
}
```

## Validation Before Execution

Before executing ANY operation, AI must:

1. **Understand intent:** ADD or CREATE?
2. **If ADD:**
   - Fetch existing group
   - If not found, list available groups
   - Parse existing items
   - Add new items
   - Update group
3. **If CREATE:**
   - Create new asset
   - Add items to it
4. **If unclear:**
   - Ask user for clarification
   - List available options

## Examples in Different Languages

### English
```
User: "add 5 shapes to Custom"
AI: Fetches "Custom" group → Adds 5 shapes

User: "create new group with 5 shapes"
AI: Creates new asset → Adds 5 shapes
```

### Indonesian
```
User: "tambah 5 shapes ke Custom"
AI: Fetch group "Custom" → Tambah 5 shapes

User: "buat group baru dengan 5 shapes"
AI: Buat asset baru → Tambah 5 shapes
```

### Arabic
```
User: "أضف 5 أشكال إلى Custom"
AI: Fetch group "Custom" → Add 5 shapes

User: "إنشاء مجموعة جديدة مع 5 أشكال"
AI: Create new asset → Add 5 shapes
```

### Spanish
```
User: "agregar 5 formas a Custom"
AI: Fetch group "Custom" → Add 5 shapes

User: "crear nuevo grupo con 5 formas"
AI: Create new asset → Add 5 shapes
```

## Error Handling

### Error 1: Group not found
```
User: "add shapes to NonExistent"
AI: 
  ❌ Group "NonExistent" not found!
  Available groups:
  - Custom
  - Customfly Shapes
  - My Shapes
  
  Which group would you like to use?
```

### Error 2: Ambiguous request
```
User: "add shapes"
AI:
  Which group would you like to add to?
  Available groups:
  - Custom
  - Customfly Shapes
  - My Shapes
```

### Error 3: Wrong format
```
User: "add shapes" (AI creates with wrong format)
AI: 
  ✅ Added shapes
  ⚠️  Running auto-fix to ensure correct format...
  [Runs: node backend/auto_fix_shapes.cjs]
  ✅ Format corrected!
```

## Summary

✅ **Understand INTENT, not just keywords**
✅ **Support ANY language**
✅ **Use context to disambiguate**
✅ **Always check if group exists when adding**
✅ **Ask for clarification when unclear**
✅ **Preserve existing items when adding**
✅ **Use correct format for each asset type**

**The goal is to make AI smart enough to understand what user wants, regardless of how they say it or what language they use!**
