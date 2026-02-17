const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fix() {
    console.log('Fixing safe area for product 8232157511714...\n');
    
    const result = await prisma.merchantConfig.updateMany({
        where: {
            shop: 'uploadfly-lab.myshopify.com',
            shopifyProductId: '8232157511714'
        },
        data: {
            safeAreaPadding: 10,
            safeAreaWidth: null,
            safeAreaHeight: null
        }
    });
    
    console.log(`Updated ${result.count} config(s)`);
    console.log('✅ Done! Safe area is now 80% of canvas (10% padding)');
    
    await prisma.$disconnect();
}

fix();
