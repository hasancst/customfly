const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const productId = '8247876845602';
    const shop = 'uploadfly-lab.myshopify.com';
    
    console.log('Fixing Printful product layout...');
    console.log('Product ID:', productId);
    console.log('Shop:', shop);
    console.log('---');
    
    // Update the config to use inline layout
    const updated = await prisma.merchantConfig.update({
        where: {
            shop_shopifyProductId: {
                shop,
                shopifyProductId: productId
            }
        },
        data: {
            designerLayout: 'inline'
        }
    });
    
    console.log('✅ Updated successfully!');
    console.log('New designerLayout:', updated.designerLayout);
    console.log('---');
    console.log('Product should now show direct design canvas on product page');
    
    await prisma.$disconnect();
}

fix().catch(console.error);
