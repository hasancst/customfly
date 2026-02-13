import crypto from 'node:crypto';
if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}
import { shopify } from "./config/shopify.js";

async function checkProduct() {
    const shop = "uploadfly-lab.myshopify.com";
    const productId = "7778824323106";

    try {
        const offlineSessionId = shopify.api.session.getOfflineId(shop);
        const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);

        if (!session) {
            console.error("No session found for shop", shop);
            return;
        }

        const client = new shopify.api.clients.Rest({ session });
        const response = await client.get({ path: `products/${productId}` });

        console.log("=== Shopify Product Data ===");
        console.log("Title:", response.body.product.title);
        console.log("Options:", JSON.stringify(response.body.product.options, null, 2));
        console.log("Variants Count:", response.body.product.variants.length);
        console.log("First Variant sample:", JSON.stringify(response.body.product.variants[0], null, 2));
    } catch (err) {
        console.error("Failed to fetch product:", err);
    }
}

checkProduct();
