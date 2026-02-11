import { shopify } from './config/shopify.js';

async function checkVariants() {
    try {
        const session = await shopify.config.sessionStorage.loadSession('offline_uploadfly-lab.myshopify.com');
        const client = new shopify.api.clients.Rest({ session });
        const res = await client.get({ path: 'products/8214119219234' });
        console.log("Variants:", JSON.stringify(res.body.product.variants.map(v => ({ id: v.id, title: v.title })), null, 2));
    } catch (err) {
        console.error(err);
    }
}

checkVariants();
