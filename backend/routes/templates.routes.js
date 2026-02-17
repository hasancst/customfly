import express from "express";
import prisma from "../config/database.js";
import { uploadBase64ToS3 } from "../services/s3Service.js";
import { getCDNUrl, transformDesignUrls } from "../config/s3.js";

const router = express.Router();

// Get all templates for a shop
router.get("/templates", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const templates = await prisma.designTemplate.findMany({
            where: { shop },
            orderBy: { updatedAt: 'desc' }
        });

        const transformed = templates.map(t => ({
            ...t,
            thumbnail: getCDNUrl(t.thumbnail),
            pages: transformDesignUrls(t.pages)
        }));

        res.json(transformed);
    } catch (error) {
        console.error("Get templates error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get single template by ID
router.get("/templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        const template = await prisma.designTemplate.findUnique({
            where: { id }
        });

        if (!template || template.shop !== shop) {
            return res.status(404).json({ error: "Template not found" });
        }

        res.json({
            ...template,
            thumbnail: getCDNUrl(template.thumbnail),
            pages: transformDesignUrls(template.pages)
        });
    } catch (error) {
        console.error("Get template error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Create new template
router.post("/templates", async (req, res) => {
    try {
        const {
            name,
            description,
            paperSize,
            unit,
            customPaperDimensions,
            pages,
            thumbnail,
            tags
        } = req.body;

        const shop = res.locals.shopify.session.shop;

        // Upload thumbnail to S3 if it's base64
        let finalThumbnail = thumbnail;
        if (thumbnail && (thumbnail.startsWith('data:image') || (thumbnail.length > 500 && !thumbnail.startsWith('http')))) {
            try {
                const key = `templates/${shop}/${Date.now()}.jpg`;
                finalThumbnail = await uploadBase64ToS3(thumbnail, key);
            } catch (e) {
                console.error("Failed to upload template thumbnail to S3:", e);
            }
        }

        const template = await prisma.designTemplate.create({
            data: {
                shop,
                name: name || "Untitled Template",
                description,
                paperSize: paperSize || "Custom",
                unit: unit || "px",
                customPaperDimensions,
                pages,
                thumbnail: finalThumbnail,
                tags: tags || []
            }
        });

        res.json({
            ...template,
            thumbnail: getCDNUrl(template.thumbnail),
            pages: transformDesignUrls(template.pages)
        });
    } catch (error) {
        console.error("Create template error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update template
router.put("/templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            paperSize,
            unit,
            customPaperDimensions,
            pages,
            thumbnail,
            tags
        } = req.body;

        const shop = res.locals.shopify.session.shop;

        // Check if template exists and belongs to shop
        const existing = await prisma.designTemplate.findUnique({
            where: { id }
        });

        if (!existing || existing.shop !== shop) {
            return res.status(404).json({ error: "Template not found" });
        }

        // Upload thumbnail to S3 if it's base64
        let finalThumbnail = thumbnail;
        if (thumbnail && (thumbnail.startsWith('data:image') || (thumbnail.length > 500 && !thumbnail.startsWith('http')))) {
            try {
                const key = `templates/${shop}/${Date.now()}.jpg`;
                finalThumbnail = await uploadBase64ToS3(thumbnail, key);
            } catch (e) {
                console.error("Failed to upload template thumbnail to S3:", e);
                finalThumbnail = existing.thumbnail; // Keep old thumbnail on error
            }
        }

        const template = await prisma.designTemplate.update({
            where: { id },
            data: {
                name,
                description,
                paperSize,
                unit,
                customPaperDimensions,
                pages,
                thumbnail: finalThumbnail,
                tags
            }
        });

        res.json({
            ...template,
            thumbnail: getCDNUrl(template.thumbnail),
            pages: transformDesignUrls(template.pages)
        });
    } catch (error) {
        console.error("Update template error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete template
router.delete("/templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        const template = await prisma.designTemplate.findFirst({
            where: { id, shop }
        });

        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }

        await prisma.designTemplate.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Delete template error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Duplicate template
router.post("/templates/:id/duplicate", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;

        const original = await prisma.designTemplate.findFirst({
            where: { id, shop }
        });

        if (!original) {
            return res.status(404).json({ error: "Template not found" });
        }

        const duplicate = await prisma.designTemplate.create({
            data: {
                shop: original.shop,
                name: `${original.name} (Copy)`,
                description: original.description,
                paperSize: original.paperSize,
                unit: original.unit,
                customPaperDimensions: original.customPaperDimensions,
                pages: original.pages,
                thumbnail: original.thumbnail,
                tags: original.tags
            }
        });

        res.json({
            ...duplicate,
            thumbnail: getCDNUrl(duplicate.thumbnail),
            pages: transformDesignUrls(duplicate.pages)
        });
    } catch (error) {
        console.error("Duplicate template error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Apply template to product
router.post("/templates/:id/apply-to-product", async (req, res) => {
    try {
        const { id } = req.params;
        const { productId } = req.body;
        const shop = res.locals.shopify.session.shop;

        if (!productId) {
            return res.status(400).json({ error: "productId is required" });
        }

        const template = await prisma.designTemplate.findFirst({
            where: { id, shop }
        });

        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }

        // Get or create product config
        let config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop,
                    shopifyProductId: String(productId)
                }
            }
        });

        if (!config) {
            return res.status(404).json({ error: "Product config not found" });
        }

        // Update product config with template settings
        config = await prisma.merchantConfig.update({
            where: {
                shop_shopifyProductId: {
                    shop,
                    shopifyProductId: String(productId)
                }
            },
            data: {
                paperSize: template.paperSize,
                unit: template.unit,
                customPaperDimensions: template.customPaperDimensions
            }
        });

        // Create a saved design for this product with template data
        const design = await prisma.savedDesign.create({
            data: {
                shop,
                shopifyProductId: String(productId),
                name: `${template.name} - Applied`,
                designJson: template.pages,
                isTemplate: false
            }
        });

        res.json({
            success: true,
            config,
            design: {
                ...design,
                designJson: transformDesignUrls(design.designJson)
            }
        });
    } catch (error) {
        console.error("Apply template error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
