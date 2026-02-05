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
        const { id, name, designJson, previewUrl, shopifyProductId, isTemplate } = req.body;
        const shop = res.locals.shopify.session.shop;

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
        const designs = await prisma.savedDesign.findMany({
            where: { shop },
            orderBy: [{ isTemplate: 'desc' }, { updatedAt: 'desc' }]
        });
        const transformed = designs.map(d => ({
            ...d,
            previewUrl: getCDNUrl(d.previewUrl),
            productionFileUrl: getCDNUrl(d.productionFileUrl),
            designJson: transformDesignUrls(d.designJson)
        }));
        res.json(transformed);
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
        const design = await prisma.savedDesign.findUnique({ where: { id } });
        if (!design || design.shop !== shop) {
            return res.status(404).json({ error: "Design not found" });
        }
        res.json({
            ...design,
            previewUrl: getCDNUrl(design.previewUrl),
            productionFileUrl: getCDNUrl(design.productionFileUrl),
            designJson: transformDesignUrls(design.designJson)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete Design
router.delete(["/design/:id", "/designs/:id"], async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        const design = await prisma.savedDesign.findFirst({ where: { id, shop } });
        if (!design) return res.status(404).json({ error: "Design not found" });
        await prisma.savedDesign.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
