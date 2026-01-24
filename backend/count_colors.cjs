
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countColors() {
    try {
        const colorAssets = await prisma.asset.findMany({
            where: {
                type: 'color'
            }
        });

        let totalColorValues = 0;
        colorAssets.forEach(asset => {
            const pairs = asset.value.split(/[,\n]/).map(n => n.trim()).filter(Boolean);
            totalColorValues += pairs.length;
        });

        console.log(`Total Color Groups: ${colorAssets.length}`);
        console.log(`Total Individual Colors: ${totalColorValues}`);

        if (colorAssets.length > 0) {
            console.log("\nDetails:");
            colorAssets.forEach(a => {
                const count = a.value.split(/[,\n]/).map(n => n.trim()).filter(Boolean).length;
                console.log(`- ${a.name}: ${count} colors`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

countColors();
