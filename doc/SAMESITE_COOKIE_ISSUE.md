# Shopify Embedded App - SameSite Cookie Issue Resolution

## Current Situation
The app is experiencing a persistent `same_site_cookies` OAuth error because:
1. The `@shopify/shopify-app-express` library (v6.x) still has cookie dependencies even with modern settings
2. Browsers block third-party cookies in iframes (Shopify Admin is an iframe context)
3. OAuth completes successfully but session storage fails, creating a redirect loop

## Root Cause
The library's OAuth flow tries to set cookies after the callback, which fails in the embedded context, causing:
```
/api/auth → Shopify OAuth → /api/auth/callback → (tries to set cookie) → FAILS → redirects back to /api/auth → LOOP
```

## Solutions (in order of recommendation)

### Option 1: Use Shopify CLI for Development (RECOMMENDED)
The Shopify CLI handles all the OAuth and tunneling automatically:

```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/app

# In your project root
shopify app dev
```

This will:
- Create a secure tunnel automatically
- Handle OAuth without cookie issues  
- Provide hot reload for development
- Work perfectly with embedded apps

### Option 2: Upgrade to Latest Shopify Libraries
The issue may be resolved in newer versions:

```bash
cd backend
npm install @shopify/shopify-app-express@latest @shopify/shopify-api@latest --legacy-peer-deps
```

**Note**: This requires Node.js 20+, which you currently don't have (you're on v18/v22 mix).

### Option 3: Implement Custom Token Exchange (Complex)
Completely bypass the OAuth flow and use Shopify's token exchange:
- Requires significant backend rewrite
- Use `@shopify/shopify-api` token exchange methods
- Handle session management manually
- Estimated time: 4-6 hours

### Option 4: Use Non-Embedded App (Temporary Workaround)
For testing purposes only:
1. In Partner Dashboard, **uncheck** "Embed app in Shopify admin"
2. App will open in a new tab instead of iframe
3. Cookies will work (not in third-party context)
4. **Downside**: Not the intended UX for embedded apps

## Recommended Next Steps

1. **Immediate**: Try Option 4 to verify the rest of your app works
2. **Short-term**: Use Option 1 (Shopify CLI) for development
3. **Long-term**: Plan migration to latest Shopify libraries when Node 20+ is available

## Current Backend Status
- ✅ Server running on port 3011
- ✅ Node v22.11.0
- ✅ Database connected (PostgreSQL)
- ✅ API routes configured with token validation
- ❌ OAuth flow blocked by SameSite cookie issue

## Files Modified
- `/www/wwwroot/custom.local/backend/server.js` - Token-based auth middleware
- `/www/wwwroot/custom.local/frontend/src/pages/ExitIframe.tsx` - OAuth breakout handler
- `/www/wwwroot/custom.local/frontend/src/App.tsx` - Routing with exitiframe path

## Partner Dashboard Configuration
- App URL: `https://custom.duniasantri.com`
- Redirect URLs: `https://custom.duniasantri.com/api/auth/callback`
- Embed in Shopify admin: ✓ Enabled
- Legacy install flow: ✗ Disabled (correct)
