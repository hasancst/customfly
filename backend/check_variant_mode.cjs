#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

async function checkVariantMode(productId) {
    const config = await prisma.merchantConfig.findUnique({
        where: {
            shop_shopifyProductId: {
                shop: SHOP,
                shopifyProductId: String(productId)
            }
        }
    });
    
    console.log('\n=== VARIANT MODE CHECK ===\n');
    console.log('Product ID:', productId);
    console.log('isUniqueMode:', config?.isUniqueMode || false);
    console.log('variantDesigns:', JSON.stringify(config?.variantDesigns, null, 2) || 'null');
    console.log('\nInterpretation:');
    
    if (config?.isUniqueMode) {
        console.log('✅ Unique Mode ENABLED - Each variant has separate design');
        console.log('   When saving: Uses globalDesigns (not current pages)');
        console.log('   PROBLEM: globalDesigns not updated when changing image!');
    } else if (config?.variantDesigns && Object.keys(config.variantDesigns).length > 0) {
        console.log('⚠️  Some variants are unlinked');
        console.log('   Unlinked variants use separate designs');
        console.log('   When saving unlinked variant: Uses globalDesigns');
    } else {
        console.log('✅ All variants LINKED - Share same design');
        console.log('   When saving: Uses current pages');
        console.log('   This should work correctly');
    }
    
    console.log('\n');
    await prisma.$disconnect();
}

const productId = process.argv[2] || '8232157511714';
checkVariantMode(productId);
