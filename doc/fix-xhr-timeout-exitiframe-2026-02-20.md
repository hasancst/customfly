# Fix: XHR Request Timed Out & "Redirecting to Shopify..." Loop

**Date**: 2026-02-20  
**Status**: ✅ Fixed  
**Priority**: 🔴 Critical (App unusable)

---

## Symptoms

- Error in browser console: `{"message":"XHR request timed out","name":"Error"}` from `context-slice-metrics` Shopify JS
- Page stuck on "Redirecting to Shopify..." indefinitely
- No progress - app never loads in Shopify admin

## Root Cause

Two related issues:

### Issue 1: `/api/auth` calling `auth.begin()` inside iframe
The `/api/auth` route was calling `shopify.auth.begin()` directly, even when the request came from inside the Shopify admin iframe (`embedded=1` or `host` param present). This caused Shopify to try to load `accounts.shopify.com` inside the iframe, which browsers block due to `X-Frame-Options: deny`.

### Issue 2: `/exitiframe` XHR timeout with App Bridge
The old `/exitiframe` page loaded `@shopify/app-bridge@3` from `unpkg.com` (slow CDN) and used the asynchronous `Redirect.Action.REMOTE` dispatch which goes through Shopify's XHR message-passing infrastructure. When this XHR timed out, the redirect never happened, creating an infinite loop:
```
GET / → 302 → /exitiframe → App Bridge XHR timeout → stuck
```

## Flow of the Bug

```
Browser loads app in Shopify admin iframe
    → GET /?embedded=1&id_token=...
    → ensureInstalledOnShop() finds no valid session
    → Redirects to /exitiframe?redirectUri=/api/auth?shop=...
    → /exitiframe loads App Bridge from unpkg (slow)
    → App Bridge tries XHR to Shopify
    → XHR REQUEST TIMED OUT ❌
    → "Redirecting to Shopify..." stuck forever
```

## Fix Applied

### Fix 1: `/api/auth` route — detect embedded and redirect to exitiframe first
**File**: `backend/server.js`

```javascript
app.get(shopify.config.auth.path, validateShopParam, async (req, res, next) => {
    const { shop, host, embedded } = req.query;

    // If embedded in iframe, must break out first before starting OAuth
    if (embedded === '1' || host) {
        const authUrl = `https://${shop}/admin/oauth/authorize?...`;
        return res.redirect(`/exitiframe?redirectUri=${authUrl}&...`);
    }

    // Non-embedded: let library handle
    return shopify.auth.begin()(req, res, next);
});
```

### Fix 2: `/exitiframe` — use `window.top.location.href` directly
**File**: `backend/server.js`

Key changes:
1. **Primary method**: `window.top.location.href = REDIRECT_URI` — direct, synchronous, no XHR needed
2. **CDN change**: Load App Bridge from `cdn.shopify.com` (faster, more reliable) instead of `unpkg.com`
3. **Proper JSON escaping**: Use `JSON.stringify()` for variables instead of template literals (prevents XSS)
4. **Manual fallback button**: "Click here if not redirected" anchor tag as last resort
5. **No App Bridge dependency**: App Bridge is only used as a final fallback, not primary

## Files Modified

- `backend/server.js` — `/api/auth` route + `/exitiframe` handler

## Testing

After restart, the app should:
1. Load correctly in Shopify admin without the XHR timeout
2. If auth is needed, properly break out of iframe and complete OAuth in top-level window
3. Return to the app after OAuth completes

## Related Documentation

- `doc/troubleshooting_auth.md` - Original auth troubleshooting guide
- `doc/Shopify.md` - Shopify integration overview
