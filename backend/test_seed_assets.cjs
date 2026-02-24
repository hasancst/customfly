const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MASTER_SHOP = 'uploadfly-lab.myshopify.com';
const TEST_SHOP = 'makeitforme.myshopify.com';

async function testSeedAssets() {
    try {
        console.log('\n=== Testing Asset Seeding ===\n');

        // 1. Check master assets
        console.log(`1. Checking master assets in ${MASTER_SHOP}...`);
        const masterAssets = await prisma.asset.findMany({
            where: { 
                shop: MASTER_SHOP,
                name: {
                    startsWith: 'Customfly'
                }
            }
        });

        console.log(`Found ${masterAssets.length} master assets:`);
        const byType = {};
        masterAssets.forEach(a => {
            byType[a.type] = (byType[a.type] || 0) + 1;
            console.log(`  - ${a.type}: ${a.name} (default: ${a.isDefault})`);
        });
        console.log('\nBy type:', byType);

        // 2. Check target shop assets
        console.log(`\n2. Checking existing assets in ${TEST_SHOP}...`);
        const existingAssets = await prisma.asset.count({
            where: { shop: TEST_SHOP }
        });
        console.log(`Found ${existingAssets} existing assets`);

        if (existingAssets > 0) {
            console.log('\n⚠️  Target shop already has assets. Skipping seed.');
            console.log('To test seeding, delete existing assets first or use a different shop.');
            return;
        }

        // 3. Perform seeding
        console.log(`\n3. Seeding assets to ${TEST_SHOP}...`);
        const copiedAssets = [];
        
        for (const masterAsset of masterAssets) {
            const { id, createdAt, updatedAt, shop, ...assetData } = masterAsset;
            
            const newAsset = await prisma.asset.create({
                data: {
                    ...assetData,
                    shop: TEST_SHOP,
                    isDefault: true
                }
            });

            copiedAssets.push(newAsset);
            console.log(`  ✓ Copied: ${newAsset.type} - ${newAsset.name}`);
        }

        console.log(`\n✅ Successfully copied ${copiedAssets.length} assets to ${TEST_SHOP}`);

        // 4. Verify
        console.log(`\n4. Verifying seeded assets...`);
        const verifyAssets = await prisma.asset.findMany({
            where: { shop: TEST_SHOP },
            select: {
                type: true,
                name: true
            }
        });

        console.log(`Verified ${verifyAssets.length} assets in target shop`);
        const verifyByType = {};
        verifyAssets.forEach(a => {
            verifyByType[a.type] = (verifyByType[a.type] || 0) + 1;
        });
        console.log('By type:', verifyByType);

        console.log('\n=== Test Complete ===\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSeedAssets();
