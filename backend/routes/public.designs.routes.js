import express from "express";
import prisma from "../config/database.js";
import { uploadBase64ToS3 } from "../services/s3Service.js";
import { getCDNUrl, transformDesignUrls } from "../config/s3.js";

const router = express.Router();

// Public: Save Customer Design
router.post(["/public/design", "/public/designs"], async (req, res) => {
    try {
        const { shop, shopifyProductId, name, designJson, previewUrl } = req.body;
        if (!shop || !shopifyProductId) {
            return res.status(400).json({ error: "Shop and productId required" });
        }

        let finalPreviewUrl = previewUrl;
        if (previewUrl && previewUrl.startsWith('data:image')) {
            try {
                const key = `previews/${shop}/${Date.now()}.jpg`;
                finalPreviewUrl = await uploadBase64ToS3(previewUrl, key);
            } catch (e) {
                console.error("Failed to upload design preview to S3:", e);
            }
        }

        const design = await prisma.savedDesign.create({
            data: {
                shop,
                shopifyProductId,
                name: name || "Customer Design",
                designJson,
                previewUrl: finalPreviewUrl,
                productionFileUrl: req.body.productionFileUrl,
                status: "customer_draft",
                isTemplate: false
            },
        });
        res.json({
            ...design,
            previewUrl: getCDNUrl(design.previewUrl),
            productionFileUrl: getCDNUrl(design.productionFileUrl),
            designJson: transformDesignUrls(design.designJson)
        });
    } catch (error) {
        console.error("Public design save error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
