import express from "express";
import crypto from "crypto";

const router = express.Router();

router.use("/", (req, res, next) => {
    console.log(`[PROXY] Incoming request: ${req.method} ${req.url}`);
    const { signature, ...params } = req.query;

    if (!signature) {
        console.warn("[PROXY] Missing signature, allowing for now (Development/Direct hit?)");
        return next();
    }

    const message = Object.keys(params)
        .sort()
        .map(key => {
            const val = params[key];
            return `${key}=${Array.isArray(val) ? val.join(',') : val}`;
        })
        .join('');

    const generatedSignature = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(message)
        .digest('hex');

    if (generatedSignature !== signature) {
        console.error(`[PROXY] Signature mismatch! Got: ${signature}, Expected: ${generatedSignature}`);
    } else {
        console.log("[PROXY] Signature verified successfully");
    }
    next();
});

export default router;
