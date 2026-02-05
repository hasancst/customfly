# Individual Pricing Feature

## Overview

The individual pricing feature allows administrators to set specific prices for each item within an asset group (fonts, colors, images, options, shapes). This provides granular control over pricing compared to the global pricing model.

## Feature Location

**Admin Panel**: Asset Detail Page → Pricing Settings (Left Sidebar)

## How to Use

### Enabling Individual Pricing

1. Navigate to any asset group (e.g., Fonts, Colors, Images)
2. In the left sidebar, locate **Pricing Settings**
3. Check the **"Enable [asset type] pricing"** checkbox
4. Select **"Individual"** from the **Pricing Type** dropdown
5. Price input fields will appear next to each item in the list

### Setting Individual Prices

- Each item in the asset group will display a price input field (with `$` prefix)
- Enter the desired price for each item
- Prices are saved automatically when changed
- Default value is `$0` for items without a set price

## Technical Implementation

### Components Modified

- **File**: `frontend/src/pages/AssetDetail.tsx`
- **Lines**: 998-1011 (first render block), 1149-1162 (second render block)

### Configuration Storage

Individual prices are stored in the asset configuration object:

```typescript
asset.config = {
  enablePricing: boolean,
  pricingType: 'single' | 'group',
  fontPrices: {
    [itemName: string]: string  // Price value as string
  }
}
```

> **Note**: Despite the name `fontPrices`, this field is used for all asset types (fonts, colors, images, options, shapes).

### Rendering Logic

The pricing input is conditionally rendered based on:

```typescript
asset.config?.enablePricing && 
(asset.config?.pricingType === 'single' || asset.config?.pricingType === 'individual')
```

This condition supports both `'single'` and `'individual'` values for backward compatibility.

## UI Structure

The pricing input appears in two different rendering contexts within `AssetDetail.tsx`:

1. **Compact View** (lines 998-1011): Used for filtered/search results
2. **Full View** (lines 1149-1162): Used for paginated resource lists

Both views use the same pricing logic and component structure.

## Regression Testing

### Test Cases

#### TC-1: Enable Individual Pricing
1. Open any asset group
2. Enable pricing checkbox
3. Select "Individual" pricing type
4. **Expected**: Price inputs appear next to each item

#### TC-2: Set and Save Individual Prices
1. Enable individual pricing
2. Enter different prices for 3+ items
3. Save and reload the page
4. **Expected**: All prices persist correctly

#### TC-3: Switch Between Pricing Types
1. Enable individual pricing and set prices
2. Switch to "Global" pricing type
3. Switch back to "Individual"
4. **Expected**: Individual prices are preserved

#### TC-4: Disable Pricing
1. Set individual prices
2. Uncheck "Enable pricing"
3. Re-enable pricing
4. **Expected**: Prices are preserved

#### TC-5: Multiple Asset Types
1. Test individual pricing on:
   - Fonts
   - Colors
   - Images
   - Options
   - Shapes
2. **Expected**: Pricing works consistently across all types

### Known Limitations

- The storage field is named `fontPrices` but is used for all asset types
- Pricing inputs use the item `name` as the key, so renaming an item will reset its price
- No validation for negative prices or non-numeric input (handled by browser `type="number"`)

## Future Enhancements

- Rename `fontPrices` to `itemPrices` for clarity
- Add bulk pricing actions (e.g., "Set all to $X")
- Add price validation and formatting
- Support for currency selection
- Price history/audit trail
