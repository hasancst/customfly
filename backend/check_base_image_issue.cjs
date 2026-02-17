#!/usr/bin/env node

/**
 * Troubleshooting Script: Base Image Not Updating in Frontend
 * 
 * This script checks the database and helps diagnose why base images
 * are not updating in the frontend after admin saves.
 * 
 * Usage: node backend/check_base_image_issue.cjs <productId>
 * Example: node backend/check_base_image_issue.cjs 8232157511714
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

async function checkBaseImageIssue(productId) {
    console.log('\n=== BASE IMAGE TROUBLESHOOTING ===\n');
    console.log(`Shop: ${SHOP}`);
    console.log(`Product ID: ${productId}\n`);

    try {
        // 1. Check MerchantConfig
        console.log('📋 Step 1: Checking MerchantConfig...');
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
        } else {
            console.log('✅ MerchantConfig found');
            console.log('   baseImage:', config.baseImage || '(not set)');
            console.log('   baseImageScale:', config.baseImageScale || '(not set)');
            console.log('   variantBaseImages:', JSON.stringify(config.variantBaseImages, null, 2) || '(not set)');
            console.log('   variantBaseScales:', JSON.stringify(config.variantBaseScales, null, 2) || '(not set)');
            console.log('   updatedAt:', config.updatedAt);
        }

        // 2. Check SavedDesign (Template)
        console.log('\n📋 Step 2: Checking SavedDesign (Template)...');
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
        } else {
            console.log('✅ SavedDesign template found');
            console.log('   id:', design.id);
            console.log('   name:', design.name);
            console.log('   updatedAt:', design.updatedAt);
            
            if (design.designJson && design.designJson.length > 0) {
                const firstPage = design.designJson[0];
                console.log('   designJson[0].baseImage:', firstPage.baseImage || '(not set)');
                console.log('   designJson[0].baseImageScale:', firstPage.baseImageScale || '(not set)');
                console.log('   designJson[0].variantBaseImages:', JSON.stringify(firstPage.variantBaseImages, null, 2) || '(not set)');
                console.log('   designJson[0].variantBaseScales:', JSON.stringify(firstPage.variantBaseScales, null, 2) || '(not set)');
            }
        }

        // 3. Analysis
        console.log('\n📊 Step 3: Analysis...');
        
        if (!config && !design) {
            console.log('❌ PROBLEM: No configuration or design found for this product');
            console.log('   Solution: Save the design from admin designer');
            return;
        }

        if (config && design) {
            const configBaseImage = config.baseImage;
            const designBaseImage = design.designJson?.[0]?.baseImage;
            
            console.log('\n🔍 Comparing Config vs Design:');
            console.log('   Config baseImage:', configBaseImage || '(not set)');
            console.log('   Design baseImage:', designBaseImage || '(not set)');
            
            if (configBaseImage && designBaseImage && configBaseImage !== designBaseImage) {
                console.log('⚠️  WARNING: Config and Design have different base images');
                console.log('   Frontend will prioritize Design over Config');
            }
            
            // Check variant-specific images
            const configVariants = config.variantBaseImages || {};
            const designVariants = design.designJson?.[0]?.variantBaseImages || {};
            
            const allVariantIds = new Set([
                ...Object.keys(configVariants),
                ...Object.keys(designVariants)
            ]);
            
            if (allVariantIds.size > 0) {
                console.log('\n🔍 Variant-Specific Images:');
                allVariantIds.forEach(variantId => {
                    const configImg = configVariants[variantId];
                    const designImg = designVariants[variantId];
                    
                    console.log(`\n   Variant ${variantId}:`);
                    console.log(`     Config: ${configImg || '(not set)'}`);
                    console.log(`     Design: ${designImg || '(not set)'}`);
                    
                    if (configImg && designImg && configImg !== designImg) {
                        console.log('     ⚠️  Different values - Design will be used');
                    } else if (designImg && !configImg) {
                        console.log('     ✅ Design has value, Config empty - OK');
                    } else if (configImg && !designImg) {
                        console.log('     ⚠️  Config has value but Design empty - Design will override!');
                    }
                });
            }
        }

        // 4. Check cache status
        console.log('\n📋 Step 4: Cache Status...');
        console.log('   Cache is managed by backend/config/cache.js');
        console.log('   Cache TTL: 30 seconds');
        console.log('   Cache should be cleared automatically on save');
        console.log('   To force clear: Add ?t=' + Date.now() + ' to frontend URL');

        // 5. Recommendations
        console.log('\n💡 Recommendations:');
        console.log('   1. Check browser console logs when loading frontend');
        console.log('   2. Look for "[DesignerOpenCore] Base Image Resolution:" log');
        console.log('   3. Verify which source is being used (page variant, config variant, or global)');
        console.log('   4. If image is correct in DB but wrong in frontend:');
        console.log('      - Clear browser cache (Ctrl+Shift+R)');
        console.log('      - Add ?t=' + Date.now() + ' to URL to bypass cache');
        console.log('   5. If image is wrong in DB:');
        console.log('      - Re-save from admin designer');
        console.log('      - Check console logs during save for errors');

        console.log('\n✅ Troubleshooting complete\n');

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
    console.error('Usage: node backend/check_base_image_issue.cjs <productId>');
    console.error('Example: node backend/check_base_image_issue.cjs 8232157511714');
    process.exit(1);
}

checkBaseImageIssue(productId);
