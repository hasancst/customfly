
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateImageType() {
    try {
        console.log("Updating all 'image' assets to 'gallery'...");
        const result = await prisma.asset.updateMany({
            where: { type: 'image' },
            data: { type: 'gallery' }
        });
        console.log(`Success: Updated ${result.count} assets.`);

        // Also update any configs that might refer to 'image' prices if exists
        // (Our config usually uses enablePricing: true/false and doesn't explicitly name the type in config keys usually)

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateImageType();
