import express from "express";
import multer from "multer";
import { uploadToS3, uploadBase64ToS3 } from "../services/s3Service.js";
import { uploadLimiter } from "../middleware/rateLimit.js";
import { getCDNUrl } from "../config/s3.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

const handleUpload = upload.single("image");

// Public: Handle image uploads to S3
router.post("/public/upload/image", (req, res, next) => {
    handleUpload(req, res, (err) => {
        if (err) {
            console.error("[MULTER ERROR]", err);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image file provided" });

        const folder = req.query.folder || "general";
        const shop = req.query.shop || req.body.shop;
        const useWebP = req.query.webp === 'true';

        let buffer = req.file.buffer;
        let contentType = req.file.mimetype;
        let filename = `${Date.now()}-${req.file.originalname.replace(/\\s+/g, '_')}`;

        // Convert to WebP if requested AND it's a supported folder
        const webpSupportedFolders = ['gallery', 'admin-assets', 'swatches', 'customer-uploads'];
        if (useWebP && webpSupportedFolders.includes(folder)) {
            const { convertToWebP, shouldConvertToWebP, updateFilenameForWebP } = await import('../services/webpService.js');

            if (shouldConvertToWebP(contentType)) {
                try {
                    buffer = await convertToWebP(buffer, { quality: 85 });
                    contentType = 'image/webp';
                    filename = updateFilenameForWebP(filename);
                } catch (conversionError) {
                    console.warn('[WebP] Conversion failed, using original format:', conversionError.message);
                }
            }
        }

        const key = shop
            ? `${shop}/${folder}/${filename}`
            : `${folder}/${filename}`;

        const url = await uploadToS3(buffer, key, contentType);
        const cdnUrl = getCDNUrl(url);
        res.json({ url: cdnUrl, key, format: contentType.split('/')[1] });
    } catch (error) {
        console.error("[UPLOAD ERROR] Path: /imcst_api/public/upload/image", error);
        res.status(500).json({ error: `Upload failed: ${error.message}` });
    }
});

// Public: Handle base64 to S3 conversion
router.post("/public/upload/base64", async (req, res) => {
    try {
        const { base64, folder, filename, shop } = req.body;
        if (!base64) return res.status(400).json({ error: "No base64 data provided" });

        const fld = folder || "migrated";
        const name = filename || `img-${Date.now()}.jpg`;

        const key = shop ? `${shop}/${fld}/${name}` : `${fld}/${name}`;

        const url = await uploadBase64ToS3(base64, key);
        const cdnUrl = getCDNUrl(url);
        res.json({ url: cdnUrl, key });
    } catch (error) {
        console.error("[BASE64 UPLOAD ERROR] Path: /imcst_api/public/upload/base64", error);
        res.status(500).json({ error: `Base64 conversion failed: ${error.message}` });
    }
});

export default router;
