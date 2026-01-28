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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
    shopify.config.auth.callbackPath,
    shopify.auth.callback(),
    shopify.redirectToShopifyOrAppRoot()
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
            safeAreaOffset: updates.safeAreaOffset !== undefined ? (updates.safeAreaOffset || {}) : undefined,
            paperSize: updates.paperSize !== undefined ? updates.paperSize : undefined,
            customPaperDimensions: updates.customPaperDimensions !== undefined ? (updates.customPaperDimensions || {}) : undefined,
            unit: updates.unit !== undefined ? updates.unit : undefined,
            showRulers: updates.showRulers !== undefined ? !!updates.showRulers : undefined,
            showSafeArea: updates.showSafeArea !== undefined ? !!updates.showSafeArea : undefined,
            // New fields
            designerLayout: updates.designerLayout !== undefined ? updates.designerLayout : undefined,
            inlineSettings: updates.inlineSettings !== undefined ? updates.inlineSettings : undefined,
            modalSettings: updates.modalSettings !== undefined ? updates.modalSettings : undefined,
            wizardSettings: updates.wizardSettings !== undefined ? updates.wizardSettings : undefined,
            enabledTools: updates.enabledTools !== undefined ? updates.enabledTools : undefined,
            buttonText: updates.buttonText !== undefined ? updates.buttonText : undefined,
            buttonStyle: updates.buttonStyle !== undefined ? updates.buttonStyle : undefined,
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
            safeAreaOffset: updates.safeAreaOffset || {},
            paperSize: updates.paperSize,
            customPaperDimensions: updates.customPaperDimensions || {},
            unit: updates.unit,
            showRulers: !!updates.showRulers,
            showSafeArea: !!updates.showSafeArea,
            // New fields
            designerLayout: updates.designerLayout || "redirect",
            inlineSettings: updates.inlineSettings || {},
            modalSettings: updates.modalSettings || {},
            wizardSettings: updates.wizardSettings || {},
            enabledTools: updates.enabledTools || {},
            buttonText: updates.buttonText || "Design It",
            buttonStyle: updates.buttonStyle || {},
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

// 6. Create Asset
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
