const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const shop = 'uploadfly-lab.myshopify.com';
    
    console.log('Checking GLOBAL config for shop:', shop);
    console.log('---');
    
    const config = await prisma.merchantConfig.findFirst({
        where: {
            shop,
            shopifyProductId: 'GLOBAL'
        }
    });
    
    if (config) {
        console.log('Global config found!');
        console.log('Safe area settings:', {
            showSafeArea: config.showSafeArea,
            safeAreaPadding: config.safeAreaPadding,
            safeAreaOffset: config.safeAreaOffset,
            safeAreaShape: config.safeAreaShape,
            safeAreaWidth: config.safeAreaWidth,
            safeAreaHeight: config.safeAreaHeight,
            safeAreaRadius: config.safeAreaRadius
        });
        console.log('---');
        console.log('Other settings:', {
            paperSize: config.paperSize,
            unit: config.unit,
            buttonText: config.buttonText,
            designerLayout: config.designerLayout,
            showRulers: config.showRulers
        });
    } else {
        console.log('No GLOBAL config found!');
    }
    
    await prisma.$disconnect();
}

check().catch(console.error);
