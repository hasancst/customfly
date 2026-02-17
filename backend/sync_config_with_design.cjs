#!/usr/bin/env node

/**
 * Sync MerchantConfig with SavedDesign
 * 
 * This script syncs the baseImage and related settings from SavedDesign
 * to MerchantConfig when they are out of sync.
 * 
 * Usage: node backend/sync_config_with_design.cjs <productId>
 * Example: node backend/sync_config_with_design.cjs 8232157511714
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

async function syncConfigWithDesign(productId) {
    console.log('\n=== SYNCING CONFIG WITH DESIGN ===\n');
    console.log(`Shop: ${SHOP}`);
    console.log(`Product ID: ${productId}\n`);

    try {
        // 1. Get current config
        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: SHOP,
                    shopifyProductId: String(productId)
                }
            }
        });

        if (!config) {
            console.log('❌ No MerchantConfig found for this product');
            console.log('   Please save the design from admin first');
            return;
        }

        // 2. Get latest design template
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
            console.log('❌ No SavedDesign template found for this product');
            console.log('   Please save the design from admin first');
            return;
        }

        if (!design.designJson || design.designJson.length === 0) {
            console.log('❌ Design has no pages');
            return;
        }

        const firstPage = design.designJson[0];

        // 3. Compare and sync
        console.log('📋 Current State:');
        console.log('   Config baseImage:', config.baseImage || '(not set)');
        console.log('   Design baseImage:', firstPage.baseImage || '(not set)');
        console.log('   Config baseImageScale:', config.baseImageScale || '(not set)');
        console.log('   Design baseImageScale:', firstPage.baseImageScale || '(not set)');

        const updates = {};
        let hasChanges = false;

        // Sync baseImage
        if (firstPage.baseImage && firstPage.baseImage !== config.baseImage) {
            updates.baseImage = firstPage.baseImage;
            hasChanges = true;
            console.log('\n✏️  Will update baseImage:', firstPage.baseImage);
        }

        // Sync baseImageScale
        if (firstPage.baseImageScale && firstPage.baseImageScale !== config.baseImageScale) {
            updates.baseImageScale = firstPage.baseImageScale;
            hasChanges = true;
            console.log('✏️  Will update baseImageScale:', firstPage.baseImageScale);
        }

        // Sync variantBaseImages
        if (firstPage.variantBaseImages) {
            const designVariants = firstPage.variantBaseImages;
            const configVariants = config.variantBaseImages || {};
            
            let variantsChanged = false;
            Object.keys(designVariants).forEach(variantId => {
                if (designVariants[variantId] !== configVariants[variantId]) {
                    variantsChanged = true;
                }
            });

            if (variantsChanged) {
                updates.variantBaseImages = designVariants;
                hasChanges = true;
                console.log('✏️  Will update variantBaseImages:', JSON.stringify(designVariants, null, 2));
            }
        }

        // Sync variantBaseScales
        if (firstPage.variantBaseScales) {
            const designScales = firstPage.variantBaseScales;
            const configScales = config.variantBaseScales || {};
            
            let scalesChanged = false;
            Object.keys(designScales).forEach(variantId => {
                if (designScales[variantId] !== configScales[variantId]) {
                    scalesChanged = true;
                }
            });

            if (scalesChanged) {
                updates.variantBaseScales = designScales;
                hasChanges = true;
                console.log('✏️  Will update variantBaseScales:', JSON.stringify(designScales, null, 2));
            }
        }

        // Sync baseImageProperties
        if (firstPage.baseImageProperties && 
            JSON.stringify(firstPage.baseImageProperties) !== JSON.stringify(config.baseImageProperties)) {
            updates.baseImageProperties = firstPage.baseImageProperties;
            hasChanges = true;
            console.log('✏️  Will update baseImageProperties');
        }

        // Sync color settings
        if (firstPage.baseImageColor && firstPage.baseImageColor !== config.baseImageColor) {
            updates.baseImageColor = firstPage.baseImageColor;
            hasChanges = true;
            console.log('✏️  Will update baseImageColor:', firstPage.baseImageColor);
        }

        if (firstPage.baseImageColorEnabled !== undefined && 
            firstPage.baseImageColorEnabled !== config.baseImageColorEnabled) {
            updates.baseImageColorEnabled = firstPage.baseImageColorEnabled;
            hasChanges = true;
            console.log('✏️  Will update baseImageColorEnabled:', firstPage.baseImageColorEnabled);
        }

        if (firstPage.baseImageColorMode && firstPage.baseImageColorMode !== config.baseImageColorMode) {
            updates.baseImageColorMode = firstPage.baseImageColorMode;
            hasChanges = true;
            console.log('✏️  Will update baseImageColorMode:', firstPage.baseImageColorMode);
        }

        // Sync mask settings
        if (firstPage.baseImageAsMask !== undefined && 
            firstPage.baseImageAsMask !== config.baseImageAsMask) {
            updates.baseImageAsMask = firstPage.baseImageAsMask;
            hasChanges = true;
            console.log('✏️  Will update baseImageAsMask:', firstPage.baseImageAsMask);
        }

        if (firstPage.baseImageMaskInvert !== undefined && 
            firstPage.baseImageMaskInvert !== config.baseImageMaskInvert) {
            updates.baseImageMaskInvert = firstPage.baseImageMaskInvert;
            hasChanges = true;
            console.log('✏️  Will update baseImageMaskInvert:', firstPage.baseImageMaskInvert);
        }

        if (!hasChanges) {
            console.log('\n✅ Config is already in sync with Design. No changes needed.');
            return;
        }

        // 4. Apply updates
        console.log('\n🔄 Applying updates...');
        const updatedConfig = await prisma.merchantConfig.update({
            where: {
                shop_shopifyProductId: {
                    shop: SHOP,
                    shopifyProductId: String(productId)
                }
            },
            data: updates
        });

        console.log('✅ Config updated successfully!');
        console.log('\n📋 New Config State:');
        console.log('   baseImage:', updatedConfig.baseImage || '(not set)');
        console.log('   baseImageScale:', updatedConfig.baseImageScale || '(not set)');
        console.log('   variantBaseImages:', JSON.stringify(updatedConfig.variantBaseImages, null, 2) || '(not set)');
        console.log('   variantBaseScales:', JSON.stringify(updatedConfig.variantBaseScales, null, 2) || '(not set)');
        console.log('   updatedAt:', updatedConfig.updatedAt);

        // 5. Clear cache
        console.log('\n🗑️  Cache will be cleared on next API request');
        console.log('   Or add ?t=' + Date.now() + ' to frontend URL to force refresh');

        console.log('\n✅ Sync complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Main
const productId = process.argv[2];

if (!productId) {
    console.error('Usage: node backend/sync_config_with_design.cjs <productId>');
    console.error('Example: node backend/sync_config_with_design.cjs 8232157511714');
    process.exit(1);
}

syncConfigWithDesign(productId);
