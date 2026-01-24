
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPricingDefaults() {
    try {
        const assets = await prisma.asset.findMany({
            where: {
                type: { in: ['font', 'color'] }
            }
        });

        for (const asset of assets) {
            const config = asset.config || {};
            if (config.enablePricing === undefined) {
                console.log(`Setting enablePricing: false for ${asset.name}`);
                await prisma.asset.update({
                    where: { id: asset.id },
                    data: {
                        config: { ...config, enablePricing: false }
                    }
                });
            }
        }
        console.log("Done!");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

resetPricingDefaults();
