import express from "express";
import { shopify } from "../config/shopify.js";
import prisma from "../config/database.js";
import NodeCache from "node-cache";

import { transformDesignUrls } from "../config/s3.js";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Get Merchant Config
router.get("/config/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;

        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop,
                    shopifyProductId: String(productId)
                }
            }
        });

        res.json(config ? transformDesignUrls(config) : {});
    } catch (error) {
        console.error("Error fetching config:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get Configured Products
router.get("/configured-products", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const configs = await prisma.merchantConfig.findMany({
            where: { shop }
        });
        res.json(configs.map(c => transformDesignUrls(c)));
    } catch (error) {
        console.error("Error fetching configured products:", error);
        res.status(500).json({ error: error.message });
    }
});

// Save Merchant Config
router.post("/config", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { productId, ...configData } = req.body;

        if (!productId) return res.status(400).json({ error: "Product ID required" });

        // Clean up data for prisma (remove extra fields if any)
        const allowedFields = [
            'printArea', 'baseImage', 'masks', 'baseImageColor', 'baseImageColorEnabled',
            'baseImageProperties', 'selectedColorAssetId', 'customPaperDimensions',
            'paperSize', 'safeAreaOffset', 'safeAreaPadding', 'safeAreaShape',
            'showRulers', 'showSafeArea', 'unit', 'baseImageAsMask', 'safeAreaHeight',
            'safeAreaRadius', 'safeAreaWidth', 'variantBaseImages', 'buttonStyle',
            'selectedBaseColorAssetId',
            'buttonText', 'designerLayout', 'enabledTools', 'inlineSettings',
            'modalSettings', 'wizardSettings', 'outputSettings', 'colorAssetId',
            'fontAssetId', 'galleryAssetId', 'optionAssetId', 'shapeAssetId',
            // Toolbar feature flags
            'enabledGrid', 'enabledUndoRedo', 'enabledDownload', 'enabledReset', 'showGrid'
        ];

        const cleanData = {};
        Object.keys(configData).forEach(key => {
            if (allowedFields.includes(key)) cleanData[key] = configData[key];
        });

        const config = await prisma.merchantConfig.upsert({
            where: {
                shop_shopifyProductId: {
                    shop,
                    shopifyProductId: String(productId)
                }
            },
            update: cleanData,
            create: {
                shop,
                shopifyProductId: String(productId),
                ...cleanData
            }
        });

        // Clear public API cache for this product
        const cacheKey = `pub_prod_${shop}_${productId}`;
        cache.del(cacheKey);

        res.json(transformDesignUrls(config));
    } catch (error) {
        console.error("Error saving config:", error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy to Shopify Admin API: Get Products
router.get("/products", async (req, res) => {
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

        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get single product by ID
router.get("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const session = res.locals.shopify.session;

        const cacheKey = `product_${session.shop}_${id}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

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
            }),
            shop: session.shop
        };

        cache.set(cacheKey, product, 300);
        res.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle Product Status
router.put("/products/:gid/status", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const client = new shopify.api.clients.Graphql({ session });
        const { gid } = req.params;
        const { status } = req.body;

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

// Get Collections
router.get("/collections", async (req, res) => {
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
        res.json(response.data.collections.edges.map(e => ({
            id: e.node.id.split('/').pop(),
            title: e.node.title
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
