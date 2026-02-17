#!/usr/bin/env node

/**
 * Force Update Base Image
 * 
 * This script forces both Config and Design to have the same base image.
 * Use this when save is not working properly.
 * 
 * Usage: node backend/force_update_base_image.cjs <productId> <imageUrl>
 * Example: node backend/force_update_base_image.cjs 8232157511714 "/images/system-placeholder.png"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

async function forceUpdateBaseImage(productId, imageUrl) {
    console.log('\n=== FORCE UPDATE BASE IMAGE ===\n');
    console.log(`Shop: ${SHOP}`);
    console.log(`Product ID: ${productId}`);
    console.log(`New Image URL: ${imageUrl}\n`);

    try {
        // 1. Update MerchantConfig
        console.log('📋 Step 1: Updating MerchantConfig...');
        const config = await prisma.merchantConfig.update({
            where: {
                shop_shopifyProductId: {
                    shop: SHOP,
                    shopifyProductId: String(productId)
                }
            },
            data: {
                baseImage: imageUrl
            }
        });
        console.log('✅ MerchantConfig updated');
        console.log('   baseImage:', config.baseImage);
        console.log('   updatedAt:', config.updatedAt);

        // 2. Update SavedDesign
        console.log('\n📋 Step 2: Updating SavedDesign...');
        const design = await prisma.savedDesign.findFirst({
            where: {
                shop: SHOP,
                shopifyProductId: String(productId),
                isTemplate: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (!design) {
            console.log('❌ No SavedDesign found');
            console.log('   Only Config was updated');
        } else {
            // Update designJson
            const updatedDesignJson = design.designJson.map((page, index) => {
                if (index === 0) {
                    return {
                        ...page,
                        baseImage: imageUrl
                    };
                }
                return page;
            });

            const updatedDesign = await prisma.savedDesign.update({
                where: {
                    id: design.id
                },
                data: {
                    designJson: updatedDesignJson
                }
            });

            console.log('✅ SavedDesign updated');
            console.log('   id:', updatedDesign.id);
            console.log('   designJson[0].baseImage:', updatedDesignJson[0].baseImage);
            console.log('   updatedAt:', updatedDesign.updatedAt);
        }

        // 3. Verify
        console.log('\n📋 Step 3: Verifying...');
        const verifyConfig = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: SHOP,
                    shopifyProductId: String(productId)
                }
            }
        });

        const verifyDesign = await prisma.savedDesign.findFirst({
            where: {
                shop: SHOP,
                shopifyProductId: String(productId),
                isTemplate: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        console.log('Config baseImage:', verifyConfig?.baseImage);
        console.log('Design baseImage:', verifyDesign?.designJson?.[0]?.baseImage);

        if (verifyConfig?.baseImage === imageUrl && verifyDesign?.designJson?.[0]?.baseImage === imageUrl) {
            console.log('\n✅ SUCCESS! Both Config and Design updated correctly');
        } else {
            console.log('\n⚠️  WARNING: Verification failed');
            console.log('   Expected:', imageUrl);
            console.log('   Config has:', verifyConfig?.baseImage);
            console.log('   Design has:', verifyDesign?.designJson?.[0]?.baseImage);
        }

        console.log('\n💡 Next Steps:');
        console.log('   1. Clear browser cache (Ctrl+Shift+R)');
        console.log('   2. Or add ?t=' + Date.now() + ' to URL');
        console.log('   3. Reload frontend to see changes');
        console.log('\n✅ Force update complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Main
const productId = process.argv[2];
const imageUrl = process.argv[3];

if (!productId || !imageUrl) {
    console.error('Usage: node backend/force_update_base_image.cjs <productId> <imageUrl>');
    console.error('Example: node backend/force_update_base_image.cjs 8232157511714 "/images/system-placeholder.png"');
    console.error('Example: node backend/force_update_base_image.cjs 8232157511714 "https://cdn.shopify.com/.../image.png"');
    process.exit(1);
}

forceUpdateBaseImage(productId, imageUrl);
