# Troubleshooting: Theme Extension Not Loading

**Date**: 2026-02-24  
**Issue**: Direct customize or modal not appearing on product page after theme change

## Common Causes

### 1. Product Not Configured in Customfly

**Symptom**: Nothing appears on product page, no button, no canvas

**Check**:
```bash
# In backend folder
node check_product_by_handle.cjs
```

**Solution**: 
- Go to Customfly admin → Products
- Click on the product
- Configure it (add base image, set layout, etc.)
- Save

### 2. Theme Extension Not Enabled

**Check**:
1. Go to Shopify Admin → Online Store → Themes
2. Click "Customize" on active theme
3. Check if "Product Customizer" app embed is enabled
4. Check if product page has Customfly blocks

**Solution**:
- Enable app embed in theme settings
- Add Customfly blocks to product template

### 3. Wrong Designer Layout Setting

**Symptom**: Button appears but nothing happens when clicked

**Check**: Product config `designerLayout` value
- `inline` = Canvas appears directly on page
- `modal` = Opens in modal popup
- `redirect` = Opens in new page/tab

**Solution**:
- Go to product in Customfly admin
- Change Designer Layout setting
- Save and test

### 4. JavaScript Errors

**Check**: Browser console (F12 → Console tab)

**Common Errors**:
- `Failed to load resource: loader.js` → Backend down or CORS issue
- `Cannot read property of undefined` → Config missing required fields
- `CORS error` → Domain not whitelisted

**Solution**:
- Check backend is running: `sudo systemctl status imcst-backend`
- Check loader.js accessible: `curl https://custom.duniasantri.com/imcst_public_api/loader.js`
- Check browser console for specific error

### 5. Cache Issues

**Symptom**: Changes not reflecting on storefront

**Solution**:
1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear Shopify cache: Theme → Actions → Clear cache
3. Clear browser cache
4. Try incognito/private window

### 6. Product ID Mismatch

**Symptom**: Config exists but not loading for specific product

**Check**: Get product ID from Shopify admin URL
```
https://admin.shopify.com/store/makeitforme/products/[PRODUCT_ID]
```

Then check if config exists:
```sql
SELECT * FROM "MerchantConfig" 
WHERE shop = 'makeitforme.myshopify.com' 
AND "shopifyProductId" = '[PRODUCT_ID]';
```

**Solution**: Import product via More Actions → Customfly Designer

## Step-by-Step Debugging

### Step 1: Verify Theme Extension is Active

1. Go to Shopify Admin → Apps
2. Find "Customfly" app
3. Check status: Should be "Installed"
4. Go to Online Store → Themes → Customize
5. Check App Embeds section → "Product Customizer" should be enabled

### Step 2: Check Product Configuration

1. Go to Customfly admin → Products
2. Search for "customify-iphone"
3. If not found: Product not configured yet
4. If found: Check settings:
   - Designer Layout
   - Button Text
   - Base Image
   - Canvas settings

### Step 3: Test on Storefront

1. Open product page in incognito window
2. Open browser console (F12)
3. Look for:
   - `[IMCST]` log messages
   - Any red errors
   - Network tab: Check if loader.js loads successfully

### Step 4: Check Backend Logs

```bash
# Check if backend is running
sudo systemctl status imcst-backend

# View recent logs
sudo journalctl -u imcst-backend -n 100 --no-pager

# Check for errors
sudo journalctl -u imcst-backend | grep -i error
```

### Step 5: Verify Public API

```bash
# Test loader script
curl https://custom.duniasantri.com/imcst_public_api/loader.js

# Test config endpoint (replace PRODUCT_ID)
curl "https://custom.duniasantri.com/imcst_public_api/public/config/PRODUCT_ID?shop=makeitforme.myshopify.com"
```

## Quick Fixes

### Fix 1: Re-import Product

1. Go to Shopify Admin → Products
2. Open the product
3. Click More Actions → Customfly Designer
4. This will auto-import and configure the product

### Fix 2: Redeploy Theme Extension

```bash
npx @shopify/cli app deploy --force
```

### Fix 3: Clear All Caches

```bash
# Backend cache
node backend/clear_all_cache.cjs

# Restart backend
sudo systemctl restart imcst-backend
```

### Fix 4: Check Product in Different Theme

1. Duplicate current theme
2. Test product in duplicated theme
3. If works: Issue with original theme customization
4. If doesn't work: Issue with product config

## Expected Behavior

### For `designerLayout: 'inline'`
- Canvas appears directly on product page
- No button needed
- Design tools visible immediately

### For `designerLayout: 'modal'`
- "Design It" button appears
- Clicking opens modal with canvas
- Modal overlays product page

### For `designerLayout: 'redirect'`
- "Design It" button appears
- Clicking opens new tab/window
- Full designer page loads

## Related Files

- `extensions/product-customizer/blocks/*.liquid` - Theme blocks
- `extensions/product-customizer/assets/core.js` - Core functionality
- `backend/routes/public.routes.js` - Public API endpoints
- `frontend/public/loader.js` - Storefront loader

## Getting Product ID

From Shopify Admin URL:
```
https://admin.shopify.com/store/makeitforme/products/10892570132639
                                                        ^^^^^^^^^^^^^^
                                                        This is the ID
```

From storefront (browser console):
```javascript
// On product page, run:
console.log(window.ShopifyAnalytics.meta.product.id);
```

## Contact Support

If issue persists after trying all steps:
1. Provide product ID
2. Provide browser console screenshot
3. Provide backend logs
4. Describe expected vs actual behavior

---

**Last Updated**: 2026-02-24
