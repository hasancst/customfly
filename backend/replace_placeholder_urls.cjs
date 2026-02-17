#!/usr/bin/env node

/**
 * Replace Placeholder URLs in Database
 * 
 * This script replaces all /images/system-placeholder.png URLs
 * with the S3 URL so they work on frontend customer.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD_URL = '/images/system-placeholder.png';
const NEW_URL = 'https://customfly.us-southeast-1.linodeobjects.com/system/system-placeholder.png';

async function replacePlaceholderUrls() {
    console.log('\n=== REPLACE PLACEHOLDER URLS ===\n');
    console.log('Old URL:', OLD_URL);
    console.log('New URL:', NEW_URL);
    console.log('');

    try {
        // 1. Update MerchantConfig
        console.log('📋 Step 1: Updating MerchantConfig...');
        const configs = await prisma.merchantConfig.findMany({
            where: {
                baseImage: OLD_URL
            }
        });

        console.log(`   Found ${configs.length} configs with placeholder`);

        for (const config of configs) {
            await prisma.merchantConfig.update({
                where: { id: config.id },
                data: { baseImage: NEW_URL }
            });
            console.log(`   ✅ Updated config for ${config.shop} / ${config.shopifyProductId}`);
        }

        // 2. Update SavedDesign
        console.log('\n📋 Step 2: Updating SavedDesign...');
        const designs = await prisma.savedDesign.findMany();

        let updatedCount = 0;
        for (const design of designs) {
            let needsUpdate = false;
            const updatedDesignJson = design.designJson.map(page => {
                if (page.baseImage === OLD_URL) {
                    needsUpdate = true;
                    return { ...page, baseImage: NEW_URL };
                }
                return page;
            });

            if (needsUpdate) {
                await prisma.savedDesign.update({
                    where: { id: design.id },
                    data: { designJson: updatedDesignJson }
                });
                updatedCount++;
                console.log(`   ✅ Updated design ${design.id} (${design.name})`);
            }
        }

        console.log(`   Found ${updatedCount} designs with placeholder`);

        // 3. Summary
        console.log('\n📊 Summary:');
        console.log(`   MerchantConfig: ${configs.length} updated`);
        console.log(`   SavedDesign: ${updatedCount} updated`);
        console.log(`   Total: ${configs.length + updatedCount} records updated`);

        console.log('\n💡 Next Steps:');
        console.log('   1. Clear browser cache (Ctrl+Shift+R)');
        console.log('   2. Reload frontend to see changes');
        console.log('   3. Verify image loads correctly');

        console.log('\n✅ Done!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

replacePlaceholderUrls();
