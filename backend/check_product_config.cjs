const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkProductConfig() {
    console.log('=== CHECK PRODUCT CONFIG ===\n');

    try {
        const shop = 'uploadfly-lab.myshopify.com';
        
        // Get product by handle
        const productHandle = 'test-product-1';
        
        console.log(`Looking for product with handle: ${productHandle}\n`);
        
        // First, let's see all products
        const allProducts = await prisma.product.findMany({
            where: { shop },
            select: {
                id: true,
                shopifyProductId: true,
                handle: true,
                title: true,
            }
        });
        
        console.log(`Found ${allProducts.length} products in shop:\n`);
        allProducts.forEach(p => {
            console.log(`  - ${p.title} (${p.handle}) - ID: ${p.shopifyProductId}`);
        });
        
        // Find the specific product
        const product = allProducts.find(p => p.handle === productHandle);
        
        if (!product) {
            console.log(`\n❌ Product with handle "${productHandle}" not found!`);
            console.log(`\nAvailable handles:`);
            allProducts.forEach(p => console.log(`  - ${p.handle}`));
            return;
        }
        
        console.log(`\n✅ Found product: ${product.title}`);
        console.log(`   Shopify Product ID: ${product.shopifyProductId}`);
        
        // Check if config exists
        const config = await prisma.merchantConfig.findFirst({
            where: {
                shop,
                shopifyProductId: product.shopifyProductId
            }
        });
        
        if (!config) {
            console.log(`\n❌ No config found for this product!`);
            console.log(`   Product needs to be configured in admin first.`);
            return;
        }
        
        console.log(`\n✅ Config found!`);
        console.log(`   Config ID: ${config.id}`);
        console.log(`   Designer Layout: ${config.designerLayout || 'redirect (default)'}`);
        console.log(`   Paper Size: ${config.paperSize}`);
        console.log(`   Unit: ${config.unit}`);
        console.log(`   Show Safe Area: ${config.showSafeArea}`);
        
        // Check if there are any designs
        const designs = await prisma.design.findMany({
            where: {
                shop,
                shopifyProductId: product.shopifyProductId
            },
            take: 5
        });
        
        console.log(`\n   Designs: ${designs.length} found`);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkProductConfig();
