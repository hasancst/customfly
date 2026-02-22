# Printful Connection Status - Session Issue Fix

## Problem
Setelah reload halaman Settings, status Printful connection menunjukkan "Not Connected" meskipun API key sudah tersimpan di database.

## Root Cause Analysis

### 1. Data Tersimpan di Database ✅
```sql
SELECT * FROM "PrintfulConnection" WHERE shop = 'uploadfly-lab.myshopify.com';
-- Result: connected = true, storeId = 13729403
```
Data ada dan benar di database.

### 2. Backend Endpoint Bekerja ✅
Test langsung ke database berhasil:
```javascript
const connection = await prisma.printfulConnection.findUnique({
  where: { shop: 'uploadfly-lab.myshopify.com' }
});
// Result: { connected: true, storeId: '13729403', ... }
```

### 3. API Endpoint Issue ❌
```bash
curl http://localhost:3011/imcst_api/printful/status
# Result: Found. Redirecting to /api/auth?shop=undefined
```

Endpoint redirect ke `/api/auth` karena tidak ada session yang valid.

### 4. Frontend Error ❌
```
Failed to execute 'json' on 'Response': Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

Frontend menerima HTML (halaman redirect) bukan JSON response.

## Root Cause

**Session Expiration atau Invalid Session Context**

Ketika user reload halaman:
1. Browser membuat request ke `/imcst_api/printful/status`
2. Middleware `shopify.validateAuthenticatedSession()` check session
3. Session tidak valid atau expired
4. Middleware redirect ke `/api/auth`
5. Frontend menerima HTML redirect page
6. JSON parse gagal
7. Status tetap "Not Connected"

## Solution

### Option 1: Better Error Handling (IMPLEMENTED)

Tambahkan try-catch untuk JSON parsing di frontend:

```typescript
if (printfulResponse.ok) {
    try {
        const data = await printfulResponse.json();
        setPrintfulConnected(data.connected || false);
        setPrintfulStoreId(data.storeId || '');
    } catch (jsonError) {
        console.error('[Settings] JSON parse error:', jsonError);
        // Handle non-JSON response (redirect, HTML, etc)
    }
}
```

**Benefits:**
- Prevents app crash
- Shows clear error in console
- User can see what went wrong

### Option 2: Session Refresh (RECOMMENDED)

Tambahkan logic untuk refresh session jika expired:

```typescript
const fetchConfig = useCallback(async () => {
    try {
        const printfulResponse = await fetch('/imcst_api/printful/status');
        
        // Check if redirected to auth
        if (printfulResponse.redirected || !printfulResponse.ok) {
            console.log('[Settings] Session expired, refreshing...');
            // Trigger Shopify App Bridge to refresh session
            window.location.reload();
            return;
        }
        
        const data = await printfulResponse.json();
        setPrintfulConnected(data.connected || false);
    } catch (error) {
        console.error('Failed to fetch:', error);
    }
}, [fetch]);
```

### Option 3: Increase Session TTL

Update Shopify session configuration:

```javascript
// backend/config/shopify.js
export const shopify = shopifyApp({
    // ...
    sessionStorage: loggingStorage,
    useOnlineTokens: false, // Use offline tokens (longer lived)
    // ...
});
```

**Note:** Already using offline tokens, so session should be long-lived.

### Option 4: Add Session Check Endpoint

Create dedicated endpoint that doesn't require full auth:

```javascript
// backend/routes/printful.routes.js
router.get('/status-public/:shop', async (req, res) => {
    try {
        const { shop } = req.params;
        
        // Validate shop parameter
        if (!shop || !shop.includes('.myshopify.com')) {
            return res.status(400).json({ error: 'Invalid shop' });
        }
        
        const connection = await prisma.printfulConnection.findUnique({
            where: { shop },
            select: { connected: true, storeId: true }
        });
        
        res.json({
            connected: connection?.connected || false,
            storeId: connection?.storeId || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});
```

**Cons:** Security risk - exposes shop data without auth.

## Implemented Solution

**Option 1: Better Error Handling**

Changes made to `frontend/src/pages/Settings.tsx`:

1. **Wrap JSON parsing in try-catch**
2. **Log errors clearly**
3. **Handle non-JSON responses gracefully**

```typescript
if (printfulResponse.ok) {
    try {
        const data = await printfulResponse.json();
        console.log('[Settings] Printful status response:', data);
        setPrintfulConnected(data.connected || false);
        setPrintfulStoreId(data.storeId || '');
    } catch (jsonError) {
        console.error('[Settings] Printful status JSON parse error:', jsonError);
        // Response was not JSON (probably redirect/HTML)
        // Keep status as "Not Connected"
    }
}
```

## Testing

### Test Case 1: Fresh Session
1. Login to Shopify Admin
2. Open app
3. Go to Settings
4. Status should show "Connected"

### Test Case 2: After Reload
1. Reload Settings page
2. Check console for logs
3. Status should show "Connected"
4. No JSON parse errors

### Test Case 3: Expired Session
1. Wait for session to expire (or clear cookies)
2. Reload Settings page
3. Should see redirect or re-auth
4. After re-auth, status shows "Connected"

## Debugging

### Check Session in Browser
```javascript
// In browser console
fetch('/imcst_api/printful/status')
    .then(r => r.json())
    .then(console.log)
    .catch(console.error);
```

### Check Backend Logs
```bash
sudo journalctl -u imcst-backend.service -f | grep "Printful"
```

### Check Database
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.printfulConnection.findMany().then(console.log);
"
```

## Prevention

### 1. Use Offline Tokens
Already implemented - offline tokens don't expire as quickly.

### 2. Handle Session Expiration Gracefully
Frontend should detect session expiration and trigger re-auth.

### 3. Add Session Monitoring
Log session status in backend:
```javascript
router.use((req, res, next) => {
    const session = res.locals.shopify?.session;
    if (session) {
        console.log('[Session] Valid for shop:', session.shop);
    } else {
        console.log('[Session] No valid session');
    }
    next();
});
```

## Related Issues

- Session expiration after idle time
- Shopify App Bridge session management
- Embedded app authentication flow

## Next Steps

1. ✅ Implement better error handling
2. ⏳ Monitor session expiration patterns
3. ⏳ Consider adding session refresh logic
4. ⏳ Add user-friendly message when session expires

---

**Date:** February 21, 2026
**Status:** Partially Fixed (Error handling improved)
**Files Changed:** 
- `frontend/src/pages/Settings.tsx`
- `backend/routes/printful.routes.js` (added logging)
