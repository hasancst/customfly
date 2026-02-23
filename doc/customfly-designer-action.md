# Customfly Designer Action - More Actions Button

**Date**: 2026-02-22  
**Status**: ✅ Created (Needs Deployment)

## Overview

Menambahkan action "Customfly Designer" di More actions button pada Shopify product detail page. Ketika diklik, akan membuka product di Customfly Designer.

## What Was Created

### 1. Admin Action Extension
**Location**: `extensions/customfly-designer-action/`

**Files Created**:
- `shopify.extension.toml` - Extension configuration
- `src/index.jsx` - Action implementation
- `package.json` - Dependencies

### 2. Extension Configuration

**File**: `extensions/customfly-designer-action/shopify.extension.toml`

```toml
api_version = "2024-10"

[[extensions]]
type = "admin_action"
name = "Customfly Designer"
handle = "customfly-designer-action"

[[extensions.targeting]]
target = "admin.product-details.more-actions"
```

**Key Points**:
- Type: `admin_action` - Adds action to Shopify admin
- Target: `admin.product-details.more-actions` - Appears in More actions dropdown
- Name: "Customfly Designer" - Label shown in menu

### 3. Action Implementation

**File**: `extensions/customfly-designer-action/src/index.jsx`

```javascript
import { extend, AdminAction } from '@shopify/ui-extensions/admin';

extend('admin.product-details.more-actions', async (root, api) => {
  const { data } = api;
  
  // Get product ID
  const productId = data.selected[0]?.id;
  const numericId = productId.split('/').pop();
  
  // Create action
  const action = root.createComponent(AdminAction, {
    title: 'Customfly Designer',
    onPress: async () => {
      const shop = api.shop.myshopifyDomain;
      const designerUrl = `https://${shop}/admin/apps/customfly-hasan-10/designer/${numericId}`;
      await api.navigation.navigate(designerUrl);
    },
  });

  root.appendChild(action);
});
```

**How It Works**:
1. Extension listens to product detail page
2. Gets current product ID from context
3. Creates "Customfly Designer" action button
4. On click: Navigates to designer page with product ID

## Deployment Steps

### Step 1: Install Dependencies

```bash
cd extensions/customfly-designer-action
npm install
cd ../..
```

### Step 2: Deploy Extension

```bash
# Deploy to Shopify
shopify app deploy

# Or if using specific extension
shopify app extension push
```

### Step 3: Verify Deployment

1. Go to Shopify Partners Dashboard
2. Open your app
3. Check Extensions section
4. Verify "Customfly Designer" action is listed

### Step 4: Test

1. Go to Shopify Admin
2. Open any product detail page
3. Click "More actions" button (three dots)
4. Look for "Customfly Designer" option
5. Click it - should open product in designer

## User Experience

### Before
- User needs to go to app dashboard
- Find product in list
- Click to open designer
- Multiple steps required

### After
- User is already on product page
- Click "More actions"
- Click "Customfly Designer"
- Instantly opens in designer
- One-click access!

## Visual Location

```
Product Detail Page
├── Title: "Custom Your Iphone Cases"
├── Status: Active
├── Actions Bar
│   ├── [Duplicate]
│   ├── [View]
│   ├── [Share ▼]
│   └── [More actions ▼]  ← Extension adds here
│       ├── Archive product
│       ├── Delete product
│       ├── Customfly : Enable Customizer
│       ├── Edit on Printful
│       ├── Edit Product Options
│       ├── Add Customization Options
│       ├── Edit campaign with Teeinblue
│       ├── Enable upload field
│       ├── Add Customization Options
│       └── ✨ Customfly Designer  ← NEW!
```

## Technical Details

### Extension Type: Admin Action

Admin Actions allow apps to add custom actions to Shopify admin UI:
- Appear in contextual menus
- Access to current page data
- Can navigate to app pages
- Native Shopify UI integration

### Targeting

```javascript
target = "admin.product-details.more-actions"
```

Available targets:
- `admin.product-details.more-actions` - Product page dropdown
- `admin.product-index.selection-action` - Bulk actions
- `admin.order-details.more-actions` - Order page dropdown
- And more...

### Navigation

```javascript
await api.navigation.navigate(designerUrl);
```

Opens designer in app context:
- Stays within Shopify admin
- Maintains session
- Embedded app experience

## Benefits

1. ✅ **Quick Access** - One click from product page
2. ✅ **Contextual** - Already on the product you want to edit
3. ✅ **Native UI** - Integrated with Shopify admin
4. ✅ **Professional** - Follows Shopify UX patterns
5. ✅ **Efficient** - No need to navigate through app

## Troubleshooting

### Action Not Appearing

**Check**:
1. Extension deployed successfully
2. App has required permissions
3. Product page fully loaded
4. Browser cache cleared

**Solution**:
```bash
# Redeploy extension
shopify app deploy

# Check deployment status
shopify app info
```

### Navigation Not Working

**Check**:
1. Designer URL is correct
2. Product ID is valid
3. App is embedded properly

**Debug**:
```javascript
console.log('Product ID:', productId);
console.log('Designer URL:', designerUrl);
```

### Extension Not Loading

**Check**:
1. Dependencies installed
2. Build successful
3. Extension registered in Partners

**Solution**:
```bash
cd extensions/customfly-designer-action
npm install
npm run build
```

## Configuration

### Change Action Label

Edit `shopify.extension.toml`:
```toml
name = "Your Custom Label"
```

### Change Target Location

Edit `shopify.extension.toml`:
```toml
[[extensions.targeting]]
target = "admin.product-index.selection-action"  # Bulk actions
```

### Add Icon

Edit `src/index.jsx`:
```javascript
const action = root.createComponent(AdminAction, {
  title: 'Customfly Designer',
  icon: 'PaintBrushMajor',  // Shopify Polaris icon
  onPress: async () => { ... },
});
```

## Files Structure

```
extensions/customfly-designer-action/
├── shopify.extension.toml    # Extension config
├── package.json               # Dependencies
└── src/
    └── index.jsx             # Action implementation
```

## Dependencies

```json
{
  "@shopify/ui-extensions": "^2024.10.0",
  "@shopify/ui-extensions-react": "^2024.10.0",
  "react": "^18.2.0"
}
```

## Next Steps

1. **Deploy Extension**:
   ```bash
   shopify app deploy
   ```

2. **Test in Development**:
   ```bash
   shopify app dev
   ```

3. **Verify in Admin**:
   - Open product page
   - Check More actions menu
   - Test navigation

4. **Document for Users**:
   - Add to user guide
   - Create tutorial video
   - Update help docs

## Alternative Approaches

### 1. Product Index Bulk Action
Add to product list bulk actions:
```toml
target = "admin.product-index.selection-action"
```

### 2. Product Card Action
Add to product cards:
```toml
target = "admin.product-index.card-action"
```

### 3. Quick Actions
Add to quick actions bar:
```toml
target = "admin.product-details.action"
```

## Related Documentation

- [Shopify Admin Actions](https://shopify.dev/docs/apps/build/admin-actions)
- [UI Extensions](https://shopify.dev/docs/api/admin-extensions)
- [Extension Targets](https://shopify.dev/docs/api/admin-extensions/extension-targets)

## Notes

- Extension requires Shopify CLI for deployment
- Must be deployed to appear in admin
- Works with embedded apps only
- Respects app permissions and scopes
- Can be customized per merchant if needed

---

**Status**: Ready for deployment
**Next Action**: Run `shopify app deploy`
