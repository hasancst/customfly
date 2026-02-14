# Testing Instructions - AI Add Element Fix

## What Was Fixed
The AI was receiving the product **handle** ("custom-your-iphone-case") instead of the product **ID** ("8232157511714"), causing elements to not save properly.

## How to Test

### 1. Navigate to Designer Page
```
https://custom.duniasantri.com/designer/8232157511714
```

### 2. Open AI Chat
- Click the purple AI button in bottom-right corner
- Verify the header shows: "Product ID: 8232157511714"

### 3. Ask AI to Add Element
Try these commands in Indonesian:
- "tambahkan upload foto"
- "tambahkan text untuk nama"
- "tambahkan monogram"
- "tambahkan gallery"

### 4. Execute Action
- AI will suggest an action
- Click "Setujui & Jalankan" button
- Page will reload automatically after 1 second

### 5. Verify Element Appears
After reload, check:
- ✅ Element appears in "Active Options" section
- ✅ Element is functional (can be used in designer)
- ✅ Element persists after page refresh

## Database Verification (Optional)

If you want to verify in database:

```sql
-- Check config was updated
SELECT "shopifyProductId", "printArea", "enabledTools", "optionAssetId"
FROM "MerchantConfig"
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND "shopifyProductId" = '8232157511714';

-- Should show:
-- printArea: { layers: [...] }  (not empty)
-- enabledTools: ["image"]  (not null)
-- optionAssetId: <uuid>  (not NULL)

-- Check asset was created
SELECT id, type, name, label, "createdAt"
FROM "Asset"
WHERE shop = 'uploadfly-lab.myshopify.com'
  AND type = 'option'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Should show newly created asset with correct type='option'
```

## Expected Behavior

### Before Fix ❌
- AI executes action successfully
- Page reloads
- Element does NOT appear in Active Options
- Database shows empty config

### After Fix ✅
- AI executes action successfully
- Page reloads
- Element APPEARS in Active Options
- Database shows updated config with element

## Troubleshooting

### If element still doesn't appear:

1. **Check browser console** for errors:
   - Press F12 to open DevTools
   - Look for red errors in Console tab

2. **Check productId in AI Chat header**:
   - Should show numeric ID: "8232157511714"
   - NOT handle: "custom-your-iphone-case"

3. **Check backend logs**:
   ```bash
   sudo journalctl -u imcst-backend -f
   ```
   Look for:
   - `[Product Executor] addElement called`
   - `[Product Executor] Config found: YES`
   - `[Product Executor] Asset created: <uuid>`
   - `[Product Executor] Config updated successfully`

4. **Verify backend is running**:
   ```bash
   sudo systemctl status imcst-backend
   ```
   Should show: "Active: active (running)"

## Files Changed
- `frontend/src/components/ai/AIChat.tsx` - Fixed productId extraction
- Frontend rebuilt: `npm run build` (completed)
- Backend restarted: `sudo systemctl restart imcst-backend` (completed)

## Test Results
All 45 backend tests passing ✅

## Next Steps
After confirming the fix works:
1. Test with different element types (text, image, monogram, gallery)
2. Test with different products
3. Remove debug console.log statements if desired
4. Mark issue as resolved

## Support
If you encounter any issues, check:
- `doc/fix-ai-add-element-with-productid-2026-02-14.md` - Detailed fix documentation
- `doc/fix-ai-add-element-not-saving-2026-02-14.md` - Original issue investigation
- Backend logs: `/www/wwwroot/custom.local/backend/logs/`
