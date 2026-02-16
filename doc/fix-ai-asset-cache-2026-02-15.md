# Fix: AI Asset Creation Cache Issue

**Date**: 2026-02-15  
**Status**: ✅ Fixed  
**Type**: Bug Fix

## Problem

User reported that when creating font groups via AI Chat, the new assets didn't appear in the Assets page immediately. The database showed the assets were created successfully, but the frontend didn't display them.

### Root Cause

The backend uses NodeCache with a 10-minute TTL (600 seconds) for asset queries. When the AI created assets through `assetExecutor.js`, it didn't clear the cache, so the frontend continued receiving stale cached data.

**Cache Flow**:
1. Frontend fetches `/imcst_api/assets` → Backend returns cached data
2. AI creates new asset via `assetExecutor.createAsset()` → Asset saved to database
3. Frontend fetches `/imcst_api/assets` again → Backend still returns old cached data (doesn't include new asset)
4. User has to wait up to 10 minutes for cache to expire

## Solution

Implemented a two-part solution combining backend cache invalidation and frontend auto-refresh:

### Part 1: Backend Cache Invalidation

Updated `backend/services/ai/executors/assetExecutor.js` to clear the cache after all asset operations:

1. **Import NodeCache**:
   ```javascript
   import NodeCache from 'node-cache';
   const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
   ```

2. **Clear cache after CREATE**:
   ```javascript
   cache.del(`assets_${shop}_all`);
   cache.del(`assets_${shop}_${assetData.type}`);
   ```

3. **Clear cache after UPDATE**:
   ```javascript
   cache.del(`assets_${shop}_all`);
   cache.del(`assets_${shop}_${currentAsset.type}`);
   ```

4. **Clear cache after DELETE**:
   ```javascript
   cache.del(`assets_${shop}_all`);
   cache.del(`assets_${shop}_${asset.type}`);
   ```

### Part 2: Frontend Auto-Refresh

Implemented custom event system for real-time UI updates:

1. **AI Chat dispatches events** (`frontend/src/components/ai/AIChat.tsx`):
   ```typescript
   // After executing asset actions
   const assetActionTypes = [
       'CREATE_ASSET', 
       'CREATE_COLOR_PALETTE', 
       'CREATE_FONT_GROUP',
       'UPDATE_ASSET',
       'DELETE_ASSET'
   ];
   
   if (assetActionTypes.includes(action.type)) {
       const eventType = action.type.startsWith('CREATE') ? 'ai-asset-created' :
                        action.type.startsWith('UPDATE') ? 'ai-asset-updated' :
                        'ai-asset-deleted';
       
       window.dispatchEvent(new CustomEvent(eventType, { 
           detail: { actionType: action.type, actionId } 
       }));
   }
   ```

2. **Assets page listens for events** (`frontend/src/pages/Assets.tsx`):
   ```typescript
   useEffect(() => {
       const handleAssetChange = () => {
           console.log('[Assets] Detected asset change, refreshing...');
           fetchAssets();
       };

       // Listen for custom events from AI Chat
       window.addEventListener('ai-asset-created', handleAssetChange);
       window.addEventListener('ai-asset-updated', handleAssetChange);
       window.addEventListener('ai-asset-deleted', handleAssetChange);

       // Also refresh when tab becomes visible
       const handleVisibilityChange = () => {
           if (!document.hidden) {
               fetchAssets();
           }
       };
       document.addEventListener('visibilitychange', handleVisibilityChange);

       return () => {
           window.removeEventListener('ai-asset-created', handleAssetChange);
           window.removeEventListener('ai-asset-updated', handleAssetChange);
           window.removeEventListener('ai-asset-deleted', handleAssetChange);
           document.removeEventListener('visibilitychange', handleVisibilityChange);
       };
   }, [fetchAssets]);
   ```

## Benefits

- ✅ **Instant visibility**: New assets appear immediately after AI creates them
- ✅ **No page reload**: Uses custom events instead of full page refresh
- ✅ **Tab awareness**: Auto-refreshes when user returns to the tab
- ✅ **Efficient**: Only refreshes when actual changes occur
- ✅ **Consistent UX**: Same behavior for manual and AI-created assets
- ✅ **Cache performance**: Backend cache still provides performance benefits for reads

## How It Works

1. User asks AI to create a font group
2. AI executes `CREATE_FONT_GROUP` action
3. Backend creates asset and clears cache
4. AI Chat dispatches `ai-asset-created` event
5. Assets page receives event and fetches fresh data
6. New font group appears instantly in the list

## Testing

1. Open Assets page
2. Open AI Chat
3. Ask AI: "create a font group called Test Fonts with Roboto, Arial"
4. AI creates the font group
5. Verify the new group appears immediately without manual refresh

## Files Modified

- `backend/services/ai/executors/assetExecutor.js` - Added cache clearing logic
- `frontend/src/components/ai/AIChat.tsx` - Added event dispatching after asset actions
- `frontend/src/pages/Assets.tsx` - Added event listeners for auto-refresh

## Related Issues

- User query: "saya minta ai creat group baru tapi tidak masuk" (I asked AI to create a new group but it didn't appear)
- User query: "cari jalan supaya setiap create group atau font baru atau add colors dan sebagainya akan tampil setelah create"
- Database verification showed asset was created successfully (ID: f417d24d-0e8e-4275-b912-02323d9dda2f)
- Frontend logs showed successful fetch but didn't include the new asset due to cache

## Technical Notes

- Custom events use `window.dispatchEvent()` for cross-component communication
- Event names: `ai-asset-created`, `ai-asset-updated`, `ai-asset-deleted`
- Visibility API prevents unnecessary fetches when tab is hidden
- Cache instance in `assetExecutor.js` uses same key format as `assets.routes.js`
- No polling required - events are triggered only when changes occur
- Works for all asset types: fonts, colors, gallery, shapes, options
