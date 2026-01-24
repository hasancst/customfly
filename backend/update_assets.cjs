
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAssets() {
    try {
        // 1. Delete "Customfly Default"
        const deleted = await prisma.asset.deleteMany({
            where: {
                name: 'Customfly Default'
            }
        });
        console.log(`Deleted ${deleted.count} assets named "Customfly Default"`);

        // 2. Add "System Default"
        // Check if it already exists to avoid duplicates
        const existing = await prisma.asset.findFirst({
            where: { name: 'System Default' }
        });

        if (!existing) {
            const newAsset = await prisma.asset.create({
                data: {
                    shop: 'uploadfly-lab.myshopify.com', // Using the shop found in previous check
                    type: 'font',
                    name: 'System Default',
                    value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    config: {
                        group: 'Default',
                        fontType: 'system',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }
                }
            });
            console.log('Created "System Default" asset:', newAsset);
        } else {
            console.log('"System Default" asset already exists.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

updateAssets();
