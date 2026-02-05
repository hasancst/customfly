import express from "express";
import { shopify } from "../config/shopify.js";

const router = express.Router();

router.post("/webhooks", express.text({ type: '*/*' }), async (req, res) => {
    try {
        await shopify.api.webhooks.process({
            rawBody: req.body,
            rawRequest: req,
            rawResponse: res,
        });
        console.log(`[WEBHOOK] Processed successfully`);
    } catch (error) {
        console.error(`[WEBHOOK] Error: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).send(error.message);
        }
    }
});

export default router;
