import express from "express";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import prisma from "../config/database.js";
import { shopify } from "../config/shopify.js";
import NodeCache from "node-cache";
import { transformDesignUrls } from "../config/s3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_PATH = resolve(__dirname, "../../frontend/dist");

const router = express.Router();
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Extracts URL string from base image data (supports both string and object formats)
 * @param {any} img - Base image data (string URL or object with url property)
 * @returns {string|null} URL string or null
 */
const extractBaseImageUrl = (img) => {
    if (!img) return null;

    // Object format with url property
    if (typeof img === 'object' && img.url) {
        return img.url;
    }

    // Plain string URL
    if (typeof img === 'string' && img !== 'none') {
        return img;
    }

    return null;
};

// Storefront Loader JS
router.get(["/loader.js", "/storefront.js"], async (req, res) => {
    try {
        const { shop } = req.query;
        // Shop is no longer strictly required for the loader script itself,
        // as configuration is fetched later based on DOM data-attributes.

        const cacheKey = shop ? `loader_js_${shop}` : "loader_js_global";
        const cached = cache.get(cacheKey);

        // Force bypass if cache_bust is present in query
        if (req.query.cache_bust || req.query.v) {
            cache.del(cacheKey);
        } else if (cached) {
            res.set("Content-Type", "application/javascript");
            res.set("Cache-Control", "no-cache, no-store, must-revalidate");
            res.set("Pragma", "no-cache");
            res.set("Expires", "0");
            return res.send(cached);
        }

        const publicHtmlPath = resolve(STATIC_PATH, "public.html");
        console.log("[IMCST] Reading public.html from:", publicHtmlPath);
        if (!fs.existsSync(publicHtmlPath)) {
            return res.status(404).send("// public.html not found");
        }

        const html = fs.readFileSync(publicHtmlPath, "utf-8");
        const jsRegex = /src="(.*?\/(?:assets|imcst_assets)\/(?:designer-storefront|public)-.*?\.js)"/;
        const cssRegex = /href="(.*?\/(?:assets|imcst_assets)\/.*?\.css)"/g;

        const jsMatch = html.match(jsRegex);
        const cssMatches = [...html.matchAll(cssRegex)];

        console.log("[IMCST] JS Match:", jsMatch ? jsMatch[1] : "NOT FOUND");
        console.log("[IMCST] CSS Matches count:", cssMatches.length);

        if (!jsMatch) {
            console.warn("[IMCST] JS match failed. HTML snippet:", html.substring(0, 500));
            return res.status(404).send("// JS bundle not found in public.html");
        }

        const appUrl = process.env.SHOPIFY_APP_URL || 'https://custom.duniasantri.com';
        const useCdn = String(process.env.ENABLE_CDN).trim() === "true";
        const cdnUrl = process.env.CDN_URL;

        console.log("[IMCST] ENV Debug - ENABLE_CDN:", process.env.ENABLE_CDN, "useCdn:", useCdn, "CDN_URL:", cdnUrl);

        const baseUrl = (useCdn && cdnUrl) ? cdnUrl.trim() : appUrl.trim();

        console.log("[IMCST] Using Base URL for assets:", baseUrl);

        const toAbsolute = (url) => {
            if (url.startsWith('http')) return url;
            // Remove leading slash if present to avoid double slashes
            const path = url.startsWith('/') ? url.substring(1) : url;
            const fixedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
            return `${fixedBase}${path}`;
        };

        const jsUrl = toAbsolute(jsMatch[1]);
        const cssUrls = cssMatches.map(match => toAbsolute(match[1]));

        let loaderScript = `
(function() {
    console.log("[IMCST] Initializing storefront loader...");
    window.IMCST_BASE_URL = '${baseUrl}';
    
    // 1. Load Assets
    ${cssUrls.map(url => `
    if (!document.querySelector('link[href="${url}"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = '${url}';
        document.head.appendChild(link);
    }`).join('')}

    // 2. Load Main Bundle
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '${jsUrl}';
    document.head.appendChild(script);
})();
        `;

        cache.set(cacheKey, loaderScript, 30);
        res.set("Content-Type", "application/javascript");
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        res.send(loaderScript);
    } catch (error) {
        console.error("Storefront loader error:", error);
        res.status(500).send(`// Error generating loader: ${error.message}`);
    }
});

// imcst_public_api routes
router.get("/product/:shop/:shopifyProductId", async (req, res) => {
    try {
        const { shop, shopifyProductId } = req.params;
        const { t } = req.query;
        const cacheKey = `pub_prod_${shop}_${shopifyProductId}`;

        // Force clear cache if timestamp provided
        if (t) {
            cache.del(cacheKey);
        }

        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // Fetch specific and global to allow inheritance
        let config = await prisma.merchantConfig.findFirst({ where: { shop, shopifyProductId } });
        const globalConfig = await prisma.merchantConfig.findFirst({ where: { shop, shopifyProductId: 'GLOBAL' } });

        console.log('[Public API] Config from DB:', {
            productId: shopifyProductId,
            hasConfig: !!config,
            hasGlobalConfig: !!globalConfig,
            'config.baseImageColor': config?.baseImageColor,
            'config.baseImageColorEnabled': config?.baseImageColorEnabled,
            'config.baseImageColorMode': config?.baseImageColorMode,
            'globalConfig.baseImageColor': globalConfig?.baseImageColor,
            'globalConfig.baseImageColorEnabled': globalConfig?.baseImageColorEnabled,
            'globalConfig.baseImageColorMode': globalConfig?.baseImageColorMode
        });

        if (!config) {
            config = globalConfig;
        } else if (globalConfig) {
            // Soft Inheritance: Only use global if specific field is missing/empty
            if (!config.headerTitle) config.headerTitle = globalConfig.headerTitle;
            if (!config.buttonText) config.buttonText = globalConfig.buttonText;
            if (!config.buttonStyle || Object.keys(config.buttonStyle).length === 0) {
                config.buttonStyle = globalConfig.buttonStyle;
            }
            console.log(`[Config] Applied Global Fallbacks (if missing) for ${shopifyProductId}`);
        }

        let initialDesign = await prisma.savedDesign.findFirst({
            where: { shop, shopifyProductId: String(shopifyProductId), isTemplate: true },
            orderBy: { updatedAt: 'desc' }
        }) || await prisma.savedDesign.findFirst({
            where: { shop, shopifyProductId: 'GLOBAL', isTemplate: true },
            orderBy: { updatedAt: 'desc' }
        });

        let productData = null;
        try {
            const offlineSessionId = shopify.api.session.getOfflineId(shop);
            const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);
            if (session) {
                const client = new shopify.api.clients.Rest({ session });
                const response = await client.get({ path: `products/${shopifyProductId}` });
                productData = response.body.product;
                
                // Debug logging
                console.log('[Public API] Shopify Product Data:', {
                    productId: shopifyProductId,
                    hasOptions: !!productData?.options,
                    optionsCount: productData?.options?.length || 0,
                    options: productData?.options,
                    hasVariants: !!productData?.variants,
                    variantsCount: productData?.variants?.length || 0
                });
            }
        } catch (err) {
            console.error("[Public API] Failed to fetch Shopify product data:", err);
        }


        // Merge base image config from template into config object for frontend compatibility
        // IMPORTANT: Config values (from admin) ALWAYS take priority over template values
        if (initialDesign && initialDesign.designJson && initialDesign.designJson.length > 0) {
            const firstPage = initialDesign.designJson[0];
            // Only merge if config doesn't already have these values
            if (!config) config = {};

            // Base Image - Extract URL string and merge with config priority
            if (!config.baseImage && firstPage.baseImage) {
                config.baseImage = extractBaseImageUrl(firstPage.baseImage);
            } else if (config.baseImage) {
                // Ensure config baseImage is a URL string
                config.baseImage = extractBaseImageUrl(config.baseImage);
            }

            // Base Image Scale - Config takes priority
            if (!config.baseImageScale && firstPage.baseImageScale) config.baseImageScale = firstPage.baseImageScale;

            // Variant Base Images - Extract URLs and merge with config priority
            if (firstPage.variantBaseImages) {
                const extractedTemplateVariants = {};
                Object.keys(firstPage.variantBaseImages).forEach(key => {
                    extractedTemplateVariants[key] = extractBaseImageUrl(firstPage.variantBaseImages[key]);
                });

                if (!config.variantBaseImages) {
                    config.variantBaseImages = extractedTemplateVariants;
                } else {
                    // Extract config variant URLs and merge
                    const extractedConfigVariants = {};
                    Object.keys(config.variantBaseImages).forEach(key => {
                        extractedConfigVariants[key] = extractBaseImageUrl(config.variantBaseImages[key]);
                    });

                    // Merge: config values override template values for same variant
                    config.variantBaseImages = {
                        ...extractedTemplateVariants,
                        ...extractedConfigVariants
                    };
                }
            } else if (config.variantBaseImages) {
                // Extract URLs from existing config variants
                const extractedConfigVariants = {};
                Object.keys(config.variantBaseImages).forEach(key => {
                    extractedConfigVariants[key] = extractBaseImageUrl(config.variantBaseImages[key]);
                });
                config.variantBaseImages = extractedConfigVariants;
            }

            // Variant Base Scales - Merge with config priority
            if (firstPage.variantBaseScales) {
                if (!config.variantBaseScales) {
                    config.variantBaseScales = firstPage.variantBaseScales;
                } else {
                    // Merge: config values override template values for same variant
                    config.variantBaseScales = {
                        ...firstPage.variantBaseScales,
                        ...config.variantBaseScales
                    };
                }
            }

            // Color settings
            if (!config.baseImageColor && firstPage.baseImageColor) config.baseImageColor = firstPage.baseImageColor;
            if (config.baseImageColorEnabled === undefined && firstPage.baseImageColorEnabled !== undefined) {
                config.baseImageColorEnabled = firstPage.baseImageColorEnabled;
            }
            if (!config.baseImageColorMode && firstPage.baseImageColorMode) config.baseImageColorMode = firstPage.baseImageColorMode;

            // Mask settings
            if (config.baseImageAsMask === undefined && firstPage.baseImageAsMask !== undefined) {
                config.baseImageAsMask = firstPage.baseImageAsMask;
            }
            if (config.baseImageMaskInvert === undefined && firstPage.baseImageMaskInvert !== undefined) {
                config.baseImageMaskInvert = firstPage.baseImageMaskInvert;
            }

            // Properties (position, scale, etc.)
            if (!config.baseImageProperties && firstPage.baseImageProperties) {
                config.baseImageProperties = firstPage.baseImageProperties;
            }
        } else if (config) {
            // No template, but ensure config data is extracted to URL strings
            if (config.baseImage) {
                config.baseImage = extractBaseImageUrl(config.baseImage);
            }
            if (config.variantBaseImages) {
                const extractedConfigVariants = {};
                Object.keys(config.variantBaseImages).forEach(key => {
                    extractedConfigVariants[key] = extractBaseImageUrl(config.variantBaseImages[key]);
                });
                config.variantBaseImages = extractedConfigVariants;
            }
            
            // Ensure color settings are present even without template
            // These should already be in config from admin, just make sure they're not undefined
            if (config.baseImageColor === undefined) config.baseImageColor = null;
            if (config.baseImageColorEnabled === undefined) config.baseImageColorEnabled = false;
            if (config.baseImageColorMode === undefined) config.baseImageColorMode = 'transparent';
            if (config.baseImageAsMask === undefined) config.baseImageAsMask = false;
            if (config.baseImageMaskInvert === undefined) config.baseImageMaskInvert = false;
            if (config.baseImageScale === undefined) config.baseImageScale = 80;
        }

        const responseData = {
            config: config ? transformDesignUrls(config) : {},
            design: initialDesign ? transformDesignUrls(initialDesign.designJson) : null,
            product: productData
        };

        console.log('[Public API] Response Data:', {
            productId: shopifyProductId,
            'config.baseImage': responseData.config?.baseImage,
            'config.variantBaseImages': responseData.config?.variantBaseImages,
            'design[0].baseImage': responseData.design?.[0]?.baseImage,
            'design[0].variantBaseImages': responseData.design?.[0]?.variantBaseImages,
            hasConfig: !!responseData.config,
            hasDesign: !!responseData.design
        });

        if (productData) {
            const images = productData.images ? productData.images.map(img => img.src) : [];
            const variants = productData.variants ? productData.variants.map(v => {
                const imgObj = productData.images?.find(img => img.id === v.image_id);
                return { ...v, id: String(v.id), image: imgObj ? imgObj.src : null };
            }) : [];
            
            // Preserve all product data including options
            responseData.product = { 
                ...productData, 
                images, 
                variants,
                // Explicitly ensure options are included
                options: productData.options || []
            };
            
            console.log('[Public API] Response Product Data:', {
                hasOptions: !!responseData.product.options,
                optionsCount: responseData.product.options?.length || 0,
                options: responseData.product.options
            });
            
            cache.set(cacheKey, responseData);
        }
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Product Config for Storefront
router.get("/public/config/:shopifyProductId", async (req, res) => {
    try {
        const { shop, t } = req.query;
        const { shopifyProductId } = req.params;

        // Force clear cache if timestamp provided
        if (t) {
            const key1 = `pub_prod_${shop}_${shopifyProductId}`;
            cache.del(key1);
        }

        if (!shop) return res.status(400).json({ error: "Shop parameter required" });

        // Fetch specific and global to allow inheritance
        let config = await prisma.merchantConfig.findFirst({ where: { shop, shopifyProductId } });
        const globalConfig = await prisma.merchantConfig.findFirst({ where: { shop, shopifyProductId: 'GLOBAL' } });

        // If no specific config exists for this product, and it's not a request for GLOBAL itself,
        // then this product is not configured for customization.
        if (!config && shopifyProductId !== 'GLOBAL') {
            return res.json({});
        }

        // If specific config exists, apply global branding overrides
        if (config && globalConfig && shopifyProductId !== 'GLOBAL') {
            // Soft Inheritance: Only use global if specific field is missing/empty
            if (!config.headerTitle) config.headerTitle = globalConfig.headerTitle;
            if (!config.buttonText) config.buttonText = globalConfig.buttonText;
            if (!config.buttonStyle || Object.keys(config.buttonStyle).length === 0) {
                config.buttonStyle = globalConfig.buttonStyle;
            }
        }

        // If specific config is missing but it's a GLOBAL request, use globalConfig
        if (!config && shopifyProductId === 'GLOBAL') {
            config = globalConfig;
        }

        if (!config) return res.json({});

        res.json(transformDesignUrls(config));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pricing Calculation
router.post("/pricing/calculate", async (req, res) => {
    try {
        const { shop, productId, elements, quantity = 1 } = req.body;
        if (!shop || !productId) return res.status(400).json({ error: "Missing required fields" });

        const config = await prisma.productPricingConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });

        if (!config) return res.json({ total: 0, breakdown: {}, perUnitPrice: 0 });

        let globalFee = 0;
        let elementCharges = {};
        let totalElementCharges = 0;
        let elementBreakdown = {};

        if (config.globalPricing?.enabled) globalFee = config.globalPricing.basePrice || 0;

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
                        if (textConfig.minCharge && charge < textConfig.minCharge && charge > 0) charge = textConfig.minCharge;
                        if (textConfig.maxCharge && charge > textConfig.maxCharge) charge = textConfig.maxCharge;
                        if (charge > 0) {
                            elementCharges[el.id] = charge;
                            totalElementCharges += charge;
                            elementBreakdown[el.id] = charge;
                        }
                    }
                }
            });
        }

        if (config.imagePricing?.uploadFee > 0) {
            const imageCount = elements.filter(el => el.type === 'image' || el.type === 'upload').length;
            if (imageCount > 0) {
                const imgFee = imageCount * config.imagePricing.uploadFee;
                elementCharges['imageUploads'] = imgFee;
                totalElementCharges += imgFee;
                elementBreakdown['imageUploads'] = imgFee;
            }
        }

        const subtotalPerUnit = globalFee + totalElementCharges;
        let total = subtotalPerUnit * quantity;
        let bulkDiscount = 0;
        let appliedTier = null;

        if (config.bulkPricing?.enabled && config.bulkPricing.tiers?.length > 0) {
            const qty = parseInt(quantity) || 1;
            const sortedTiers = [...config.bulkPricing.tiers].sort((a, b) => b.minQuantity - a.minQuantity);
            const matchingTier = sortedTiers.find(t => qty >= t.minQuantity && (!t.maxQuantity || qty <= t.maxQuantity));
            if (matchingTier) {
                appliedTier = matchingTier;
                if (matchingTier.discountType === 'percentage') bulkDiscount = total * (matchingTier.discountValue / 100);
                else if (matchingTier.discountType === 'fixed') bulkDiscount = matchingTier.discountValue * qty;
            }
        }
        total -= bulkDiscount;

        let printingCost = 0;
        let printingMethodDetails = null;
        const requestedMethod = req.body.selectedMethod;

        const methods = config.printingMethods || {};
        const applyMethod = (m, name) => {
            if (name === 'screen') {
                const numColors = parseInt(req.body.numColors) || 1;
                const totalSetup = (m.setupFeePerColor || 0) * numColors;
                const totalPrint = (m.printFeePerItem || 0) * quantity;
                printingCost = (totalSetup + totalPrint) / quantity;
                printingMethodDetails = { method: 'Screen Print', totalPrintingFee: totalSetup + totalPrint };
            } else if (name === 'gang') {
                const sheets = Math.ceil(quantity / (m.designsPerSheet || 1));
                const totalFee = (m.setupFee || 0) + ((m.pricePerSheet || 0) * sheets);
                printingCost = totalFee / quantity;
                printingMethodDetails = { method: 'Gang Sheet', totalPrintingFee: totalFee };
            } else if (name === 'dtg') {
                const multiplier = m.sizeMultipliers?.[req.body.printSize || 'medium'] || 1;
                printingCost = (m.basePrice || 0) * multiplier;
                printingMethodDetails = { method: 'DTG', cost: printingCost };
            }
        };

        if (requestedMethod && methods[requestedMethod]?.enabled) applyMethod(methods[requestedMethod], requestedMethod);
        else if (methods.screenPrint?.enabled) applyMethod(methods.screenPrint, 'screen');
        else if (methods.gangSheet?.enabled) applyMethod(methods.gangSheet, 'gang');
        else if (methods.dtg?.enabled) applyMethod(methods.dtg, 'dtg');

        total += (printingCost * quantity);

        const appliedRules = [];
        if (config.pricingRules && Array.isArray(config.pricingRules)) {
            const textCount = elements.filter(e => e.type === 'text').length;
            const imageCount = elements.filter(e => e.type === 'image').length;
            const totalCount = elements.length;

            for (const rule of config.pricingRules) {
                let val = 0;
                if (rule.trigger === 'total_elements') val = totalCount;
                else if (rule.trigger === 'text_elements') val = textCount;
                else if (rule.trigger === 'image_elements') val = imageCount;

                let match = false;
                const thresh = parseFloat(rule.threshold) || 0;
                if (rule.operator === 'greater_than') match = val > thresh;
                else if (rule.operator === 'less_than') match = val < thresh;
                else if (rule.operator === 'equals') match = val === thresh;

                if (match) {
                    const rVal = parseFloat(rule.value) || 0;
                    let impact = 0;
                    if (rule.action === 'add_fee') { impact = rVal * quantity; total += impact; }
                    else if (rule.action === 'multiply_subtotal') { const prev = total; total *= rVal; impact = total - prev; }
                    appliedRules.push({ ...rule, impact });
                }
            }
        }

        let promoDiscount = 0;
        let appliedPromo = null;
        if (req.body.promoCode) {
            const promo = await prisma.promoCode.findFirst({
                where: { shop, code: req.body.promoCode.toUpperCase(), active: true }
            });
            if (promo && (!promo.usageLimit || promo.usageCount < promo.usageLimit) && (!promo.minOrderAmount || total >= promo.minOrderAmount)) {
                if (promo.discountType === 'percentage') promoDiscount = total * (promo.discountValue / 100);
                else if (promo.discountType === 'fixed_amount') promoDiscount = Math.min(total, promo.discountValue);
                total -= promoDiscount;
                appliedPromo = promo;
            }
        }

        res.json({
            breakdown: { globalFee, totalElementCharges, elementBreakdown, bulkDiscount, appliedTier, printingCost, printingMethodDetails, appliedRules, promoDiscount, appliedPromo, total },
            perUnitPrice: total / quantity,
            total
        });
    } catch (error) {
        console.error("Pricing error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Image Proxy to bypass CORS issues
router.get("/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    try {
        const response = await fetch(decodeURIComponent(url));
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        const buffer = Buffer.from(await response.arrayBuffer());

        res.setHeader("Content-Type", contentType || "image/png");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        res.send(buffer);
    } catch (error) {
        console.error("[Proxy Image] Error:", error);
        res.status(500).send(error.message);
    }
});

export default router;
