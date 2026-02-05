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

// Middleware
import { validateShopParam } from "./middleware/auth.js";
import { ensureTenantIsolation } from "./middleware/tenantIsolation.js";

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

// 3. Public Design APIs (with tenant isolation for shop param validation)
app.use("/imcst_public_api", ensureTenantIsolation);
app.use("/imcst_api", uploadRoutes); // /public/upload/...
app.use("/imcst_api", designPublicRoutes); // /public/design/...
app.use("/imcst_api", assetPublicRoutes);  // /public/assets/... and /remove-bg
app.use("/imcst_public_api", publicRoutes); // Storefront APIs

// 4. Admin Auth Routes
app.get(shopify.config.auth.path, validateShopParam, shopify.auth.begin());
app.get(
    shopify.config.auth.callbackPath,
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
);

// 5. Protected Admin API Routes (MUST BE AFTER AUTH)
// Apply authentication first, then tenant isolation (so res.locals.shopify.session is available)
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, productRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, designRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, assetRoutes);
app.use("/imcst_api", shopify.validateAuthenticatedSession(), ensureTenantIsolation, promoRoutes);

// --- Storefront Loader Support ---
app.get("/loader.js", publicRoutes); // Handled by public.routes.js

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

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
