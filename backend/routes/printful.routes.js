import express from 'express';
import PrintfulService from '../services/printfulService.js';
import prisma from '../config/database.js';
import { shopify } from '../config/shopify.js';
import axios from 'axios';
import { uploadToS3 } from '../services/s3Service.js';
import { getCDNUrl } from '../config/s3.js';
import NodeCache from 'node-cache';

const router = express.Router();

// Cache for catalog data (5 minutes TTL to reduce API calls)
const catalogCache = new NodeCache({ stdTTL: 300 });

// Cache for connection status (1 minute TTL to reduce database queries)
const statusCache = new NodeCache({ stdTTL: 60 });

// Flag to prevent multiple sync operations
let isSyncing = false;
let lastSyncAttempt = 0;

/**
 * Download image from URL and upload to our S3
 * @param {string} imageUrl - Source image URL
 * @param {string} shop - Shop domain
 * @param {string} productId - Printful product ID
 * @returns {Promise<string>} - S3 URL
 */
async function downloadAndUploadToS3(imageUrl, shop, productId) {
    try {
        console.log('[Printful] Downloading image from:', imageUrl);
        
        // Download image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        // Extract file extension from URL or content type
        const urlExt = imageUrl.split('.').pop().split('?')[0];
        const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(urlExt) ? urlExt : 'jpg';
        
        // Generate S3 key
        const timestamp = Date.now();
        const key = `${shop}/printful/${productId}/${timestamp}.${ext}`;
        
        console.log('[Printful] Uploading to S3:', key);
        
        // Upload to S3
        const s3Url = await uploadToS3(buffer, key, contentType);
        const cdnUrl = getCDNUrl(s3Url);
        
        console.log('[Printful] Image uploaded successfully:', cdnUrl);
        
        return cdnUrl;
    } catch (error) {
        console.error('[Printful] Failed to download/upload image:', error.message);
        // Return original URL as fallback
        return imageUrl;
    }
}

/**
 * GET /imcst_api/printful/status
 * Check Printful connection status
 */
router.get('/status', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        
        console.log('[Printful Status] Checking status for shop:', shop);
        
        // Check cache first
        const cacheKey = `status_${shop}`;
        const cached = statusCache.get(cacheKey);
        if (cached) {
            console.log('[Printful Status] Returning cached status');
            return res.json(cached);
        }

        const connection = await prisma.printfulConnection.findUnique({
            where: { shop },
            select: {
                connected: true,
                storeId: true,
                createdAt: true,
                updatedAt: true
            }
        });
        
        console.log('[Printful Status] Connection found:', !!connection);
        console.log('[Printful Status] Connection data:', connection);

        const response = !connection ? {
            connected: false,
            message: 'No Printful connection found'
        } : {
            connected: connection.connected,
            storeId: connection.storeId,
            connectedAt: connection.createdAt,
            lastUpdated: connection.updatedAt
        };
        
        // Cache the response
        statusCache.set(cacheKey, response);
        console.log('[Printful Status] Cached status for 60 seconds');

        console.log('[Printful Status] Returning connected status:', response.connected);
        res.json(response);
    } catch (error) {
        console.error('[Printful] Error checking status:', error);
        res.status(500).json({ error: 'Failed to check Printful status' });
    }
});

/**
 * POST /imcst_api/printful/connect
 * Save Printful API key
 */
router.post('/connect', async (req, res) => {
    console.log('[Printful Connect] POST /connect received');
    console.log('[Printful Connect] Body:', req.body);

    try {
        const shop = res.locals.shopify.session.shop;
        const { accessToken } = req.body;

        console.log('[Printful Connect] Shop:', shop);
        console.log('[Printful Connect] Access token present:', !!accessToken);

        if (!accessToken) {
            console.log('[Printful Connect] No access token provided');
            return res.status(400).json({ error: 'Access token is required' });
        }

        const printful = new PrintfulService(accessToken.trim());
        let storeId = null;
        let validationPassed = false;

        // Try v2 /stores (needs store_management scope)
        try {
            const storeInfo = await printful.getStoreInfo();
            const stores = storeInfo?.result || storeInfo?.data || [];
            storeId = Array.isArray(stores) ? stores[0]?.id?.toString() : stores?.id?.toString();
            validationPassed = true;
            console.log('[Printful Connect] Validated via /stores. Store ID:', storeId);
        } catch (e1) {
            console.warn('[Printful Connect] /stores failed:', e1.message);

            // Try v2 /catalog-products (needs catalog scope, public access)
            try {
                await printful.getCatalogProducts({ limit: 1 });
                validationPassed = true;
                console.log('[Printful Connect] Validated via /catalog-products.');
            } catch (e2) {
                console.warn('[Printful Connect] /catalog-products failed:', e2.message);

                // If both fail with 401, token is genuinely invalid
                if (e2.message.includes('401') || e1.message.includes('401')) {
                    return res.status(400).json({
                        error: 'Invalid Printful API key',
                        details: 'Token rejected by Printful API (401 Unauthorized). Please check the token and ensure it has the required scopes.',
                    });
                }

                // Other errors (network, 5xx) — accept token but warn
                validationPassed = true;
                console.warn('[Printful Connect] Could not validate token due to non-auth error. Saving anyway.');
            }
        }

        // Save to database
        const connection = await prisma.printfulConnection.upsert({
            where: { shop },
            create: {
                shop,
                accessToken: accessToken.trim(),
                storeId: storeId,
                connected: true
            },
            update: {
                accessToken: accessToken.trim(),
                storeId: storeId,
                connected: true,
                updatedAt: new Date()
            }
        });

        console.log('[Printful] Connected for shop:', shop);
        
        // Clear status cache
        statusCache.del(`status_${shop}`);

        res.json({
            success: true,
            message: 'Printful connected successfully',
            storeId: connection.storeId
        });
    } catch (error) {
        console.error('[Printful] Error connecting:', error);
        res.status(500).json({ error: 'Failed to connect Printful' });
    }
});

/**
 * DELETE /imcst_api/printful/disconnect
 * Disconnect Printful
 */
router.delete('/disconnect', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;

        await prisma.printfulConnection.update({
            where: { shop },
            data: { connected: false }
        });

        console.log('[Printful] Disconnected for shop:', shop);
        
        // Clear status cache
        statusCache.del(`status_${shop}`);

        res.json({
            success: true,
            message: 'Printful disconnected successfully'
        });
    } catch (error) {
        console.error('[Printful] Error disconnecting:', error);
        res.status(500).json({ error: 'Failed to disconnect Printful' });
    }
});

/**
 * GET /imcst_api/printful/catalog
 * Get Printful catalog products
 */
/**
 * GET /imcst_api/printful/catalog
 * Get Printful catalog products from database (with auto-sync)
 */
router.get('/catalog', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        console.log('[Printful Catalog] Request from shop:', shop);

        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });

        if (!connection || !connection.connected) {
            return res.status(400).json({ error: 'Printful not connected' });
        }

        // Parse pagination params
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';

        console.log('[Printful Catalog] Checking sync status...');
        
        // Check if catalog needs sync (older than 24 hours or empty)
        const latestSync = await prisma.printfulCatalog.findFirst({
            orderBy: { syncedAt: 'desc' }
        });
        
        console.log('[Printful Catalog] Latest sync:', latestSync?.syncedAt);

        const needsSync = !latestSync || 
            (Date.now() - latestSync.syncedAt.getTime()) > 24 * 60 * 60 * 1000;

        // Sync in background if needed (don't wait for it)
        // But prevent multiple syncs from running simultaneously
        if (needsSync && !isSyncing) {
            // Prevent sync if last attempt was less than 5 minutes ago
            const timeSinceLastAttempt = Date.now() - lastSyncAttempt;
            if (timeSinceLastAttempt > 5 * 60 * 1000) {
                console.log('[Printful] Catalog needs sync, syncing in background...');
                lastSyncAttempt = Date.now();
                syncCatalogInBackground(connection.accessToken).catch(err => {
                    console.error('[Printful] Background sync failed:', err);
                });
            } else {
                console.log('[Printful] Sync already attempted recently, skipping...');
            }
        }

        // Get products from database
        const whereClause = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { type: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } }
            ]
        } : {};

        const [products, total] = await Promise.all([
            prisma.printfulCatalog.findMany({
                where: whereClause,
                skip: offset,
                take: limit,
                orderBy: { productId: 'asc' }
            }),
            prisma.printfulCatalog.count({ where: whereClause })
        ]);

        // Format response similar to Printful API
        res.json({
            data: products.map(p => ({
                id: p.productId,
                name: p.name,
                type: p.type,
                brand: p.brand,
                model: p.model,
                image: p.image,
                description: p.description
            })),
            paging: {
                total,
                offset,
                limit
            }
        });
    } catch (error) {
        console.error('[Printful] Error fetching catalog:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to fetch catalog'
        });
    }
});

/**
 * POST /imcst_api/printful/catalog/sync
 * Manually trigger catalog sync
 */
router.post('/catalog/sync', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;

        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });

        if (!connection || !connection.connected) {
            return res.status(400).json({ error: 'Printful not connected' });
        }

        console.log('[Printful] Manual catalog sync triggered');
        await syncCatalogInBackground(connection.accessToken);

        res.json({ 
            success: true, 
            message: 'Catalog sync completed' 
        });
    } catch (error) {
        console.error('[Printful] Error syncing catalog:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to sync catalog'
        });
    }
});

/**
 * Background function to sync Printful catalog to database
 */
async function syncCatalogInBackground(accessToken) {
    // Prevent multiple syncs
    if (isSyncing) {
        console.log('[Printful Sync] Sync already in progress, skipping...');
        return 0;
    }
    
    isSyncing = true;
    const printful = new PrintfulService(accessToken);
    let offset = 0;
    const limit = 100; // Fetch 100 at a time
    let hasMore = true;
    let totalSynced = 0;

    console.log('[Printful Sync] Starting catalog sync...');

    try {
        while (hasMore) {
            try {
                const response = await printful.getCatalogProducts({ limit, offset });
                const products = response.data || response.result || [];

                if (products.length === 0) {
                    hasMore = false;
                    break;
                }

                // Upsert products to database
                for (const product of products) {
                    await prisma.printfulCatalog.upsert({
                        where: { productId: product.id },
                        create: {
                            productId: product.id,
                            name: product.name || 'Unnamed Product',
                            type: product.type,
                            brand: product.brand,
                            model: product.model,
                            image: product.image,
                            description: product.description,
                            catalogData: product,
                            syncedAt: new Date()
                        },
                        update: {
                            name: product.name || 'Unnamed Product',
                            type: product.type,
                            brand: product.brand,
                            model: product.model,
                            image: product.image,
                            description: product.description,
                            catalogData: product,
                            syncedAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                    totalSynced++;
                }

                console.log(`[Printful Sync] Synced ${totalSynced} products...`);

                offset += limit;
                
                // Check if there are more products
                if (response.paging) {
                    hasMore = offset < response.paging.total;
                } else {
                    hasMore = products.length === limit;
                }

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error('[Printful Sync] Error during sync:', error.message);
                // Continue with next batch even if one fails
                offset += limit;
                
                // If it's a rate limit error, stop syncing
                if (error.message.includes('limit') || error.message.includes('429')) {
                    console.log('[Printful Sync] Rate limit hit, stopping sync');
                    break;
                }
            }
        }

        console.log(`[Printful Sync] Completed! Total synced: ${totalSynced} products`);
        return totalSynced;
    } finally {
        // Always reset flag when done
        isSyncing = false;
    }
}

/**
 * GET /imcst_api/printful/orders
 * Get Printful orders for this shop
 */
router.get('/orders', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        
        const orders = await prisma.printfulOrder.findMany({
            where: { shop },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        
        res.json({ orders });
    } catch (error) {
        console.error('[Printful] Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * GET /imcst_api/printful/orders/:orderId
 * Get specific Printful order details
 */
router.get('/orders/:orderId', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { orderId } = req.params;
        
        const order = await prisma.printfulOrder.findFirst({
            where: {
                shop,
                shopifyOrderId: orderId
            }
        });
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Get order details from Printful if we have printfulOrderId
        if (order.printfulOrderId) {
            const connection = await prisma.printfulConnection.findUnique({
                where: { shop }
            });
            
            if (connection && connection.connected) {
                const printful = new PrintfulService(connection.accessToken);
                try {
                    const printfulOrder = await printful.getOrder(order.printfulOrderId);
                    order.printfulDetails = printfulOrder.data || printfulOrder.result;
                } catch (error) {
                    console.error('[Printful] Error fetching order from Printful:', error.message);
                }
            }
        }
        
        res.json({ order });
    } catch (error) {
        console.error('[Printful] Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

/**
 * POST /imcst_api/printful/orders/sync/:orderId
 * Manually sync a Shopify order to Printful
 */
router.post('/orders/sync/:orderId', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const session = res.locals.shopify.session;
        const { orderId } = req.params;
        
        console.log('[Printful] Manual sync requested for order:', orderId);
        
        // Fetch order from Shopify
        const client = new shopify.api.clients.Rest({ session });
        const response = await client.get({
            path: `orders/${orderId}`
        });
        
        const orderData = response.body.order;
        
        // Import handler
        const { handleOrderCreate } = await import('../handlers/printfulOrderHandler.js');
        const result = await handleOrderCreate(shop, orderData);
        
        if (!result) {
            return res.status(400).json({ 
                error: 'Order does not contain Printful products or already synced' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Order synced to Printful',
            printfulOrderId: result.printfulOrderId
        });
    } catch (error) {
        console.error('[Printful] Error syncing order:', error);
        res.status(500).json({ 
            error: 'Failed to sync order',
            details: error.message
        });
    }
});

/**
 * GET /imcst_api/printful/catalog/:id
 * Get catalog product details
 */
router.get('/catalog/:id', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { id } = req.params;

        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });

        if (!connection || !connection.connected) {
            return res.status(400).json({ error: 'Printful not connected' });
        }

        const printful = new PrintfulService(connection.accessToken);

        // Fetch in parallel — techniques may return empty on 404 (graceful)
        const [product, variants, techniques] = await Promise.all([
            printful.getCatalogProduct(id),
            printful.getCatalogVariants(id),
            printful.getProductTechniques(id).catch(() => ({ data: [] }))
        ]);

        // Printful v2 uses `data` field (not `result`)
        res.json({
            product: product.data || product.result,
            variants: variants.data || variants.result || [],
            techniques: techniques.data || techniques.result || []
        });
    } catch (error) {
        console.error('[Printful] Error fetching product details:', error);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});

/**
 * GET /imcst_api/printful/catalog/:id/mockups
 * Get mockup templates
 */
router.get('/catalog/:id/mockups', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { id } = req.params;

        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });

        if (!connection || !connection.connected) {
            return res.status(400).json({ error: 'Printful not connected' });
        }

        const printful = new PrintfulService(connection.accessToken);
        const mockups = await printful.getMockupTemplates(id);

        res.json(mockups);
    } catch (error) {
        console.error('[Printful] Error fetching mockups:', error);
        res.status(500).json({ error: 'Failed to fetch mockups' });
    }
});

/**
 * GET /imcst_api/printful/products
 * Get imported Printful products
 */
router.get('/products', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;

        const products = await prisma.printfulProduct.findMany({
            where: { shop },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ products });
    } catch (error) {
        console.error('[Printful] Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

/**
 * POST /imcst_api/printful/import
 * Import Printful product to Shopify and create CustomFly config
 */
router.post('/import', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const session = res.locals.shopify.session;
        const { printfulProductId, margin = 50, productTitle, selectedVariants, isTemplateMode = false } = req.body;

        if (!printfulProductId) {
            return res.status(400).json({ error: 'Printful product ID is required' });
        }

        // Get Printful connection
        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });

        if (!connection || !connection.connected) {
            return res.status(400).json({ error: 'Printful not connected' });
        }

        // Fetch global settings if in template mode
        let globalSettings = null;
        if (isTemplateMode) {
            globalSettings = await prisma.merchantConfig.findUnique({
                where: {
                    shop_shopifyProductId: {
                        shop,
                        shopifyProductId: 'GLOBAL'
                    }
                }
            });
            console.log('[Printful Import] Template mode enabled, global settings:', globalSettings ? 'found' : 'not found');
        }

        const printful = new PrintfulService(connection.accessToken);

        // Fetch product details from Printful — techniques may 404, that's OK
        console.log('[Printful Import] Fetching product details for:', printfulProductId);
        const [productData, variantsData, techniquesData, mockupsData] = await Promise.all([
            printful.getCatalogProduct(printfulProductId),
            printful.getCatalogVariants(printfulProductId),
            printful.getProductTechniques(printfulProductId).catch(() => ({ data: [] })),
            printful.getMockupTemplates(printfulProductId).catch(() => ({ result: [] }))
        ]);

        // Printful v2 uses `data` field, fallback to `result` for safety
        const product = productData.data || productData.result;
        const variants = variantsData.data || variantsData.result || [];
        const techniques = techniquesData.data || techniquesData.result || [];
        const mockups = mockupsData.result || mockupsData.data || [];

        // Get print area from first technique (if available)
        const printArea = techniques[0]?.print_areas?.[0] || null;

        // Get mockup URL (front view)
        const frontMockup = mockups.find(m => m.placement === 'front') || mockups[0];
        let mockupUrl = frontMockup?.mockup_url || product?.image || null;
        
        // Download mockup and upload to our S3 to avoid CORS issues
        if (mockupUrl) {
            mockupUrl = await downloadAndUploadToS3(mockupUrl, shop, printfulProductId);
        }
        
        // Also download all mockup URLs for storage
        const s3MockupUrls = await Promise.all(
            mockups.map(async (m) => {
                const s3Url = await downloadAndUploadToS3(m.mockup_url, shop, printfulProductId);
                return {
                    placement: m.placement,
                    url: s3Url
                };
            })
        );

        // Filter variants if specific ones selected
        let variantsToImport = variants;
        if (selectedVariants && selectedVariants.length > 0) {
            variantsToImport = variants.filter(v => selectedVariants.includes(v.id));
        }

        // Create Shopify product using GraphQL (API 2024+ compatible)
        const client = new shopify.api.clients.Graphql({ session });

        const title = productTitle || product?.name || 'Printful Product';
        const description = product?.description || `Customizable ${title}`;

        // Step 1: Create product (no options/variants in ProductInput for API 2024+)
        const productMutation = `
            mutation productCreate($input: ProductInput!) {
                productCreate(input: $input) {
                    product {
                        id
                        legacyResourceId
                        title
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const productInput = {
            title,
            descriptionHtml: description,
            productType: product?.type || 'Custom Product',
            vendor: 'Printful',
            tags: ['printful', 'customizable'],
            status: 'ACTIVE'
        };

        console.log('[Printful Import] Creating Shopify product...');
        const productResponse = await client.request(productMutation, {
            variables: { input: productInput }
        });

        if (productResponse.data.productCreate.userErrors.length > 0) {
            console.error('[Printful Import] Shopify errors:', productResponse.data.productCreate.userErrors);
            return res.status(400).json({
                error: 'Failed to create Shopify product',
                details: productResponse.data.productCreate.userErrors
            });
        }

        const shopifyProduct = productResponse.data.productCreate.product;
        const shopifyProductId = shopifyProduct.legacyResourceId;
        console.log('[Printful Import] Shopify product created:', shopifyProductId);

        // Step 2: Add variants via bulk create (required for API 2024+)
        if (variantsToImport && variantsToImport.length > 0) {
            try {
                const bulkVariantMutation = `
                    mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                        productVariantsBulkCreate(productId: $productId, variants: $variants) {
                            productVariants {
                                id
                                title
                                price
                                sku
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `;

                const bulkVariants = variantsToImport.map(variant => {
                    const basePrice = parseFloat(variant.retail_price || variant.price || 0);
                    const sellingPrice = (basePrice * (1 + margin / 100)).toFixed(2);
                    return {
                        price: sellingPrice,
                        inventoryPolicy: 'CONTINUE',
                        inventoryItem: {
                            sku: variant.sku || `PF-${variant.id}`,
                            tracked: false
                        },
                        optionValues: [
                            { optionName: 'Title', name: `${variant.size || ''} ${variant.color || ''}`.trim() || 'Default' }
                        ]
                    };
                });

                const variantResponse = await client.request(bulkVariantMutation, {
                    variables: { productId: shopifyProduct.id, variants: bulkVariants }
                });

                if (variantResponse.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
                    console.warn('[Printful Import] Variant errors:', variantResponse.data.productVariantsBulkCreate.userErrors);
                } else {
                    console.log('[Printful Import] Variants created:', variantResponse.data?.productVariantsBulkCreate?.productVariants?.length);
                }
            } catch (varErr) {
                console.warn('[Printful Import] Variant creation warning (non-fatal):', varErr.message);
            }
        }

        // Upload mockup image to Shopify if available
        if (mockupUrl) {
            try {
                const mediaMutation = `
                    mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
                        productCreateMedia(media: $media, productId: $productId) {
                            media {
                                ... on MediaImage {
                                    id
                                    image {
                                        url
                                    }
                                }
                            }
                            mediaUserErrors {
                                field
                                message
                            }
                        }
                    }
                `;

                await client.request(mediaMutation, {
                    variables: {
                        productId: shopifyProduct.id,
                        media: [{
                            originalSource: mockupUrl,
                            alt: title,
                            mediaContentType: 'IMAGE'
                        }]
                    }
                });

                console.log('[Printful Import] Mockup image uploaded');
            } catch (error) {
                console.error('[Printful Import] Failed to upload mockup:', error);
            }
        }

        // Create CustomFly MerchantConfig
        const printAreaConfig = printArea ? {
            x: 0,
            y: 0,
            width: printArea.width || 12,
            height: printArea.height || 16
        } : {
            x: 0,
            y: 0,
            width: 12,
            height: 16
        };

        // Convert inches to pixels (assuming 300 DPI)
        const dpi = 300;
        const canvasWidth = Math.round((printArea?.width || 12) * dpi);
        const canvasHeight = Math.round((printArea?.height || 16) * dpi);

        // Prepare config data - use global settings if in template mode
        const configData = {
            shop,
            shopifyProductId,
            printArea: printAreaConfig,
            baseImage: mockupUrl || null, // Always use Printful mockup, never from global settings
            paperSize: globalSettings?.paperSize || 'Default',
            customPaperDimensions: globalSettings?.customPaperDimensions || null,
            unit: globalSettings?.unit || 'px',
            showSafeArea: globalSettings?.showSafeArea !== undefined ? globalSettings.showSafeArea : true,
            safeAreaPadding: globalSettings?.safeAreaPadding !== undefined ? globalSettings.safeAreaPadding : 0.5,
            safeAreaOffset: globalSettings?.safeAreaOffset || null,
            safeAreaShape: globalSettings?.safeAreaShape || null,
            safeAreaWidth: globalSettings?.safeAreaWidth || null,
            safeAreaHeight: globalSettings?.safeAreaHeight || null,
            safeAreaRadius: globalSettings?.safeAreaRadius || null,
            buttonText: globalSettings?.buttonText || 'Customize Your Design',
            designerLayout: 'inline', // Always use inline/direct design for Printful products
            showRulers: globalSettings?.showRulers !== undefined ? globalSettings.showRulers : false,
            enabledTools: globalSettings?.enabledTools || {
                text: true,
                image: true,
                shape: true,
                clipart: true
            }
        };

        console.log('[Printful Import] Config data:', {
            baseImage: configData.baseImage,
            safeAreaPadding: configData.safeAreaPadding,
            showSafeArea: configData.showSafeArea,
            paperSize: configData.paperSize,
            designerLayout: configData.designerLayout,
            isTemplateMode
        });

        const merchantConfig = await prisma.merchantConfig.upsert({
            where: {
                shop_shopifyProductId: {
                    shop,
                    shopifyProductId
                }
            },
            create: configData,
            update: {
                printArea: printAreaConfig,
                baseImage: mockupUrl || null, // Always use Printful mockup
                paperSize: configData.paperSize,
                customPaperDimensions: configData.customPaperDimensions,
                safeAreaPadding: configData.safeAreaPadding,
                showSafeArea: configData.showSafeArea,
                updatedAt: new Date()
            }
        });

        console.log('[Printful Import] MerchantConfig created');

        // Save PrintfulProduct mapping (use upsert to handle re-imports)
        const printfulProduct = await prisma.printfulProduct.upsert({
            where: {
                shop_printfulProductId: {
                    shop,
                    printfulProductId: printfulProductId.toString()
                }
            },
            create: {
                shop,
                printfulProductId: printfulProductId.toString(),
                shopifyProductId,
                status: 'synced',
                printArea: printArea || {},
                mockupUrls: s3MockupUrls
            },
            update: {
                shopifyProductId,
                status: 'synced',
                printArea: printArea || {},
                mockupUrls: s3MockupUrls,
                updatedAt: new Date()
            }
        });

        console.log('[Printful Import] Import completed successfully');

        res.json({
            success: true,
            message: 'Product imported successfully',
            shopifyProductId,
            printfulProductId: printfulProduct.id,
            designerUrl: `/designer/${shopifyProductId}`,
            product: {
                id: shopifyProductId,
                title: shopifyProduct.title,
                variantCount: variantsToImport?.length || 0
            }
        });

    } catch (error) {
        console.error('[Printful Import] Error:', error);
        res.status(500).json({
            error: 'Failed to import product',
            details: error.message
        });
    }
});

/**
 * POST /imcst_api/printful/sync/:productId
 * Re-sync product pricing and stock from Printful
 */
router.post('/sync/:productId', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const session = res.locals.shopify.session;
        const { productId } = req.params;

        // Find PrintfulProduct mapping
        const printfulProduct = await prisma.printfulProduct.findFirst({
            where: {
                shop,
                shopifyProductId: productId
            }
        });

        if (!printfulProduct) {
            return res.status(404).json({ error: 'Product not found in Printful mapping' });
        }

        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });

        if (!connection || !connection.connected) {
            return res.status(400).json({ error: 'Printful not connected' });
        }

        const printful = new PrintfulService(connection.accessToken);

        // Fetch latest variants from Printful
        const variantsData = await printful.getCatalogVariants(printfulProduct.printfulProductId);
        const variants = variantsData.result;

        // Update Shopify product variants pricing
        const client = new shopify.api.clients.Graphql({ session });

        // Get current Shopify variants
        const productQuery = `
            query getProduct($id: ID!) {
                product(id: $id) {
                    variants(first: 100) {
                        edges {
                            node {
                                id
                                sku
                                price
                            }
                        }
                    }
                }
            }
        `;

        const productResponse = await client.request(productQuery, {
            variables: { id: `gid://shopify/Product/${productId}` }
        });

        const shopifyVariants = productResponse.data.product.variants.edges;

        // Update prices (maintain same margin)
        const updatePromises = shopifyVariants.map(async (variantEdge) => {
            const variant = variantEdge.node;
            const sku = variant.sku;

            // Find matching Printful variant by SKU
            const printfulVariant = variants.find(v => v.sku === sku);

            if (printfulVariant) {
                const basePrice = parseFloat(printfulVariant.retail_price || printfulVariant.price || 0);
                const currentPrice = parseFloat(variant.price);
                const margin = ((currentPrice - basePrice) / basePrice) * 100;
                const newPrice = (basePrice * (1 + margin / 100)).toFixed(2);

                const updateMutation = `
                    mutation productVariantUpdate($input: ProductVariantInput!) {
                        productVariantUpdate(input: $input) {
                            productVariant {
                                id
                                price
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `;

                return client.request(updateMutation, {
                    variables: {
                        input: {
                            id: variant.id,
                            price: newPrice
                        }
                    }
                });
            }
        });

        await Promise.all(updatePromises.filter(Boolean));

        // Update sync status
        await prisma.printfulProduct.update({
            where: { id: printfulProduct.id },
            data: {
                status: 'synced',
                updatedAt: new Date()
            }
        });

        console.log('[Printful Sync] Product synced:', productId);

        res.json({
            success: true,
            message: 'Product synced successfully',
            variantsUpdated: updatePromises.filter(Boolean).length
        });

    } catch (error) {
        console.error('[Printful Sync] Error:', error);
        res.status(500).json({
            error: 'Failed to sync product',
            details: error.message
        });
    }
});

/**
 * DELETE /imcst_api/printful/products/:id
 * Remove Printful product mapping (doesn't delete Shopify product)
 */
router.delete('/products/:id', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { id } = req.params;

        await prisma.printfulProduct.delete({
            where: {
                id,
                shop
            }
        });

        console.log('[Printful] Product mapping deleted:', id);

        res.json({
            success: true,
            message: 'Product mapping removed'
        });

    } catch (error) {
        console.error('[Printful] Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product mapping' });
    }
});

export default router;
