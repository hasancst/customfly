# Fix: Delete Asset 500 Error - 2026-02-15

## Problem
When trying to delete an asset via AI Chat, the action execution failed with 500 Internal Server Error. The error was not being logged properly, making it difficult to debug.

## Root Causes

### 1. Missing Error Handling
The execute endpoint in `ai.routes.js` did not have try-catch around the action execution logic, so errors were not being caught and logged properly.

### 2. AI Generating Placeholder IDs
The AI was generating placeholder strings like `"uuid_for_customfly_default_font_group"` instead of using actual asset names or UUIDs from the context.

Example of problematic payload:
```json
{
  "type": "DELETE_ASSET",
  "payload": {
    "assetId": "uuid_for_customfly_default_font_group"
  }
}
```

The `deleteAsset()` method checks if the string is a valid UUID format, and if not, tries to find by name. But the placeholder string didn't match any asset name in the database.

## Solution

### 1. Added Error Handling to Execute Endpoint
Wrapped all action execution logic in try-catch block in `backend/routes/ai.routes.js`:

```javascript
try {
    if (output.type === 'UPDATE_CONFIG') {
        // ... all action handlers
    }
} catch (executionError) {
    logger.error('[AI Action] Execution failed', { 
        shop, 
        actionId: id, 
        type: output.type,
        error: executionError.message,
        stack: executionError.stack,
        payload: output.payload
    });
    return res.status(500).json({ 
        error: `Failed to execute action: ${executionError.message}`,
        details: executionError.message
    });
}
```

### 2. Updated AI System Prompt
Modified the DELETE_ASSET instruction in `backend/services/ai/core/aiService.js` to tell the AI to use exact asset names from context:

**Before:**
```javascript
- DELETE_ASSET: Delete an asset
  Example: { "type": "DELETE_ASSET", "payload": { "assetId": "uuid" } }
```

**After:**
```javascript
- DELETE_ASSET: Delete an asset (use exact asset name from context)
  Example: { "type": "DELETE_ASSET", "payload": { "assetId": "Customfly Default Font" } }
  IMPORTANT: Use the exact asset name as shown in the context, NOT a placeholder like "uuid_for_..."
```

## How It Works Now

1. AI receives asset list in context with exact names:
   - "Customfly Monogram"
   - "Customfly Font"
   - "Customfly Default Font"
   - etc.

2. When user asks to delete an asset, AI generates action with exact name:
   ```json
   {
     "type": "DELETE_ASSET",
     "payload": {
       "assetId": "Customfly Default Font"
     }
   }
   ```

3. `assetExecutor.deleteAsset()` receives the name and:
   - First tries to find by UUID (if format matches)
   - If not found, tries to find by name
   - Deletes the asset and clears cache

4. If any error occurs, it's now properly logged with full details

## Testing

To test the fix:

1. Go to Assets page in the app
2. Ask AI: "Delete the Customfly Default Font group"
3. AI should generate DELETE_ASSET action with exact asset name
4. Execute the action - should succeed
5. If error occurs, check backend logs for detailed error message

## Files Modified

- `backend/routes/ai.routes.js` - Added try-catch error handling
- `backend/services/ai/core/aiService.js` - Updated DELETE_ASSET instruction
- `backend/services/ai/executors/assetExecutor.js` - Already had name-based lookup (no changes needed)

## Related Features

- Asset deletion also works from manual UI (delete button in Assets page)
- When deleting a group, all items within it are deleted (single database record)
- Cache is automatically cleared after deletion (30 second TTL)
- Frontend auto-refreshes via custom event system

## Status
✅ Fixed and deployed - Backend restarted at 14:53 UTC

## Current Assets in Database
As of 2026-02-15 14:53 UTC:
1. Customfly Monogram (font) - 10 monogram fonts
2. Customfly Colors (color) - Color palette
3. Customfly Font (font) - 20 Google Fonts
4. Customfly Default Font (font) - 10 Google Fonts
5. Google Fonts Populer (font) - 20 Google Fonts
6. Customfly Default (font) - 10 Google Fonts
7. Customfly Default Fonts (font) - 10 system fonts

## Next Steps for User

The fix is complete. You can now test:

1. **Via AI Chat:**
   - Go to Assets page
   - Ask: "Delete the Customfly Default Font group"
   - AI will generate action with exact asset name
   - Execute the action
   - Asset should be deleted and page auto-refreshes

2. **Via Manual UI:**
   - Go to Assets page
   - Click delete icon on any asset
   - Asset is deleted immediately
   - Page updates automatically

If you encounter any errors, they will now be properly logged in backend logs with full details.
