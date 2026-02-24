import "dotenv/config";
import express from "express";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import morgan from "morgan";
import compression from "compression";

// Modular Configs
import { shopify } from "./config/shopify.js";

// Modular Routes
import uploadRoutes from "./routes/upload.routes.js";
import productRoutes from "./routes/products.routes.js";
import designRoutes from "./routes/designs.routes.js";
import designPublicRoutes from "./routes/public.designs.routes.js";
import assetRoutes from "./routes/assets.routes.js";
import assetPublicRoutes from "./routes/assets.public.routes.js";
import promoRoutes from "./routes/promo.routes.js";
import webhookRoutes from "./routes/webhooks.routes.js";
import publicRoutes from "./routes/public.routes.js";
import proxyRoutes from "./routes/proxy.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import templateRoutes from "./routes/templates.routes.js";
import printfulRoutes from "./routes/printful.routes.js";
import seedRoutes from "./routes/seed.routes.js";

// Middleware
import { validateShopParam } from "./middleware/auth.js";
import { ensureTenantIsolation } from "./middleware/tenantIsolation.js";
import { uploadLimiter, aiLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import logger from "./config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set("trust proxy", true);

// Pre-route Global Middleware
app.use((req, res, next) => {
    if (req.headers['x-forwarded-for'] && !req.headers['x-forwarded-proto']) {
        req.headers['x-forwarded-proto'] = 'https';
    }
    next();
});

app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 3011;
const STATIC_PATH = process.env.NODE_ENV === "production"
    ? resolve(__dirname, "../frontend/dist")
    : resolve(__dirname, "../frontend");

// --- Static Assets (Served Early) ---
app.use((req, res, next) => {
    const ext = req.path.split('.').pop()?.toLowerCase();
    const staticExts = ['ttf', 'woff', 'woff2', 'otf', 'ico', 'png', 'svg', 'webmanifest', 'js', 'css', 'map'];

    if (staticExts.includes(ext)) {
        const fileName = req.path.startsWith('/') ? req.path.substring(1) : req.path;
        const filePath = resolve(STATIC_PATH, fileName);

        if (fs.existsSync(filePath)) {
            res.header("Access-Control-Allow-Origin", "*");
            return express.static(STATIC_PATH, { index: false })(req, res, next);
        }
    }
    next();
});

// --- Routes ---

// 1. Webhooks (Needs raw body for signature verification if not using shopifyApp middleware)
app.use(webhookRoutes); // /api/webhooks

// 2. Shopify App Proxy
app.use("/imcst_api/proxy", proxyRoutes);

// Apply Tenant Isolation and GLOBAL CORS to all public-facing storefront endpoints
const publicPaths = ["/imcst_api/public", "/imcst_public_api"];

app.use(publicPaths, (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-shop-domain");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 3. Public Design APIs (NO RATE LIMIT - Customer facing)
app.use("/imcst_public_api", ensureTenantIsolation);
app.use("/imcst_api", uploadRoutes); // /public/upload/... - NO LIMIT for customers
app.use("/imcst_api", designPublicRoutes); // /public/design/...
app.use("/imcst_api", assetPublicRoutes);  // /public/assets/... and /remove-bg
app.use("/imcst_public_api", publicRoutes); // Storefront APIs

// 4. Admin Auth Routes
app.get(shopify.config.auth.path, validateShopParam, async (req, res, next) => {
    const { shop, host, embedded } = req.query;
    console.log('[Auth] Request received:', { shop, host, embedded, url: req.url });

    // If embedded in iframe, must break out first before starting OAuth
    // Otherwise Shopify OAuth will fail (X-Frame-Options blocks accounts.shopify.com in iframe)
    if (embedded === '1' || host) {
        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${encodeURIComponent(process.env.SCOPES || '')}&redirect_uri=${encodeURIComponent(process.env.SHOPIFY_APP_URL + '/api/auth/callback')}`;
        const params = new URLSearchParams({ ...req.query, redirectUri: authUrl }).toString();
        console.log('[Auth] Embedded/host detected → redirecting to exitiframe first');
        return res.redirect(`/exitiframe?${params}`);
    }

    // Non-embedded: let library handle
    return shopify.auth.begin()(req, res, next);
});
app.get(
    shopify.config.auth.callbackPath,
    (req, res, next) => {
        console.log('[Auth Callback] Request received:', {
            shop: req.query.shop,
            code: req.query.code ? 'present' : 'missing',
            url: req.url
        });
        next();
    },
    shopify.auth.callback(),
    (req, res, next) => {
        console.log('[Auth Callback] Session created:', {
            shop: res.locals.shopify?.session?.shop,
            sessionId: res.locals.shopify?.session?.id
        });
        next();
    },
    shopify.redirectToShopifyOrAppRoot()
);

// 5. Protected Admin API Routes (MUST BE AFTER AUTH)
// Apply authentication first, then tenant isolation (so res.locals.shopify.session is available)
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, productRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, designRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, assetRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, promoRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, templateRoutes);
app.use("/imcst_api/seed", shopify.validateAuthenticatedSession(), ensureTenantIsolation, seedRoutes);
// AI routes have their own per-shop rate limiter (aiRateLimiter in ai.routes.js)
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, aiRoutes);
// Printful routes
app.use("/imcst_api/printful", (req, res, next) => {
    console.log('[Printful Middleware] Request received:', req.method, req.path);
    console.log('[Printful Middleware] Body:', req.body);
    next();
}, shopify.validateAuthenticatedSession(), ensureTenantIsolation, printfulRoutes);
console.log('[Server] Printful routes registered at /imcst_api/printful');

// --- Storefront Loader Support ---
app.get("/loader.js", publicRoutes); // Handled by public.routes.js

// --- Exit Iframe Helper ---
app.get("/exitiframe", (req, res) => {
    const { redirectUri, host } = req.query;

    if (!redirectUri) return res.status(400).send("Missing redirectUri");

    const safeRedirectUri = String(redirectUri);
    const safeHost = String(host || '');
    const apiKey = process.env.SHOPIFY_API_KEY || '';

    res.status(200).set("Content-Type", "text/html").send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting...</title>
    <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
               min-height: 100vh; margin: 0; flex-direction: column; gap: 12px; color: #333; }
        .btn { padding: 10px 20px; background: #008060; color: white; border: none;
               border-radius: 6px; cursor: pointer; font-size: 16px; text-decoration: none; }
    </style>
</head>
<body>
    <p>Redirecting to Shopify...</p>
    <a class="btn" id="manualBtn" href="${safeRedirectUri}" target="_top">Click here if not redirected</a>
    <script>
        (function() {
            var REDIRECT_URI = ${JSON.stringify(safeRedirectUri)};
            var HOST = ${JSON.stringify(safeHost)};
            var API_KEY = ${JSON.stringify(apiKey)};

            // Primary: try window.top direct redirect (fastest, most reliable)
            function doTopRedirect() {
                try {
                    if (window.top && window.top !== window.self) {
                        window.top.location.href = REDIRECT_URI;
                        return true;
                    }
                } catch(e) {
                    // cross-origin security error, fall through
                }
                return false;
            }

            // If not in iframe at all, just redirect
            if (window.self === window.top) {
                window.location.href = REDIRECT_URI;
                return;
            }

            // Try direct top-level redirect first
            if (doTopRedirect()) return;

            // Fallback: try App Bridge (may cause XHR, but with shorter timeout)
            if (API_KEY && HOST) {
                var script = document.createElement('script');
                script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
                script.onload = function() {
                    try {
                        var AppBridge = window['app-bridge'];
                        if (!AppBridge) throw new Error('No AppBridge');
                        var createApp = AppBridge.default;
                        var Redirect = AppBridge.actions && AppBridge.actions.Redirect;
                        var app = createApp({ apiKey: API_KEY, host: HOST, forceRedirect: true });
                        if (Redirect) {
                            var redirect = Redirect.create(app);
                            redirect.dispatch(Redirect.Action.REMOTE, REDIRECT_URI);
                        } else {
                            // App Bridge 4+ uses @shopify/app-bridge-utils
                            window.top.location.href = REDIRECT_URI;
                        }
                    } catch(e) {
                        console.warn('[exitiframe] AppBridge failed:', e);
                        window.top.location.href = REDIRECT_URI;
                    }
                };
                script.onerror = function() {
                    console.warn('[exitiframe] Failed to load AppBridge, using window.top fallback');
                    window.top.location.href = REDIRECT_URI;
                };
                document.head.appendChild(script);
            } else {
                window.top.location.href = REDIRECT_URI;
            }
        })();
    </script>
</body>
</html>
    `);
});

// --- Serve Frontend ---

// Bypass CORS for local assets
app.use("/imcst_assets", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use("/imcst_assets", express.static(resolve(STATIC_PATH, "imcst_assets"), {
    fallthrough: false,
    index: false
}));

// Public Page
app.get(/^\/public/, async (req, res) => {
    try {
        const publicHtmlPath = resolve(STATIC_PATH, "public.html");
        if (!fs.existsSync(publicHtmlPath)) return res.status(404).send("public.html not found");

        let html = fs.readFileSync(publicHtmlPath, "utf-8");
        html = html.replace("</head>", `<script>window.imcst_shopify_key = "${process.env.SHOPIFY_API_KEY}";</script></head>`);

        // Cache break
        const v = Date.now();
        html = html.replace(/(src|href)="([^"]*\/imcst_assets\/[^"]*)"/g, `$1="$2?v=${v}"`);

        res.status(200).set("Content-Type", "text/html").send(html);
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.use(shopify.cspHeaders());
app.use((req, res, next) => {
    // Extend CSP to allow being framed by Shopify and framing Shopify
    const existingCsp = res.getHeader('Content-Security-Policy');
    if (existingCsp) {
        let newCsp = existingCsp;

        // Fix frame-src (what we frame)
        if (!newCsp.includes('frame-src')) {
            newCsp += " frame-src 'self' https://*.shopify.com https://*.myshopify.com https://admin.shopify.com;";
        } else {
            // Replace existing frame-src or append if needed (simple replacement for now)
            newCsp = newCsp.replace("frame-src", "frame-src https://*.shopify.com https://*.myshopify.com https://admin.shopify.com");
        }

        // Fix frame-ancestors (who frames us) - Critical for embedded apps
        // Shopify library usually handles this, but we ensure it's correct
        if (!newCsp.includes('frame-ancestors')) {
            newCsp += " frame-ancestors https://*.shopify.com https://*.myshopify.com https://admin.shopify.com;";
        } else {
            newCsp = newCsp.replace("frame-ancestors", "frame-ancestors https://*.shopify.com https://*.myshopify.com https://admin.shopify.com");
        }

        res.setHeader('Content-Security-Policy', newCsp);
    }
    next();
});

// Admin Page Catch-all
app.use(shopify.ensureInstalledOnShop(), async (req, res) => {
    try {
        const template = fs.readFileSync(resolve(STATIC_PATH, "index.html"), "utf-8");
        let html = template.replace("</head>", `<script>window.imcst_shopify_key = "${process.env.SHOPIFY_API_KEY}";</script></head>`);
        const v = Date.now();
        html = html.replace(/(src|href)="([^"]*\/imcst_assets\/[^"]*)"/g, `$1="$2?v=${v}"`);
        res.status(200).set("Content-Type", "text/html").send(html);
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

// Global Error Handler (Must be last)
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`Backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`Backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
