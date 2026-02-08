# Troubleshooting: accounts.shopify.com Refused to Connect

## 🚨 Masalah (The Issue)
Error: `accounts.shopify.com refused to connect` atau `Refused to display '...' in a frame because it set 'X-Frame-Options' to 'deny'`.

Ini terjadi karena Shopify mencoba melakukan redirect OAuth (`/api/auth`) di dalam iframe. Browser memblokir hal ini demi keamanan. Ini biasanya terjadi setelah uninstall/reinstall atau saat session database hilang tetapi App Bridge di frontend masih memiliki token yang expired.

## 🛠 Solusi (The Solution)

Untuk aplikasi embedded, kita harus menggunakan pola **Breakout Iframe** menggunakan rute `/exitiframe`.

### 1. Backend Handler (`server.js`)
Jangan hanya menggunakan `shopify.auth.begin()`. Gunakan handler kustom yang mendeteksi jika request berasal dari iframe.

```javascript
app.get(shopify.config.auth.path, validateShopParam, async (req, res, next) => {
    const { shop, host, embedded } = req.query;
    
    // DETEKSI EMBEDDED
    if (embedded === '1' || host) {
        // Buat URL OAuth secara manual
        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SCOPES}&redirect_uri=${encodeURIComponent(process.env.SHOPIFY_APP_URL + '/api/auth/callback')}`;
        
        // Redirect ke halaman exitiframe kita
        return res.redirect(`/exitiframe?redirectUri=${encodeURIComponent(authUrl)}&shop=${shop}&host=${host || ''}`);
    }
    
    // Jika bukan embedded (tab baru), biarkan library menangani
    return shopify.auth.begin()(req, res, next);
});
```

### 2. Exit Iframe Route (`server.js`)
Pastikan rute `/exitiframe` melayani HTML yang menginisialisasi App Bridge dan melakukan redirect window teratas.

```javascript
app.get("/exitiframe", (req, res) => {
    const { redirectUri, host } = req.query;
    const apiKey = process.env.SHOPIFY_API_KEY;

    res.status(200).set("Content-Type", "text/html").send(`
        <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                var AppBridge = window['app-bridge'];
                var createApp = AppBridge.default;
                var Redirect = AppBridge.actions.Redirect;
                var app = createApp({ apiKey: "${apiKey}", host: "${host}", forceRedirect: true });
                var redirect = Redirect.create(app);
                redirect.dispatch(Redirect.Action.REMOTE, "${redirectUri}");
            });
        </script>
    `);
});
```

### 3. Frontend Redirect Logic (`useAuthenticatedFetch.ts`)
Frontend harus memastikan parameter `host` dan `embedded=1` dikirim saat melakukan redirect manual ke `/api/auth`.

```typescript
// Di dalam useAuthenticatedFetch
if (response.status === 403) {
    const currentParams = new URLSearchParams(window.location.search);
    const host = currentParams.get('host');
    const shop = currentParams.get('shop');
    
    // PASTI-KAN parameter host dan embedded ada!
    let authUrl = `/api/auth?embedded=1`;
    if (shop) authUrl += `&shop=${shop}`;
    if (host) authUrl += `&host=${host}`;
    
    window.location.href = authUrl;
}
```

### 4. Content Security Policy (CSP)
Update CSP di backend agar memperbolehkan framing dari domain Shopify.

```javascript
app.use((req, res, next) => {
    const existingCsp = res.getHeader('Content-Security-Policy');
    if (existingCsp) {
        let newCsp = existingCsp;
        newCsp = newCsp.replace("frame-ancestors", "frame-ancestors https://*.shopify.com https://*.myshopify.com https://admin.shopify.com");
        res.setHeader('Content-Security-Policy', newCsp);
    }
    next();
});
```

## 📝 Catatan Penting
- Selalu daftarkan `https://your-domain.com/exitiframe` di **Shopify Partner Dashboard > App Setup > Allowed redirection URL(s)**.
- Pastikan `isEmbeddedApp: true` di konfigurasi `shopifyApp`.
- Jika masih error, pastikan browser tidak memblokir third-party cookies (meskipun pola `/exitiframe` ini mendesain untuk melewati pembatasan tersebut).
