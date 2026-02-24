const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'makeitforme.myshopify.com';
const HANDLE = 'customify-iphone';

async function checkProduct() {
    try {
        console.log(`\nChecking product with handle: ${HANDLE} in shop: ${SHOP}\n`);

        // We don't store handle in MerchantConfig, so we need to check via Shopify API
        // For now, let's just list all configs for this shop
        const configs = await prisma.merchantConfig.findMany({
            where: { shop: SHOP },
            select: {
                shopifyProductId: true,
                designerLayout: true,
                buttonText: true,
                baseImage: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${configs.length} configured products:\n`);
        configs.forEach(c => {
            console.log(`Product ID: ${c.shopifyProductId}`);
            console.log(`  Layout: ${c.designerLayout || 'not set'}`);
            console.log(`  Button: ${c.buttonText || 'not set'}`);
            console.log(`  Base Image: ${c.baseImage ? 'Yes' : 'No'}`);
            console.log(`  Created: ${c.createdAt}`);
            console.log('');
        });

        console.log('\nTo check specific product, you need the product ID from Shopify admin URL.');
        console.log('Example: https://admin.shopify.com/store/makeitforme/products/[PRODUCT_ID]\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProduct();
