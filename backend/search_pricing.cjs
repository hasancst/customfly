
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchPricing() {
    try {
        const query = 'upload-placeholder';
        const configs = await prisma.productPricingConfig.findMany();
        const matches = configs.filter(c => JSON.stringify(c).toLowerCase().includes(query.toLowerCase()));
        if (matches.length > 0) {
            console.log(`Found in ProductPricingConfig (${matches.length} matches):`);
            matches.forEach(m => console.log(` - ID: ${m.id}, ShopifyProductId: ${m.shopifyProductId}`));
        } else {
            console.log('Not found in ProductPricingConfig.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

searchPricing();
