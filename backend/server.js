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
        return await baseStorage.loadSession(id);
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
    useOnlineTokens: true,
    exitIframePath: "/exitiframe",
});

console.log("SHOPIFY CONFIG:", {
    apiKey: shopify.api.config.apiKey,
    hostName: shopify.api.config.hostName,
    apiSecretKey: shopify.api.config.apiSecretKey ? "***" : "MISSING",
    scopes: shopify.api.config.scopes,
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
                            variants(first: 20) {
                                edges {
                                    node {
                                        id
                                        title
                                        sku
                                        price
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
                variants: node.variants.edges.map(v => ({
                    id: v.node.id.split('/').pop(),
                    gid: v.node.id,
                    title: v.node.title,
                    sku: v.node.sku,
                    price: v.node.price
                })),
                collections: node.collections.edges.map(c => ({
                    id: c.node.id.split('/').pop(),
                    gid: c.node.id,
                    title: c.node.title
                }))
            };
        });

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
                    variants(first: 100) {
                        edges {
                            node {
                                id
                                title
                                sku
                                price
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
            variants: node.variants.edges.map(v => ({
                id: v.node.id.split('/').pop(),
                gid: v.node.id,
                title: v.node.title,
                sku: v.node.sku,
                price: v.node.price
            }))
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
    const { productId, printArea, baseImage } = req.body;
    const shop = res.locals.shopify.session.shop;

    const config = await prisma.merchantConfig.upsert({
        where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        update: { printArea: printArea || {}, baseImage },
        create: { shop, shopifyProductId: productId, printArea: printArea || {}, baseImage },
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
            select: { shopifyProductId: true }
        });
        res.json(configs.map(c => c.shopifyProductId));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Save or Update Design
app.post("/imcst_api/design", async (req, res) => {
    try {
        const { id, name, designJson, previewUrl, shopifyProductId } = req.body;
        const shop = res.locals.shopify.session.shop;

        if (id) {
            // Update existing design
            const updatedDesign = await prisma.savedDesign.update({
                where: { id, shop }, // Security: Must match shop
                data: {
                    name: name || "Untitled Design",
                    designJson,
                    previewUrl,
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
                },
            });
            return res.json(design);
        }
    } catch (error) {
        console.error("Save design error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Get Design by ID
app.get("/imcst_api/design/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        const design = await prisma.savedDesign.findUnique({
            where: { id }
        });

        // Security check: design must belong to the shop
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
        res.status(500).json({ error: error.message });
    }
});

// 4c. Delete Design
app.delete("/imcst_api/design/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        const design = await prisma.savedDesign.findUnique({ where: { id } });

        if (!design || design.shop !== shop) {
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
