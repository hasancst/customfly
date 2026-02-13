import crypto from 'node:crypto';
if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}
import { shopify } from "./config/shopify.js";

async function listProducts() {
    const shop = "uploadfly-lab.myshopify.com";

    try {
        const offlineSessionId = shopify.api.session.getOfflineId(shop);
        const session = await shopify.config.sessionStorage.loadSession(offlineSessionId);

        if (!session) {
            console.error("No session found for shop", shop);
            return;
        }

        const client = new shopify.api.clients.Rest({ session });
        const response = await client.get({ path: `products` });

        console.log("=== Shopify Products List ===");
        response.body.products.forEach(p => {
            console.log(`- ${p.title} (ID: ${p.id}) Options: ${p.options.map(o => o.name).join(", ")}`);
        });
    } catch (err) {
        console.error("Failed to fetch products:", err);
    }
}

listProducts();
