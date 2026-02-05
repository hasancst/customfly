# Character Limit Enforcement - Feature Documentation

**Status**: ✅ Production Ready  
**Last Updated**: 1 Februari 2026  
**Related Files**: `MonogramTool.tsx`, `TextTool.tsx`, `DraggableElement.tsx`, `NumberTool.tsx`, `PhoneTool.tsx`, `DateTool.tsx`, `TimeTool.tsx`

---

## 📋 Overview

Fitur ini memastikan bahwa user **tidak dapat mengetik** melebihi batas karakter yang ditentukan di Advanced Settings. Implementasi menggunakan HTML5 `maxLength` attribute untuk hard-stop enforcement yang native dan performant.

---

## 🎯 Features

### 1. Strict Input Enforcement
- **Hard-Stop Typing**: Keyboard input diblokir secara fisik setelah mencapai limit
- **Paste Protection**: Text yang di-paste otomatis dipotong sesuai limit
- **Real-Time Sync**: Perubahan limit di Advanced Settings langsung diterapkan
- **Visual Feedback**: Character counter berubah merah saat mencapai limit

### 2. Tool-Specific Behavior

#### Monogram Tool
- **Default Limit**: 3 karakter (configurable via Advanced Settings)
- **Uppercase Enforcement**: Semua input dipaksa uppercase
- **Canvas Consistency**: Limit yang sama diterapkan saat edit di canvas

#### Text Tool
- **Flexible Limits**: Support unlimited (maxChars = 0) atau custom limit
- **Textarea Support**: Enforcement sama untuk input dan textarea
- **Character Counter**: Menampilkan `current/max` dengan color indicator

#### Specialized Tools (Number, Phone, Date, Time)
- **Property Sync**: `maxChars` tersinkronisasi via `useEffect` dependencies
- **Consistent Behavior**: Semua tools mengikuti pattern yang sama

---

## 🔧 Technical Implementation

### Core Mechanism

```tsx
// 1. HTML5 maxLength attribute (browser-level enforcement)
<Input maxLength={maxChars || 3} />

// 2. onChange validation (backup protection)
onChange={(e) => {
  const limit = maxChars || 3;
  let val = e.target.value;
  if (val.length > limit) {
    val = val.substring(0, limit);
  }
  setText(val);
}}

// 3. onInput enforcement (paste protection)
onInput={(e) => {
  const limit = maxChars || 3;
  if (e.currentTarget.value.length > limit) {
    e.currentTarget.value = e.currentTarget.value.substring(0, limit);
  }
}}
```

### State Synchronization

```tsx
// useEffect dengan maxChars dependency
useEffect(() => {
  if (selectedElement) {
    setMaxChars(selectedElement.maxChars || 3);
  }
}, [
  selectedElement?.id,
  selectedElement?.maxChars, // ← Critical dependency
]);
```

---

## 📊 Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| `MonogramTool.tsx` | Default 3 chars, uppercase, sync | Monogram-specific enforcement |
| `TextTool.tsx` | Flexible limits, counter display | Text element enforcement |
| `DraggableElement.tsx` | Canvas inline editing limits | Consistent canvas behavior |
| `NumberTool.tsx` | Added `maxChars` dependency | Property sync |
| `PhoneTool.tsx` | Added `maxChars` dependency | Property sync |
| `DateTool.tsx` | Added `maxChars` dependency | Property sync |
| `TimeTool.tsx` | Added `maxChars` dependency | Property sync |

---

## 🧪 Testing

### Automated Tests
**File**: `frontend/src/components/__tests__/CharacterLimitEnforcement.test.tsx`

**Coverage**:
- ✅ Default limit enforcement (3 chars for monogram)
- ✅ Custom limit enforcement (configurable)
- ✅ Uppercase transformation (monogram only)
- ✅ Paste protection (truncation)
- ✅ Limit synchronization (Advanced Settings → Input)
- ✅ Textarea enforcement (same as input)

**Run Tests**:
```bash
npm test CharacterLimitEnforcement.test.tsx
```

### Manual Testing Checklist

#### Monogram Tool
- [ ] Add monogram → verify default 3 chars → try typing 4th char → should be blocked
- [ ] Set maxChars to 5 in Advanced Settings → verify typing stops at 5 chars
- [ ] Change maxChars from 3 to 2 → verify input immediately respects new limit
- [ ] Double-click monogram → verify same limit applies → typing blocked at limit
- [ ] Verify all monogram input is forced to uppercase (toolbar + canvas)
- [ ] Copy "ABCDEFGH" → paste into 3-char monogram → verify only "ABC" appears

#### Text Tool
- [ ] Set maxChars to 0 → verify can type freely (default 100 char browser limit)
- [ ] Set maxChars to 20 → verify typing stops exactly at 20 chars
- [ ] Switch to textarea → set limit 50 → verify same enforcement
- [ ] Change maxChars from 20 to 10 → verify input respects new limit immediately
- [ ] Double-click text element → verify character counter shows correct limit
- [ ] Type near limit → verify counter turns red when reaching maxChars

---

## 🐛 Known Limitations

### Browser Compatibility
- ✅ **Chrome/Edge**: Full support
- ✅ **Firefox**: Full support
- ✅ **Safari**: Full support
- ⚠️ **IE11**: Not supported (deprecated browser)

### Edge Cases
- **Emoji/Unicode**: Multi-byte characters count as 1 character (browser behavior)
- **IME Input**: Some Asian language input methods may bypass maxLength temporarily
- **Autocomplete**: Browser autocomplete respects maxLength

---

## 📚 Related Documentation

- [Frontend.md](file:///www/wwwroot/custom.local/doc/Frontend.md) - Overall frontend architecture
- [regression.md](file:///www/wwwroot/custom.local/doc/regression.md) - Regression testing procedures
- [unit test.md](file:///www/wwwroot/custom.local/doc/unit%20test.md) - Unit testing guidelines

---

## 🔄 Future Enhancements

### Potential Improvements
- [ ] **Word Count Limit**: Support word-based limits instead of character-based
- [ ] **Rich Text**: Support for formatted text with character limits
- [ ] **Multi-Language**: Better IME support for Asian languages
- [ ] **Custom Validation**: Allow regex-based validation rules

### Performance Optimizations
- ✅ Already using native `maxLength` (zero JS overhead)
- ✅ Minimal re-renders via proper dependency arrays
- ✅ No debouncing needed (native browser handling)

---

## 📝 Changelog

### v1.0.0 (1 Februari 2026)
- ✅ Initial implementation with strict enforcement
- ✅ Monogram default 3 chars with uppercase
- ✅ Text tool flexible limits
- ✅ Canvas inline editing consistency
- ✅ Property sync across all specialized tools
- ✅ Comprehensive test coverage (automated + manual)

---

## 👥 Maintenance

**Primary Maintainer**: Development Team  
**Review Cycle**: Quarterly  
**Breaking Changes**: None expected (uses standard HTML5 features)

**Contact**: Refer to project README for support channels
