# Individual Pricing - Regression Test Suite

## Test Environment

- **Component**: AssetDetail.tsx
- **Feature**: Individual item pricing for asset groups
- **Last Updated**: 2026-02-02

## Pre-Test Setup

1. Ensure backend service is running: `systemctl status imcst-backend.service`
2. Ensure frontend is built: `cd frontend && npm run build`
3. Login to admin panel
4. Navigate to any asset group (Fonts, Colors, Images, Options, or Shapes)

## Test Suite

### Test 1: Basic Pricing Enablement

**Objective**: Verify pricing can be enabled and pricing type can be selected

**Steps**:
1. Navigate to Fonts asset group
2. Verify "Pricing Settings" section exists in left sidebar
3. Check "Enable font pricing" checkbox
4. Verify "Pricing Type" dropdown appears
5. Select "Individual" from dropdown

**Expected Result**:
- Pricing Type dropdown shows after enabling pricing
- Dropdown has options: "Global" and "Individual"
- No errors in console

**Status**: ☐ Pass ☐ Fail

---

### Test 2: Individual Price Inputs Visibility

**Objective**: Verify price inputs appear for each item when individual pricing is enabled

**Steps**:
1. Enable font pricing
2. Select "Individual" pricing type
3. Scroll through the font list
4. Verify each font item has a price input field

**Expected Result**:
- Price input appears next to each item
- Input has "$" prefix
- Default value is "0"
- Input is editable

**Status**: ☐ Pass ☐ Fail

---

### Test 3: Price Input Functionality

**Objective**: Verify prices can be entered and saved

**Steps**:
1. Enable individual pricing for Fonts
2. Set price for "Inter" to "10"
3. Set price for "Arial" to "15.50"
4. Set price for "Helvetica" to "20"
5. Wait 2 seconds for auto-save
6. Refresh the page
7. Verify prices are preserved

**Expected Result**:
- Prices can be entered
- Toast notification shows "Settings saved"
- Prices persist after page reload

**Status**: ☐ Pass ☐ Fail

---

### Test 4: Pricing Type Switching

**Objective**: Verify switching between Global and Individual pricing

**Steps**:
1. Enable individual pricing
2. Set prices for 3 items
3. Switch to "Global" pricing type
4. Verify individual inputs disappear
5. Verify global price input appears
6. Switch back to "Individual"
7. Verify individual prices are preserved

**Expected Result**:
- UI updates correctly when switching types
- Individual prices are not lost when switching to Global and back
- No console errors

**Status**: ☐ Pass ☐ Fail

---

### Test 5: Multiple Asset Types

**Objective**: Verify individual pricing works for all asset types

**Steps**:
1. Test individual pricing on Fonts
2. Test individual pricing on Colors
3. Test individual pricing on Images (if available)
4. Test individual pricing on Options (if available)
5. Test individual pricing on Shapes (if available)

**Expected Result**:
- Pricing inputs appear for all asset types
- Prices save correctly for all types
- UI is consistent across types

**Status**: ☐ Pass ☐ Fail

---

### Test 6: Search/Filter Compatibility

**Objective**: Verify pricing inputs work with search/filter

**Steps**:
1. Enable individual pricing for Fonts
2. Use search box to filter fonts (e.g., search "Inter")
3. Verify price input still appears for filtered items
4. Set price for filtered item
5. Clear search
6. Verify price was saved

**Expected Result**:
- Price inputs appear in both filtered and unfiltered views
- Prices save correctly when set in filtered view

**Status**: ☐ Pass ☐ Fail

---

### Test 7: Bulk Actions Compatibility

**Objective**: Verify pricing inputs don't interfere with bulk actions

**Steps**:
1. Enable individual pricing
2. Select multiple items using checkboxes
3. Verify price inputs are still visible
4. Click on a price input
5. Verify item doesn't get selected/deselected

**Expected Result**:
- Price inputs and checkboxes work independently
- Clicking price input doesn't trigger row selection

**Status**: ☐ Pass ☐ Fail

---

### Test 8: Edit/Delete Button Compatibility

**Objective**: Verify pricing inputs don't interfere with item actions

**Steps**:
1. Enable individual pricing
2. Click Edit button on an item
3. Verify rename modal opens
4. Close modal
5. Click Delete button
6. Verify delete confirmation appears

**Expected Result**:
- Edit and Delete buttons work normally
- Price input doesn't block button clicks

**Status**: ☐ Pass ☐ Fail

---

### Test 9: Disable Pricing

**Objective**: Verify pricing can be disabled and re-enabled

**Steps**:
1. Enable individual pricing
2. Set prices for 3 items
3. Uncheck "Enable font pricing"
4. Verify price inputs disappear
5. Re-enable pricing
6. Select "Individual" type
7. Verify prices are preserved

**Expected Result**:
- Price inputs disappear when pricing is disabled
- Prices are preserved when re-enabling

**Status**: ☐ Pass ☐ Fail

---

### Test 10: Negative and Edge Cases

**Objective**: Test edge cases and invalid inputs

**Steps**:
1. Enable individual pricing
2. Try entering negative price (e.g., "-10")
3. Try entering very large number (e.g., "999999999")
4. Try entering decimal with many places (e.g., "10.123456")
5. Try entering non-numeric characters (e.g., "abc")

**Expected Result**:
- Browser validation prevents non-numeric input
- Negative numbers may be allowed (browser default)
- Large numbers and decimals are accepted
- System handles edge cases gracefully

**Status**: ☐ Pass ☐ Fail

---

## Regression Checklist

After any changes to `AssetDetail.tsx`, verify:

- [ ] Pricing checkbox works
- [ ] Pricing type dropdown appears when enabled
- [ ] Individual price inputs appear for all asset types
- [ ] Prices save and persist
- [ ] Switching pricing types preserves data
- [ ] Search/filter doesn't break pricing inputs
- [ ] Edit/Delete buttons still work
- [ ] No console errors
- [ ] UI is responsive and doesn't break layout

## Bug Reporting

If any test fails, report with:
- Test number and name
- Steps to reproduce
- Expected vs actual result
- Browser console errors
- Screenshots if applicable
