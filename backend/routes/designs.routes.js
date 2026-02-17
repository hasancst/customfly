import express from "express";
import prisma from "../config/database.js";
import { uploadBase64ToS3 } from "../services/s3Service.js";
import NodeCache from "node-cache";
import { getCDNUrl, transformDesignUrls } from "../config/s3.js";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });




// Admin: Save or Update Design
router.post(["/design", "/designs"], async (req, res) => {
    try {
        const { id, name, designJson, previewUrl, shopifyProductId, isTemplate, saveType } = req.body;
        const shop = res.locals.shopify.session.shop;

        // If saveType is 'global', save to DesignTemplate instead
        if (saveType === 'global') {
            let finalPreviewUrl = previewUrl;
            if (previewUrl && (previewUrl.startsWith('data:image') || (previewUrl.length > 500 && !previewUrl.startsWith('http')))) {
                try {
                    const key = `templates/${shop}/${Date.now()}.jpg`;
                    finalPreviewUrl = await uploadBase64ToS3(previewUrl, key);
                } catch (e) {
                    console.error("Failed to upload template preview to S3:", e);
                }
            }

            // Extract canvas settings from designJson
            const firstPage = designJson?.[0] || {};
            const paperSize = firstPage.paperSize || 'Custom';
            const unit = firstPage.unit || 'px';
            const customPaperDimensions = firstPage.customPaperDimensions;

            // Check if updating existing template
            if (id) {
                const existing = await prisma.designTemplate.findFirst({
                    where: { id, shop }
                });

                if (existing) {
                    const updatedTemplate = await prisma.designTemplate.update({
                        where: { id },
                        data: {
                            name: name || "Untitled Template",
                            pages: designJson,
                            thumbnail: finalPreviewUrl,
                            paperSize,
                            unit,
                            customPaperDimensions
                        }
                    });
                    return res.json({
                        ...updatedTemplate,
                        thumbnail: getCDNUrl(updatedTemplate.thumbnail),
                        pages: transformDesignUrls(updatedTemplate.pages)
                    });
                }
            }

            // Create new template
            const template = await prisma.designTemplate.create({
                data: {
                    shop,
                    name: name || "Untitled Template",
                    pages: designJson,
                    thumbnail: finalPreviewUrl,
                    paperSize,
                    unit,
                    customPaperDimensions,
                    tags: []
                }
            });

            return res.json({
                ...template,
                thumbnail: getCDNUrl(template.thumbnail),
                pages: transformDesignUrls(template.pages)
            });
        }

        // Regular design save (product-specific)
        let finalPreviewUrl = previewUrl;
        if (previewUrl && (previewUrl.startsWith('data:image') || (previewUrl.length > 500 && !previewUrl.startsWith('http')))) {
            try {
                const key = `previews/${shop}/${Date.now()}.jpg`;
                finalPreviewUrl = await uploadBase64ToS3(previewUrl, key);
            } catch (e) {
                console.error("Failed to upload admin design preview to S3:", e);
            }
        }

        if (id) {
            const updatedDesign = await prisma.savedDesign.update({
                where: { id, shop },
                data: {
                    name: name || "Untitled Design",
                    designJson,
                    previewUrl: finalPreviewUrl,
                    isTemplate: !!isTemplate
                },
            });
            return res.json({
                ...updatedDesign,
                previewUrl: getCDNUrl(updatedDesign.previewUrl),
                designJson: transformDesignUrls(updatedDesign.designJson)
            });
        } else {
            const design = await prisma.savedDesign.create({
                data: {
                    shop,
                    shopifyProductId: shopifyProductId ? String(shopifyProductId) : null,
                    name: name || "Untitled Design",
                    designJson,
                    previewUrl: finalPreviewUrl,
                    isTemplate: !!isTemplate
                },
            });
            return res.json({
                ...design,
                previewUrl: getCDNUrl(design.previewUrl),
                designJson: transformDesignUrls(design.designJson)
            });
        }
    } catch (error) {
        console.error("Save design error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get all designs
router.get(["/design", "/designs"], async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        
        // Get both saved designs and templates
        const [designs, templates] = await Promise.all([
            prisma.savedDesign.findMany({
                where: { shop },
                orderBy: [{ isTemplate: 'desc' }, { updatedAt: 'desc' }]
            }),
            prisma.designTemplate.findMany({
                where: { shop },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        // Transform saved designs
        const transformedDesigns = designs.map(d => ({
            ...d,
            previewUrl: getCDNUrl(d.previewUrl),
            productionFileUrl: getCDNUrl(d.productionFileUrl),
            designJson: transformDesignUrls(d.designJson)
        }));

        // Transform templates to match SavedDesign format for compatibility
        const transformedTemplates = templates.map(t => ({
            id: t.id,
            shop: t.shop,
            name: t.name,
            designJson: transformDesignUrls(t.pages),
            previewUrl: getCDNUrl(t.thumbnail),
            isTemplate: true,
            shopifyProductId: 'GLOBAL',
            status: 'draft',
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            _isStoreTemplate: true // Flag to identify store templates
        }));

        // Combine and return
        res.json([...transformedTemplates, ...transformedDesigns]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get Design by ID
router.get(["/design/product/:productId", "/designs/product/:productId"], async (req, res) => {
    try {
        const { productId } = req.params;
        const shop = res.locals.shopify.session.shop;

        const designs = await prisma.savedDesign.findMany({
            where: {
                shop,
                OR: [
                    { shopifyProductId: String(productId) },
                    { shopifyProductId: 'GLOBAL', isTemplate: true }
                ]
            },
            orderBy: { updatedAt: 'desc' }
        });

        const transformed = designs.map(d => ({
            ...d,
            previewUrl: getCDNUrl(d.previewUrl),
            productionFileUrl: getCDNUrl(d.productionFileUrl),
            designJson: transformDesignUrls(d.designJson)
        }));

        res.json(transformed);
    } catch (error) {
        console.error("Error fetching product designs:", error);
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get Design by ID
router.get(["/design/:id", "/designs/:id"], async (req, res, next) => {
    try {
        if (req.params.id === 'product') return next();
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        
        // Try to find in SavedDesign first
        let design = await prisma.savedDesign.findUnique({ where: { id } });
        
        if (design && design.shop === shop) {
            return res.json({
                ...design,
                previewUrl: getCDNUrl(design.previewUrl),
                productionFileUrl: getCDNUrl(design.productionFileUrl),
                designJson: transformDesignUrls(design.designJson)
            });
        }
        
        // If not found, try DesignTemplate
        const template = await prisma.designTemplate.findUnique({ where: { id } });
        
        if (template && template.shop === shop) {
            return res.json({
                id: template.id,
                shop: template.shop,
                name: template.name,
                designJson: transformDesignUrls(template.pages),
                previewUrl: getCDNUrl(template.thumbnail),
                isTemplate: true,
                shopifyProductId: 'GLOBAL',
                status: 'draft',
                createdAt: template.createdAt,
                updatedAt: template.updatedAt,
                _isStoreTemplate: true
            });
        }
        
        return res.status(404).json({ error: "Design not found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete Design
router.delete(["/design/:id", "/designs/:id"], async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        
        // Try to find in SavedDesign first
        const design = await prisma.savedDesign.findFirst({ where: { id, shop } });
        if (design) {
            await prisma.savedDesign.delete({ where: { id } });
            return res.json({ success: true });
        }
        
        // If not found, try DesignTemplate
        const template = await prisma.designTemplate.findFirst({ where: { id, shop } });
        if (template) {
            await prisma.designTemplate.delete({ where: { id } });
            return res.json({ success: true });
        }
        
        return res.status(404).json({ error: "Design not found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
