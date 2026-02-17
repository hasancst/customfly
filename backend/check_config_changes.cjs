const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkConfigChanges() {
    console.log('=== CHECK CONFIG CHANGES ===\n');

    try {
        // Get all configs with full details
        const configs = await prisma.merchantConfig.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 10
        });

        console.log(`Showing last 10 updated configs:\n`);

        for (const config of configs) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Config ID: ${config.id}`);
            console.log(`Shop: ${config.shop}`);
            console.log(`Product: ${config.shopifyProductId}`);
            console.log(`Updated: ${config.updatedAt}`);
            console.log(`\nCanvas Settings:`);
            console.log(`  paperSize: ${config.paperSize}`);
            console.log(`  unit: ${config.unit}`);
            console.log(`  customPaperDimensions: ${JSON.stringify(config.customPaperDimensions)}`);
            console.log(`  printArea: ${JSON.stringify(config.printArea)}`);
            console.log(`\nSafe Area Settings:`);
            console.log(`  showSafeArea: ${config.showSafeArea}`);
            console.log(`  safeAreaPadding: ${config.safeAreaPadding}`);
            console.log(`  safeAreaWidth: ${config.safeAreaWidth}`);
            console.log(`  safeAreaHeight: ${config.safeAreaHeight}`);
            console.log(`  safeAreaRadius: ${config.safeAreaRadius}`);
            console.log(`  safeAreaOffset: ${JSON.stringify(config.safeAreaOffset)}`);
            console.log(`  hideSafeAreaLine: ${config.hideSafeAreaLine}`);
            
            // Check if safe area is problematic
            if (config.safeAreaPadding && config.safeAreaPadding > 20) {
                console.log(`  ⚠️  WARNING: safeAreaPadding is too high (${config.safeAreaPadding}%) - safe area will be very small!`);
            }
            if (config.safeAreaWidth && config.safeAreaWidth < 50) {
                console.log(`  ⚠️  WARNING: safeAreaWidth is too small (${config.safeAreaWidth}%)`);
            }
            if (config.safeAreaHeight && config.safeAreaHeight < 50) {
                console.log(`  ⚠️  WARNING: safeAreaHeight is too small (${config.safeAreaHeight}%)`);
            }
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n✅ Done!`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkConfigChanges();
