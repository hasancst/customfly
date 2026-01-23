# Shopify App Configuration Checklist

## Partner Dashboard Settings Required

### App Setup
1. **App URL**: `https://custom.duniasantri.com`
2. **Allowed redirection URL(s)**:
   - `https://custom.duniasantri.com/api/auth`
   - `https://custom.duniasantri.com/api/auth/callback`
   - `https://custom.duniasantri.com/exitiframe`

### App Distribution
- **Distribution**: Custom app (for specific stores)

### Important Notes
- The app MUST be configured as an **embedded app** in the Partner Dashboard
- Session tokens should be enabled (this is default for embedded apps)
- The app should NOT use cookies for session management in embedded mode

## Current Issue
The app is stuck in an OAuth redirect loop because:
1. OAuth completes successfully
2. The library tries to set a session cookie
3. Browser blocks the cookie (SameSite issue)
4. App thinks user is not authenticated
5. Redirects back to OAuth (loop)

## Solution
Need to verify Partner Dashboard settings and potentially switch to token exchange flow.
