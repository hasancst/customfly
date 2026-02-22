const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const productId = '8247876845602';
    const shop = 'uploadfly-lab.myshopify.com';
    
    console.log('Checking product:', productId);
    console.log('Shop:', shop);
    console.log('---');
    
    const config = await prisma.merchantConfig.findFirst({
        where: {
            shop,
            shopifyProductId: productId
        }
    });
    
    console.log('Config found:', !!config);
    if (config) {
        console.log('Config details:', {
            id: config.id,
            shopifyProductId: config.shopifyProductId,
            baseImage: config.baseImage ? config.baseImage.substring(0, 50) + '...' : 'null',
            paperSize: config.paperSize,
            showSafeArea: config.showSafeArea,
            safeAreaPadding: config.safeAreaPadding,
            printArea: config.printArea
        });
    } else {
        console.log('No config found for this product!');
    }
    
    console.log('---');
    
    const printfulProduct = await prisma.printfulProduct.findFirst({
        where: {
            shop,
            shopifyProductId: productId
        }
    });
    
    console.log('Printful product found:', !!printfulProduct);
    if (printfulProduct) {
        console.log('Printful product:', {
            printfulProductId: printfulProduct.printfulProductId,
            status: printfulProduct.status,
            createdAt: printfulProduct.createdAt
        });
    }
    
    await prisma.$disconnect();
}

check().catch(console.error);
