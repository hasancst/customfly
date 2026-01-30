import "dotenv/config";
import express from "express";
import { shopifyApp } from "@shopify/shopify-app-express";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import morgan from "morgan";
import { spawn } from "child_process";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many uploads from this IP, please try again after 15 minutes" }
});

const prisma = new PrismaClient();
const app = express();

app.set("trust proxy", true);

app.use((req, res, next) => {
    if (req.headers['x-forwarded-for'] && !req.headers['x-forwarded-proto']) {
        req.headers['x-forwarded-proto'] = 'https';
    }
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
            const [k, v] = c.trim().split('=');
            if (k && v) acc[k] = v;
            return acc;
        }, {});
        if (cookies.shopify_app_state) {
            console.log("COOKIE shopify_app_state FOUND:", cookies.shopify_app_state);
        }
    }
    next();
});

app.use(morgan('combined'));

const baseStorage = new PrismaSessionStorage(prisma);
const loggingStorage = {
    storeSession: async (session) => {
        console.log("STORING SESSION for:", session.shop);
        try {
            const result = await baseStorage.storeSession(session);
            console.log("SESSION STORED SUCCESS");
            return result;
        } catch (e) {
            console.error("SESSION STORE ERROR:", e);
            throw e;
        }
    },
    loadSession: async (id) => {
        console.log("LOADING SESSION id:", id);
        try {
            let session = await baseStorage.loadSession(id);
            console.log(`[DEBUG] baseStorage.loadSession("${id}") returned: ${session ? "Session Object" : "null"}`);

            if (!session && !id.startsWith('offline_')) {
                const shop = id.includes('_') ? id.split('_')[0] : id;
                if (shop.includes('.myshopify.com')) {
                    const offlineId = `offline_${shop}`;
                    console.log(`[DEBUG] Online session not found, trying offline fallback: ${offlineId}`);
                    session = await baseStorage.loadSession(offlineId);
                    console.log(`[DEBUG] Fallback baseStorage.loadSession("${offlineId}") returned: ${session ? "Session Object" : "null"}`);
                }
            }
            if (session) {
                console.log(`[DEBUG] SESSION LOADED:`, JSON.stringify({
                    id: session.id,
                    shop: session.shop,
                    isOnline: session.isOnline,
                    scope: session.scope,
                    expires: session.expires
                }));
            } else {
                console.log("[DEBUG] SESSION NOT FOUND in baseStorage");
            }
            return session;
        } catch (e) {
            console.error("LOAD SESSION ERROR:", e);
            throw e;
        }
    },
    deleteSession: async (id) => {
        console.log("DELETING SESSION id:", id);
        return await baseStorage.deleteSession(id);
    },
    deleteSessions: async (ids) => {
        console.log("DELETING SESSIONS ids:", ids);
        return await baseStorage.deleteSessions(ids);
    },
    findSessionsByShop: async (shop) => {
        console.log("FINDING SESSIONS for shop:", shop);
        return await baseStorage.findSessionsByShop(shop);
    }
};

const shopify = shopifyApp({
    api: {
        apiVersion: "2024-10",
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
        scopes: process.env.SCOPES ? process.env.SCOPES.split(",") : [],
        hostName: process.env.SHOPIFY_APP_URL ? process.env.SHOPIFY_APP_URL.replace(/https?:\/\//, "") : "",
        billing: undefined,
        restResources,
    },
    auth: {
        path: "/api/auth",
        callbackPath: "/api/auth/callback",
    },
    webhooks: {
        path: "/api/webhooks",
    },
    sessionStorage: loggingStorage,
    isEmbeddedApp: true,
    useOnlineTokens: false,
    exitIframePath: "/exitiframe",
});

console.log("SHOPIFY CONFIG:", {
    apiKey: shopify.api.config.apiKey,
    hostName: shopify.api.config.hostName,
    apiSecretKey: shopify.api.config.apiSecretKey ? "***" : "MISSING",
    scopes: shopify.api.config.scopes.toString(),
    expandedScopes: Array.from(shopify.api.config.scopes.toArray())
});

app.get(shopify.config.auth.path, (req, res, next) => {
    const shop = req.query.shop;
    if (!shop || shop === 'undefined' || shop === 'null') {
        return res.status(400).json({
            error: "No shop provided",
            message: "Authentication requires a valid shop parameter."
        });
    }
    next();
}, shopify.auth.begin());
app.get(
    shopify.config.auth.callbackPath,
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
);

app.post(
    shopify.config.webhooks.path,
    express.raw({ type: "application/json" }),
    async (req, res) => {
        try {
            await shopify.api.webhooks.process({
                rawBody: req.body,
                payload: JSON.parse(req.body.toString()),
                shop: req.headers["x-shopify-shop-domain"],
                callback: async (topic, shop, payload) => {
                    console.log(`[WEBHOOK] Topic: ${topic} for shop: ${shop}`);
                    if (topic === 'ORDERS_CREATE' || topic === 'ORDERS_PAID') {
                        const orderId = payload.id.toString();
                        const customerId = payload.customer?.id?.toString();
                        const customerEmail = payload.customer?.email;

                        for (const item of payload.line_items) {
                            const designId = item.properties?.find(p => p.name === '_custom_design_id')?.value;
                            if (designId) {
                                console.log(`[WEBHOOK] Link order ${orderId} to design ${designId}`);
                                await prisma.savedDesign.updateMany({
                                    where: { id: designId, shop: shop },
                                    data: {
                                        status: 'ordered',
                                        shopifyOrderId: orderId,
                                        lineItemId: item.id.toString(),
                                        customerId: customerId,
                                        customerEmail: customerEmail
                                    }
                                });
                            }
                        }
                    }
                }
            });
            res.status(200).send();
        } catch (error) {
            console.error(`[WEBHOOK ERROR]: ${error.message}`);
            res.status(500).send(error.message);
        }
    }
);

const PORT = process.env.PORT || 3011;

// Static files (frontend)
const STATIC_PATH = process.env.NODE_ENV === "production"
    ? resolve(__dirname, "../frontend/dist")
    : resolve(__dirname, "../frontend");

app.use("/imcst_api", (req, res, next) => {
    console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
    const authHeader = req.headers.authorization;
    console.log(`[DEBUG] Authorization Header: ${authHeader ? "Present" : "Missing"}`);

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log("[DEBUG] Token Payload (Claims):", JSON.stringify(payload, null, 2));
                console.log("[DEBUG] API Key in config:", shopify.api.config.apiKey);
                if (payload.aud !== shopify.api.config.apiKey) {
                    console.error(`[DEBUG] AUDIENCE MISMATCH: Token aud (${payload.aud}) !== Config apiKey (${shopify.api.config.apiKey})`);
                }
            } else {
                console.error("[DEBUG] Invalid token format (not 3 parts)");
            }
        } catch (e) {
            console.error("[DEBUG] Error parsing token payload:", e.message);
        }
    }
    next();
});

// --- PUBLIC API Routes (for customer-facing designer) ---
// These routes don't require Shopify authentication

// Public: Get Product Config (for customer designer)
app.get("/imcst_api/public/config/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = req.query.shop; // Shop passed as query parameter

        if (!shop) {
            return res.status(400).json({ error: "Shop parameter required" });
        }

        const config = await prisma.merchantConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });

        res.json(config || {});
    } catch (error) {
        console.error("Public config fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/imcst_api/public/shop_config", async (req, res) => {
    try {
        const { shop } = req.query;
        if (!shop) return res.status(400).json({ error: "Shop domain required" });

        const config = await prisma.merchantConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: "GLOBAL" } },
        });

        res.json(config || { shop, designerLayout: "redirect", buttonText: "Design It", unit: "cm", showRulers: false, showSafeArea: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public: Save Customer Design
app.post("/imcst_api/public/design", async (req, res) => {
    try {
        const { shop, shopifyProductId, name, designJson, previewUrl } = req.body;

        if (!shop || !shopifyProductId) {
            return res.status(400).json({ error: "Shop and productId required" });
        }

        const design = await prisma.savedDesign.create({
            data: {
                shop,
                shopifyProductId,
                name: name || "Customer Design",
                designJson,
                previewUrl,
                status: "customer_draft",
                isTemplate: false
            },
        });

        res.json(design);
    } catch (error) {
        console.error("Public design save error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Public: Get Assets (fonts, colors) for customer designer
app.get("/imcst_api/public/assets", async (req, res) => {
    try {
        const shop = req.query.shop;

        if (!shop) {
            return res.status(400).json({ error: "Shop parameter required" });
        }

        const assets = await prisma.asset.findMany({
            where: { shop },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assets);
    } catch (error) {
        console.error("Public assets fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Public: Get Product Details (for customer designer)
app.get("/imcst_api/public/products/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = req.query.shop;

        if (!shop) {
            return res.status(400).json({ error: "Shop parameter required" });
        }

        const offlineId = `offline_${shop}`;
        const session = await baseStorage.loadSession(offlineId);

        if (!session) {
            return res.status(404).json({ error: "No offline session found for this shop" });
        }

        const client = new shopify.api.clients.Graphql({ session });

        const queryString = `
            query getProduct($id: ID!) {
                product(id: $id) {
                    id
                    title
                    vendor
                    tags
                    status
                    handle
                    featuredImage {
                        url
                    }
                    images(first: 50) {
                        edges {
                            node {
                                url
                            }
                        }
                    }
                    options {
                        name
                        position
                        values
                    }
                    variants(first: 100) {
                        edges {
                            node {
                                id
                                title
                                sku
                                price
                                image {
                                    url
                                }
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                        }
                    }
                }
            }
        `;

        const productGid = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
        const response = await client.request(queryString, { variables: { id: productGid } });

        if (!response.data.product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const node = response.data.product;
        const numericId = node.id.split('/').pop();

        const product = {
            id: numericId,
            gid: node.id,
            title: node.title,
            vendor: node.vendor,
            tags: node.tags.join(', '),
            status: node.status,
            handle: node.handle,
            image: node.featuredImage ? { src: node.featuredImage.url } : null,
            images: node.images.edges.map(img => img.node.url),
            options: node.options.map(o => ({
                name: o.name,
                position: o.position,
                values: o.values
            })),
            variants: node.variants.edges.map(v => {
                const variant = {
                    id: v.node.id.split('/').pop(),
                    gid: v.node.id,
                    title: v.node.title,
                    sku: v.node.sku,
                    price: v.node.price,
                    image: v.node.image ? v.node.image.url : null
                };

                if (v.node.selectedOptions) {
                    v.node.selectedOptions.forEach((opt, index) => {
                        variant[`option${index + 1}`] = opt.value;
                    });
                }

                return variant;
            })
        };

        res.json(product);
    } catch (error) {
        console.error("Public product fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.use("/imcst_api", shopify.validateAuthenticatedSession());



app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API Routes ---

// Proxy to Shopify Admin API: Get Products (Using GraphQL for collections and tags)
app.get("/imcst_api/products", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });

        const queryString = `
            query {
                products(first: 50) {
                    edges {
                        node {
                            id
                            title
                            vendor
                            tags
                            createdAt
                            status
                            handle
                            featuredImage {
                                url
                            }
                            options {
                                name
                                position
                                values
                            }
                            variants(first: 20) {
                                edges {
                                    node {
                                        id
                                        title
                                        sku
                                        price
                                        selectedOptions {
                                            name
                                            value
                                        }
                                    }
                                }
                            }
                            collections(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await client.request(queryString);

        const shopDomain = session.shop;

        const products = response.data.products.edges.map(({ node }) => {
            // Convert GID to numeric ID for compatibility
            const numericId = node.id.split('/').pop();

            return {
                id: numericId,
                gid: node.id,
                title: node.title,
                vendor: node.vendor,
                tags: node.tags.join(', '),
                createdAt: node.createdAt,
                status: node.status,
                handle: node.handle,
                shop: shopDomain,
                image: node.featuredImage ? { src: node.featuredImage.url } : null,
                options: node.options.map(o => ({
                    name: o.name,
                    position: o.position,
                    values: o.values
                })),
                variants: node.variants.edges.map(v => {
                    const variant = {
                        id: v.node.id.split('/').pop(),
                        gid: v.node.id,
                        title: v.node.title,
                        sku: v.node.sku,
                        price: v.node.price
                    };

                    if (v.node.selectedOptions) {
                        v.node.selectedOptions.forEach((opt, index) => {
                            variant[`option${index + 1}`] = opt.value;
                        });
                    }

                    return variant;
                }),
                collections: node.collections.edges.map(c => ({
                    id: c.node.id.split('/').pop(),
                    gid: c.node.id,
                    title: c.node.title
                }))
            };
        });

        console.log(`[DEBUG] Parsed ${products.length} products for shop ${shopDomain}`);
        if (products.length > 0) {
            console.log(`[DEBUG] Sample Product: ${products[0].title} (ID: ${products[0].id})`);
        }
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get single product by ID
app.get("/imcst_api/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });

        const queryString = `
            query($id: ID!) {
                product(id: $id) {
                    id
                    title
                    vendor
                    tags
                    status
                    handle
                    featuredImage {
                        url
                    }
                    images(first: 50) {
                        edges {
                            node {
                                url
                            }
                        }
                    }
                    options {
                        name
                        position
                        values
                    }
                    variants(first: 100) {
                        edges {
                            node {
                                id
                                title
                                sku
                                price
                                image {
                                    url
                                }
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                        }
                    }
                }
            }
        `;

        const productGid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;
        const response = await client.request(queryString, { variables: { id: productGid } });

        if (!response.data.product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const node = response.data.product;
        const numericId = node.id.split('/').pop();

        const product = {
            id: numericId,
            gid: node.id,
            title: node.title,
            vendor: node.vendor,
            tags: node.tags.join(', '),
            status: node.status,
            handle: node.handle,
            image: node.featuredImage ? { src: node.featuredImage.url } : null,
            images: node.images.edges.map(img => img.node.url),
            options: node.options.map(o => ({
                name: o.name,
                position: o.position,
                values: o.values
            })),
            variants: node.variants.edges.map(v => {
                const variant = {
                    id: v.node.id.split('/').pop(),
                    gid: v.node.id,
                    title: v.node.title,
                    sku: v.node.sku,
                    price: v.node.price,
                    image: v.node.image ? v.node.image.url : null
                };

                if (v.node.selectedOptions) {
                    v.node.selectedOptions.forEach((opt, index) => {
                        variant[`option${index + 1}`] = opt.value;
                    });
                }

                return variant;
            })
        };

        res.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle Product Status
app.put("/imcst_api/products/:gid/status", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });
        const { gid } = req.params;
        const { status } = req.body; // Expects ACTIVE or DRAFT

        const mutation = `
            mutation productUpdate($input: ProductInput!) {
                productUpdate(input: $input) {
                    product {
                        id
                        status
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await client.request(mutation, {
            variables: {
                input: {
                    id: `gid://shopify/Product/${gid}`,
                    status: status
                }
            }
        });

        if (response.data.productUpdate.userErrors.length > 0) {
            return res.status(400).json({ errors: response.data.productUpdate.userErrors });
        }

        res.json({ success: true, product: response.data.productUpdate.product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy to Shopify Admin API: Get Orders
app.get("/imcst_api/orders", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const response = await shopify.api.rest.Order.all({ session });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Collections
app.get("/imcst_api/collections", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });

        const response = await client.request(`
            query {
                collections(first: 100) {
                    edges {
                        node {
                            id
                            title
                        }
                    }
                }
            }
        `);

        const allCollections = response.data.collections.edges.map(({ node }) => ({
            id: node.id.split('/').pop(),
            title: node.title
        }));

        res.json(allCollections);
    } catch (error) {
        console.error("Failed to fetch collections:", error);
        res.status(500).json({ error: error.message });
    }
});

// 0. Get Shop Global Config
app.get("/imcst_api/shop_config", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const config = await prisma.merchantConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: "GLOBAL" } },
        });
        res.json(config || { shop, designerLayout: "redirect", buttonText: "Design It" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 0b. Save Shop Global Config
app.post("/imcst_api/shop_config", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const updates = req.body;

        const config = await prisma.merchantConfig.upsert({
            where: { shop_shopifyProductId: { shop, shopifyProductId: "GLOBAL" } },
            update: {
                designerLayout: updates.designerLayout,
                buttonText: updates.buttonText,
                showRulers: updates.showRulers,
                showSafeArea: updates.showSafeArea,
                unit: updates.unit,
                paperSize: updates.paperSize,
            },
            create: {
                shop,
                shopifyProductId: "GLOBAL",
                printArea: {},
                designerLayout: updates.designerLayout || "redirect",
                buttonText: updates.buttonText || "Design It",
                showRulers: updates.showRulers || false,
                showSafeArea: updates.showSafeArea || false,
                unit: updates.unit || "cm",
                paperSize: updates.paperSize || "Custom",
            }
        });
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. Get Product Config
app.get("/imcst_api/config/:productId", async (req, res) => {
    const { productId } = req.params;
    const shop = res.locals.shopify.session.shop;

    const config = await prisma.merchantConfig.findUnique({
        where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
    });

    res.json(config || { error: "Not found" });
});

// 2. Save Product Config
app.post("/imcst_api/config", async (req, res) => {
    const updates = req.body;
    const shop = res.locals.shopify.session.shop;
    const productId = updates.productId; // Extract productId from updates

    // Get current config to merge or just use partial update
    const currentConfig = await prisma.merchantConfig.findUnique({
        where: { shop_shopifyProductId: { shop, shopifyProductId: productId } }
    });

    const config = await prisma.merchantConfig.upsert({
        where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        update: {
            printArea: updates.printArea !== undefined ? (updates.printArea || {}) : undefined,
            baseImage: updates.baseImage !== undefined ? updates.baseImage : undefined,
            baseImageColor: updates.baseImageColor !== undefined ? updates.baseImageColor : undefined,
            baseImageProperties: updates.baseImageProperties !== undefined ? (updates.baseImageProperties || {}) : undefined,
            baseImageColorEnabled: updates.baseImageColorEnabled !== undefined ? !!updates.baseImageColorEnabled : undefined,
            selectedColorAssetId: updates.selectedColorAssetId !== undefined ? updates.selectedColorAssetId : undefined,
            safeAreaPadding: updates.safeAreaPadding !== undefined ? updates.safeAreaPadding : undefined,
            safeAreaShape: updates.safeAreaShape !== undefined ? updates.safeAreaShape : undefined,
            safeAreaOffset: updates.safeAreaOffset !== undefined ? (updates.safeAreaOffset || { x: 0, y: 0 }) : undefined,
            paperSize: updates.paperSize !== undefined ? updates.paperSize : undefined,
            customPaperDimensions: updates.customPaperDimensions !== undefined ? (updates.customPaperDimensions || {}) : undefined,
            unit: updates.unit !== undefined ? updates.unit : undefined,
            showRulers: updates.showRulers !== undefined ? !!updates.showRulers : undefined,
            showSafeArea: updates.showSafeArea !== undefined ? !!updates.showSafeArea : undefined,
            // New layout fields
            designerLayout: updates.designerLayout !== undefined ? updates.designerLayout : undefined,
            inlineSettings: updates.inlineSettings !== undefined ? updates.inlineSettings : undefined,
            modalSettings: updates.modalSettings !== undefined ? updates.modalSettings : undefined,
            wizardSettings: updates.wizardSettings !== undefined ? updates.wizardSettings : undefined,
            enabledTools: updates.enabledTools !== undefined ? updates.enabledTools : undefined,
            buttonText: updates.buttonText !== undefined ? updates.buttonText : undefined,
            buttonStyle: updates.buttonStyle !== undefined ? updates.buttonStyle : undefined,
            // New mask & safe area fields
            baseImageAsMask: updates.baseImageAsMask !== undefined ? !!updates.baseImageAsMask : undefined,
            safeAreaRadius: updates.safeAreaRadius !== undefined ? updates.safeAreaRadius : undefined,
            safeAreaWidth: updates.safeAreaWidth !== undefined ? updates.safeAreaWidth : undefined,
            safeAreaHeight: updates.safeAreaHeight !== undefined ? updates.safeAreaHeight : undefined,
            variantBaseImages: updates.variantBaseImages !== undefined ? (updates.variantBaseImages || {}) : undefined,
        },
        create: {
            shop,
            shopifyProductId: productId,
            printArea: updates.printArea || {},
            baseImage: updates.baseImage,
            baseImageColor: updates.baseImageColor,
            baseImageProperties: updates.baseImageProperties || {},
            baseImageColorEnabled: !!updates.baseImageColorEnabled,
            selectedColorAssetId: updates.selectedColorAssetId,
            safeAreaPadding: updates.safeAreaPadding,
            safeAreaShape: updates.safeAreaShape,
            safeAreaOffset: updates.safeAreaOffset || { x: 0, y: 0 },
            paperSize: updates.paperSize,
            customPaperDimensions: updates.customPaperDimensions || {},
            unit: updates.unit,
            showRulers: !!updates.showRulers,
            showSafeArea: !!updates.showSafeArea,
            // New layout fields
            designerLayout: updates.designerLayout || "redirect",
            inlineSettings: updates.inlineSettings || {},
            modalSettings: updates.modalSettings || {},
            wizardSettings: updates.wizardSettings || {},
            enabledTools: updates.enabledTools || {},
            buttonText: updates.buttonText || "Design It",
            buttonStyle: updates.buttonStyle || {},
            // New mask & safe area fields
            baseImageAsMask: !!updates.baseImageAsMask,
            safeAreaRadius: updates.safeAreaRadius || 0,
            safeAreaWidth: updates.safeAreaWidth,
            safeAreaHeight: updates.safeAreaHeight,
            variantBaseImages: updates.variantBaseImages || {},
        },
    });

    res.json(config);
});

// 2a. Delete Product Config
app.delete("/imcst_api/config/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;

        await prisma.merchantConfig.delete({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Delete config error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2b. Get Configured Products (for persistence)
app.get("/imcst_api/configured-products", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const configs = await prisma.merchantConfig.findMany({
            where: { shop },
        });
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Shop Information API ---

// GET Shop Currency (Admin)
app.get("/imcst_api/shop/currency", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });
        const queryString = `
            query {
                shop {
                    currencyCode
                }
            }
        `;
        const response = await client.request(queryString);
        res.json({ currency: response.data.shop.currencyCode });
    } catch (error) {
        console.error("Fetch shop currency error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET Shop Currency (Public)
app.get("/imcst_public_api/shop/currency/:shop", async (req, res) => {
    try {
        const { shop } = req.params;
        const offlineId = `offline_${shop}`;
        const session = await shopify.config.sessionStorage.loadSession(offlineId);

        if (!session) {
            return res.status(404).json({ error: "Shop not found or offline session missing" });
        }

        const client = new shopify.api.clients.Graphql({ session });
        const queryString = `
            query {
                shop {
                    currencyCode
                }
            }
        `;
        const response = await client.request(queryString);
        res.json({ currency: response.data.shop.currencyCode });
    } catch (error) {
        console.error("Fetch public shop currency error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Pricing Configuration API ---

// GET Pricing Config
app.get("/imcst_api/pricing/config/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;

        const config = await prisma.productPricingConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });

        res.json(config || { error: "Not found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST/PUT Pricing Config (Upsert)
app.post("/imcst_api/pricing/config/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;
        const updates = req.body;

        const config = await prisma.productPricingConfig.upsert({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
            update: {
                globalPricing: updates.globalPricing,
                textPricing: updates.textPricing,
                imagePricing: updates.imagePricing,
                elementPricing: updates.elementPricing,
                bulkPricing: updates.bulkPricing,
                printingMethods: updates.printingMethods,
                currency: updates.currency || "USD",
            },
            create: {
                shop,
                shopifyProductId: productId,
                globalPricing: updates.globalPricing,
                textPricing: updates.textPricing,
                imagePricing: updates.imagePricing,
                elementPricing: updates.elementPricing,
                bulkPricing: updates.bulkPricing,
                printingMethods: updates.printingMethods,
                currency: updates.currency || "USD",
            },
        });

        res.json(config);
    } catch (error) {
        console.error("Save pricing config error:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE Pricing Config
app.delete("/imcst_api/pricing/config/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;
        await prisma.productPricingConfig.delete({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Delete pricing config error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET All Pricing Configs for a Shop
app.get("/imcst_api/pricing/configs", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const configs = await prisma.productPricingConfig.findMany({
            where: { shop },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Save or Update Design
app.post("/imcst_api/design", async (req, res) => {
    try {
        const { id, name, designJson, previewUrl, shopifyProductId, isTemplate } = req.body;
        const shop = res.locals.shopify.session.shop;

        if (id) {
            // Update existing design
            const updatedDesign = await prisma.savedDesign.update({
                where: { id, shop }, // Security: Must match shop
                data: {
                    name: name || "Untitled Design",
                    designJson,
                    previewUrl,
                    isTemplate: !!isTemplate
                },
            });
            return res.json(updatedDesign);
        } else {
            // Create new design
            const design = await prisma.savedDesign.create({
                data: {
                    shop,
                    shopifyProductId: shopifyProductId ? String(shopifyProductId) : null,
                    name: name || "Untitled Design",
                    designJson,
                    previewUrl,
                    isTemplate: !!isTemplate
                },
            });
            return res.json(design);
        }
    } catch (error) {
        console.error("Save design error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/imcst_api/design", async (req, res) => {
    try {
        if (!res.locals.shopify || !res.locals.shopify.session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const shop = res.locals.shopify.session.shop;

        const designs = await prisma.savedDesign.findMany({
            where: { shop },
            orderBy: [
                { isTemplate: 'desc' },
                { updatedAt: 'desc' }
            ]
        });
        res.json(designs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4a. Get Design by ID (SINGULAR)
app.get("/imcst_api/design/:id", async (req, res, next) => {
    try {
        if (req.params.id === 'product') {
            return next();
        }

        const { id } = req.params;
        if (!res.locals.shopify || !res.locals.shopify.session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const shop = res.locals.shopify.session.shop;

        const design = await prisma.savedDesign.findUnique({
            where: { id }
        });

        if (!design || design.shop !== shop) {
            return res.status(404).json({ error: "Design not found" });
        }

        res.json(design);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4b. Get Designs for a Product
app.get("/imcst_api/design/product/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;

        const designs = await prisma.savedDesign.findMany({
            where: {
                shop,
                shopifyProductId: String(productId)
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        res.json(designs);
    } catch (error) {
        console.error("Get product designs error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4c. Delete Design
app.delete("/imcst_api/design/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!res.locals.shopify || !res.locals.shopify.session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const shop = res.locals.shopify.session.shop;

        const design = await prisma.savedDesign.findFirst({
            where: { id, shop }
        });

        if (!design) {
            return res.status(404).json({ error: "Design not found" });
        }

        await prisma.savedDesign.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Asset Management ---

// Background Removal using Rembg
app.post("/imcst_api/remove-bg", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "No image provided" });

        let inputBuffer;
        if (image.startsWith('data:image')) {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            inputBuffer = Buffer.from(base64Data, 'base64');
        } else {
            const response = await fetch(image);
            inputBuffer = Buffer.from(await response.arrayBuffer());
        }

        const pyProcess = spawn('./venv/bin/python3', ['remove_bg.py'], {
            cwd: __dirname
        });

        let outputBuffer = Buffer.alloc(0);
        let errorOutput = "";

        pyProcess.stdin.write(inputBuffer);
        pyProcess.stdin.end();

        pyProcess.stdout.on('data', (data) => {
            outputBuffer = Buffer.concat([outputBuffer, data]);
        });

        pyProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Rembg error:", errorOutput);
                return res.status(500).json({ error: "Background removal failed", details: errorOutput });
            }
            const base64Result = outputBuffer.toString('base64');
            res.json({ image: `data:image/png;base64,${base64Result}` });
        });

    } catch (error) {
        console.error("Remove BG error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get Font Library (Global search from GoogleFont table)
app.get("/imcst_api/font-library", async (req, res) => {
    try {
        const { query } = req.query;

        const fonts = await prisma.googleFont.findMany({
            where: query ? {
                name: {
                    contains: query,
                    mode: 'insensitive'
                }
            } : {},
            take: 50,
            orderBy: { name: 'asc' }
        });

        res.json(fonts.map(f => f.name));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Assets (Filterable by type)
app.get("/imcst_api/assets", async (req, res) => {
    try {
        const { type } = req.query;
        const shop = res.locals.shopify.session.shop;

        const where = { shop };
        if (type) where.type = type;

        const assets = await prisma.asset.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Global Design Endpoints
app.get("/imcst_api/global_design", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const design = await prisma.savedDesign.findFirst({
            where: { shop, id: 'global_settings_design' }
        });

        let config = null;
        const configRec = await prisma.merchantConfig.findFirst({ where: { shop, shopifyProductId: 'global_settings_config' } });
        if (configRec) config = configRec;

        res.json({
            designJson: design ? design.designJson : null,
            config: config
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/imcst_api/global_design", async (req, res) => {
    try {
        const { designJson, config } = req.body;
        const shop = res.locals.shopify.session.shop;

        // Save Design
        if (designJson) {
            await prisma.savedDesign.upsert({
                where: { id: 'global_settings_design' },
                update: { designJson, name: 'Global Settings', updatedAt: new Date() },
                create: { id: 'global_settings_design', shop, name: 'Global Settings', designJson, isTemplate: true, shopifyProductId: 'global_settings' }
            });
        }

        // Save Config
        if (config) {
            const { id, ...cleanConfig } = config;
            // Ensure we don't save ephemeral 'id' or other non-schema fields
            const data = {
                ...cleanConfig,
                shopifyProductId: 'global_settings_config',
                shop
            };

            // Remove any fields that don't belong in the update/create payload if necessary, 
            // but assuming 'config' matches schema shape roughly. 
            // Specifically remove 'productId' if it exists in input object
            if (data.productId) delete data.productId;

            await prisma.merchantConfig.upsert({
                where: { shop_shopifyProductId: { shop, shopifyProductId: 'global_settings_config' } },
                update: data,
                create: {
                    ...data,
                    id: 'global_config_' + Date.now(),
                    printArea: {} // Required field
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Global setting save error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/imcst_api/global_design/apply_all", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;

        // 1. Get Global Design
        const globalDesign = await prisma.savedDesign.findFirst({ where: { shop, id: 'global_settings_design' } });
        const globalConfig = await prisma.merchantConfig.findFirst({ where: { shop, shopifyProductId: 'global_settings_config' } });

        if (!globalDesign && !globalConfig) {
            return res.status(400).json({ error: "No global settings found to apply." });
        }

        // 2. Update ALL existing designs (excluding templates and global itself)
        // Note: This is a destructive operation on existing designs if we overwrite them completely.
        // User said "update semua product".
        if (globalDesign && globalDesign.designJson) {
            // We update all designs that differ from global? Or just all? 
            // We'll update all LOCAL designs (associated with a product).
            // But wait, we don't want to overwrite CUSTOM user designs maybe?
            // "kecuali di product tersebut mempunyai setingan sendiri" -> Unless product has own settings.
            // "jika kita apply maka akan update semua product" -> If we apply, it updates all.
            // This usually implies forcing the default onto everyone.

            // To be safe, let's ONLY update Configs for now, OR update designs if they are marked as "default" (which we don't track).
            // Let's implement updating CONFIGS primarily (Safe Area, etc). 
            // And for designs? If we overwrite designs, we lose work. 
            // I'll skip overwritting designs for now unless explicitly requested. I'll just apply CONFIGS.
        }

        if (globalConfig) {
            const { id, shopifyProductId, shop: s, createdAt, updatedAt, ...configData } = globalConfig;

            // Update all configs except global
            await prisma.merchantConfig.updateMany({
                where: { shop, NOT: { shopifyProductId: 'global_settings_config' } },
                data: configData
            });
        }

        res.json({ success: true, message: "Global configuration applied to all existing product protocols." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Create Asset
// 4. Get Designs (with filter)
app.get("/imcst_api/designs", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { status } = req.query;

        const where = { shop };
        if (status) where.status = status;

        const designs = await prisma.savedDesign.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(designs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4b. Get Design by ID
app.get("/imcst_api/designs/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        const design = await prisma.savedDesign.findFirst({
            where: { id, shop }
        });

        if (!design) {
            return res.status(404).json({ error: "Design not found" });
        }

        res.json(design);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/imcst_api/assets", async (req, res) => {
    try {
        const { type, name, value, config } = req.body;
        const shop = res.locals.shopify.session.shop;

        if (!type || !name || value === undefined || value === null) {
            return res.status(400).json({ error: "Type, name, and value are required" });
        }

        const asset = await prisma.asset.create({
            data: {
                shop,
                type,
                name,
                value,
                config: config || {}
            }
        });

        res.json(asset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6b. Update Asset
app.put("/imcst_api/assets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, value, config } = req.body;
        const shop = res.locals.shopify.session.shop;

        const asset = await prisma.asset.findFirst({
            where: { id, shop }
        });

        if (!asset) {
            return res.status(404).json({ error: "Asset not found" });
        }

        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (value !== undefined) dataToUpdate.value = value;
        if (config !== undefined) dataToUpdate.config = config;

        console.log(`[PUT Asset ${id}] Updating with:`, JSON.stringify(dataToUpdate, null, 2));

        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: dataToUpdate
        });

        res.json(updatedAsset);
    } catch (error) {
        console.error(`[PUT Asset Error]:`, error);
        res.status(400).json({ error: error.message, details: error.stack });
    }
});

// 7. Delete Asset
app.delete("/imcst_api/assets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        const asset = await prisma.asset.findFirst({
            where: { id, shop }
        });

        if (!asset) {
            return res.status(404).json({ error: "Asset not found" });
        }

        await prisma.asset.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Promo Code Endpoints ---

// Get all codes
app.get("/imcst_api/promo_codes", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const codes = await prisma.promoCode.findMany({
            where: { shop },
            orderBy: { createdAt: 'desc' }
        });
        res.json(codes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create/Update code
app.post("/imcst_api/promo_codes", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { id, code, discountType, discountValue, active, minOrderAmount, usageLimit } = req.body;

        if (!code) return res.status(400).json({ error: "Code is required" });

        if (id) {
            // Update
            const updated = await prisma.promoCode.update({
                where: { id },
                data: {
                    code: code.toUpperCase(),
                    discountType,
                    discountValue: parseFloat(discountValue) || 0,
                    active: active !== undefined ? active : true,
                    minOrderAmount: parseFloat(minOrderAmount) || null,
                    usageLimit: parseInt(usageLimit) || null
                }
            });
            return res.json(updated);
        } else {
            // Create
            const created = await prisma.promoCode.create({
                data: {
                    shop,
                    code: code.toUpperCase(),
                    discountType,
                    discountValue: parseFloat(discountValue) || 0,
                    active: active !== undefined ? active : true,
                    minOrderAmount: parseFloat(minOrderAmount) || null,
                    usageLimit: parseInt(usageLimit) || null
                }
            });
            return res.json(created);
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete code
app.delete("/imcst_api/promo_codes/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        await prisma.promoCode.deleteMany({
            where: { id, shop }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// PUBLIC API ENDPOINTS (No Auth / CORS enabled)
// ==========================================

// Enable CORS for public endpoints
app.use("/imcst_public_api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// 1. Get Public Config & Design
app.get("/imcst_public_api/product/:shop/:shopifyProductId", async (req, res) => {
    try {
        const { shop, shopifyProductId } = req.params;

        const cacheKey = `pub_prod_${shop}_${shopifyProductId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // Fetch Product Config
        let config = await prisma.merchantConfig.findFirst({
            where: { shop, shopifyProductId }
        });

        // Fallback to Global Config if no product specific config
        if (!config) {
            config = await prisma.merchantConfig.findFirst({
                where: { shop, shopifyProductId: 'global_settings_config' }
            });
        }

        // Fetch Template Design (if any)
        let initialDesign = await prisma.savedDesign.findFirst({
            where: { shop, shopifyProductId: 'global_settings_config', isTemplate: true }
        });

        if (!initialDesign) {
            initialDesign = await prisma.savedDesign.findFirst({
                where: { shop, id: 'global_settings_design' }
            });
        }

        const responseData = {
            config: config || {},
            design: initialDesign ? initialDesign.designJson : null
        };

        cache.set(cacheKey, responseData);
        res.json(responseData);

    } catch (error) {
        console.error("[Public API] Error fetching product:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Upload Public Design (for Add to Cart)
// In a real app, this should probably use S3/R2/GCS. For this local setup, we'll save to disk and serve via static.
app.post("/imcst_public_api/upload", uploadLimiter, express.json({ limit: '50mb' }), async (req, res) => {
    try {
        const { imageBase64, shop } = req.body;
        if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });

        // Decode base64
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: "Invalid base64 string" });
        }

        const extension = matches[1].split('/')[1]; // e.g. png
        const buffer = Buffer.from(matches[2], 'base64');

        const filename = `design_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        // Ensure uploads directory exists
        const uploadDir = resolve(STATIC_PATH, "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        fs.writeFileSync(resolve(uploadDir, filename), buffer);

        // Return public URL (assuming env var or relative)
        const publicUrl = `${process.env.SHOPIFY_APP_URL}/assets/uploads/${filename}`;

        res.json({ url: publicUrl, filename });

    } catch (error) {
        console.error("[Public API] Upload error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Calculate Public Pricing
app.post("/imcst_public_api/pricing/calculate", async (req, res) => {
    try {
        const { shop, productId, elements, quantity = 1 } = req.body;
        if (!shop || !productId) return res.status(400).json({ error: "Missing required fields" });

        // Fetch Pricing Config
        const config = await prisma.productPricingConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });

        if (!config) {
            return res.json({ total: 0, breakdown: {}, perUnitPrice: 0 });
        }

        let globalFee = 0;
        let elementCharges = {};
        let totalElementCharges = 0;

        // 1. Global Fee
        if (config.globalPricing?.enabled) {
            globalFee = config.globalPricing.basePrice || 0;
        }

        // 2. Element Charges (Text only for Phase 1)
        if (elements && Array.isArray(elements)) {
            elements.forEach(el => {
                if (el.type === 'text' || el.type === 'field' || el.type === 'textarea') {
                    const textConfig = config.textPricing;
                    if (textConfig && textConfig.mode !== 'free') {
                        let charge = 0;
                        if (textConfig.mode === 'per_field') {
                            charge = textConfig.pricePerField || 0;
                        } else if (textConfig.mode === 'per_character') {
                            const charCount = (el.text || "").length;
                            const freeChars = textConfig.freeCharacters || 0;
                            const taxableChars = Math.max(0, charCount - freeChars);
                            charge = taxableChars * (textConfig.pricePerCharacter || 0);
                        }

                        // Apply min/max
                        if (textConfig.minCharge && charge < textConfig.minCharge && charge > 0) charge = textConfig.minCharge;
                        if (textConfig.maxCharge && charge > textConfig.maxCharge) charge = textConfig.maxCharge;

                        if (charge > 0) {
                            elementCharges[el.id] = charge;
                            totalElementCharges += charge;
                        }
                    }
                }
            });
        }

        // 3. Image Charges
        if (config.imagePricing?.uploadFee > 0) {
            const imageCount = elements.filter(el => el.type === 'image' || el.type === 'upload').length;
            if (imageCount > 0) {
                const imgFee = imageCount * config.imagePricing.uploadFee;
                elementCharges['imageUploads'] = imgFee;
                totalElementCharges += imgFee;
            }
        }

        const subtotalPerUnit = globalFee + totalElementCharges;
        let total = subtotalPerUnit * quantity;
        let bulkDiscount = 0;
        let appliedTier = null;

        // 4. Bulk Discounts
        if (config.bulkPricing?.enabled && config.bulkPricing.tiers?.length > 0) {
            const qty = parseInt(quantity) || 1;
            const tiers = config.bulkPricing.tiers;

            // Find the best matching tier
            const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
            const matchingTier = sortedTiers.find(t =>
                qty >= t.minQuantity && (!t.maxQuantity || qty <= t.maxQuantity)
            );

            if (matchingTier) {
                appliedTier = matchingTier;
                if (matchingTier.discountType === 'percentage') {
                    bulkDiscount = total * (matchingTier.discountValue / 100);
                } else if (matchingTier.discountType === 'fixed') {
                    bulkDiscount = matchingTier.discountValue * qty;
                }
            }
        }

        total -= bulkDiscount;

        // 5. Printing Methods (Selected Method or Priority: Screen Print > Gang Sheet > DTG)
        let printingCost = 0;
        let printingMethodDetails = null;
        const requestedMethod = req.body.selectedMethod;

        const tryScreenPrint = () => {
            const sp = config.printingMethods.screenPrint;
            const setupFeePerColor = sp.setupFeePerColor || 0;
            const printFeePerItem = sp.printFeePerItem || 0;
            const numColors = parseInt(req.body.numColors) || 1;
            const qty = parseInt(quantity) || 1;

            const totalSetupFee = setupFeePerColor * numColors;
            const totalPrintFee = printFeePerItem * qty;
            const totalPrintingFee = totalSetupFee + totalPrintFee;

            printingCost = totalPrintingFee / qty;
            printingMethodDetails = {
                method: 'Screen Print',
                numColors,
                setupFeePerColor,
                printFeePerItem,
                totalSetupFee,
                totalPrintFee,
                totalPrintingFee
            };
        };

        const tryGangSheet = () => {
            const gs = config.printingMethods.gangSheet;
            const setupFee = gs.setupFee || 0;
            const pricePerSheet = gs.pricePerSheet || 0;
            const designsPerSheet = Math.max(1, gs.designsPerSheet || 1);

            const qty = parseInt(quantity) || 1;
            const requiredSheets = Math.ceil(qty / designsPerSheet);
            const totalPrintingFee = setupFee + (pricePerSheet * requiredSheets);

            printingCost = totalPrintingFee / qty; // Price per item
            printingMethodDetails = {
                method: 'Gang Sheet',
                setupFee,
                pricePerSheet,
                designsPerSheet,
                requiredSheets,
                totalPrintingFee
            };
        };

        const tryDTG = () => {
            const dtg = config.printingMethods.dtg;
            const basePrintFee = dtg.basePrice || 0;

            // For now, default to 'medium' multiplier unless specified
            const size = req.body.printSize || 'medium';
            const multiplier = dtg.sizeMultipliers?.[size] || 1;

            printingCost = basePrintFee * multiplier;
            printingMethodDetails = {
                method: 'DTG',
                basePrintFee,
                multiplier,
                size
            };
        };

        // Execution Logic
        if (requestedMethod === 'screenPrint' && config.printingMethods?.screenPrint?.enabled) {
            tryScreenPrint();
        } else if (requestedMethod === 'gangSheet' && config.printingMethods?.gangSheet?.enabled) {
            tryGangSheet();
        } else if (requestedMethod === 'dtg' && config.printingMethods?.dtg?.enabled) {
            tryDTG();
        } else {
            // Default Priority
            if (config.printingMethods?.screenPrint?.enabled) tryScreenPrint();
            else if (config.printingMethods?.gangSheet?.enabled) tryGangSheet();
            else if (config.printingMethods?.dtg?.enabled) tryDTG();
        }

        total += (printingCost * quantity);

        // 6. Dynamic Pricing Rules (Phase 3)
        const appliedRules = [];
        if (config.pricingRules && Array.isArray(config.pricingRules)) {
            const elementsArr = elements || [];
            const textCount = elementsArr.filter(e => e.type === 'text').length;
            const imageCount = elementsArr.filter(e => e.type === 'image').length;
            const totalCount = elementsArr.length;

            for (const rule of config.pricingRules) {
                let triggerValue = 0;
                switch (rule.trigger) {
                    case 'total_elements': triggerValue = totalCount; break;
                    case 'text_elements': triggerValue = textCount; break;
                    case 'image_elements': triggerValue = imageCount; break;
                    default: continue;
                }

                let isMatch = false;
                const threshold = parseFloat(rule.threshold) || 0;
                switch (rule.operator) {
                    case 'greater_than': isMatch = triggerValue > threshold; break;
                    case 'less_than': isMatch = triggerValue < threshold; break;
                    case 'equals': isMatch = triggerValue === threshold; break;
                }

                if (isMatch) {
                    const value = parseFloat(rule.value) || 0;
                    let ruleImpact = 0;
                    if (rule.action === 'add_fee') {
                        ruleImpact = value * quantity;
                        total += ruleImpact;
                    } else if (rule.action === 'multiply_subtotal') {
                        const previousTotal = total;
                        total *= value;
                        ruleImpact = total - previousTotal;
                    }

                    appliedRules.push({
                        ...rule,
                        impact: ruleImpact
                    });
                }
            }
        }

        // 7. Promo Code (Phase 3)
        let promoDiscount = 0;
        let appliedPromo = null;
        const requestedPromo = req.body.promoCode;

        if (requestedPromo) {
            const promo = await prisma.promoCode.findFirst({
                where: {
                    shop,
                    code: requestedPromo.toUpperCase(),
                    active: true
                }
            });

            if (promo) {
                // Validate limits
                const withinUsageLimit = !promo.usageLimit || (promo.usageCount < promo.usageLimit);
                const withinMinAmount = !promo.minOrderAmount || (total >= promo.minOrderAmount);

                if (withinUsageLimit && withinMinAmount) {
                    if (promo.discountType === 'percentage') {
                        promoDiscount = total * (promo.discountValue / 100);
                    } else if (promo.discountType === 'fixed_amount') {
                        promoDiscount = Math.min(total, promo.discountValue);
                    }
                    total -= promoDiscount;
                    appliedPromo = promo;
                }
            }
        }

        res.json({
            breakdown: {
                globalFee,
                totalElementCharges,
                elementBreakdown,
                bulkDiscount,
                appliedTier,
                printingCost,
                printingMethodDetails,
                appliedRules,
                promoDiscount,
                appliedPromo,
                total
            },
            perUnitPrice: total / quantity,
            total
        });

    } catch (error) {
        console.error("[Public API] Pricing calculation error:", error);
    }
});

// Serve Frontend
app.use(shopify.cspHeaders());
app.use(express.static(STATIC_PATH, { index: false }));

app.use(shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
    const template = fs.readFileSync(resolve(STATIC_PATH, "index.html"), "utf-8");
    console.log("Injecting API key and forcing cache break...");

    // 1. Inject API Key
    let html = template.replace(
        "</head>",
        `<script>window.imcst_shopify_key = "${process.env.SHOPIFY_API_KEY}"; console.log("v12 LOADED");</script></head>`
    );

    // Update Title
    html = html.replace(/<title>(.*?)<\/title>/, "<title>Product Designer Pro v12</title>");

    // 2. Force cache break for assets by appending a timestamp
    const v = Date.now();
    html = html.replace(/src="\/assets\/(.*?)"/g, `src="/assets/$1?v=${v}"`);
    html = html.replace(/href="\/assets\/(.*?)"/g, `href="/assets/$1?v=${v}"`);

    return res
        .status(200)
        .set("Content-Type", "text/html")
        .set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        .set("Pragma", "no-cache")
        .set("Expires", "0")
        .send(html);
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
