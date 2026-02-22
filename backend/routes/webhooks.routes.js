import express from "express";
import { shopify } from "../config/shopify.js";
import { handleOrderCreate, handleOrderUpdate, handleOrderCancel } from "../handlers/printfulOrderHandler.js";

const router = express.Router();

// Register webhook handlers
shopify.api.webhooks.addHandlers({
    ORDERS_CREATE: {
        deliveryMethod: 'http',
        callbackUrl: '/api/webhooks',
        callback: async (topic, shop, body) => {
            console.log('[Webhook] ORDERS_CREATE received for shop:', shop);
            
            try {
                const orderData = JSON.parse(body);
                await handleOrderCreate(shop, orderData);
            } catch (error) {
                console.error('[Webhook] Error handling order create:', error.message);
            }
        }
    },
    ORDERS_UPDATED: {
        deliveryMethod: 'http',
        callbackUrl: '/api/webhooks',
        callback: async (topic, shop, body) => {
            console.log('[Webhook] ORDERS_UPDATED received for shop:', shop);
            
            try {
                const orderData = JSON.parse(body);
                await handleOrderUpdate(shop, orderData);
            } catch (error) {
                console.error('[Webhook] Error handling order update:', error.message);
            }
        }
    },
    ORDERS_CANCELLED: {
        deliveryMethod: 'http',
        callbackUrl: '/api/webhooks',
        callback: async (topic, shop, body) => {
            console.log('[Webhook] ORDERS_CANCELLED received for shop:', shop);
            
            try {
                const orderData = JSON.parse(body);
                await handleOrderCancel(shop, orderData);
            } catch (error) {
                console.error('[Webhook] Error handling order cancel:', error.message);
            }
        }
    }
});

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
