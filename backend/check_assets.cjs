
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAssets() {
    try {
        const assets = await prisma.asset.findMany();
        console.log(`Total Assets: ${assets.length}`);
        const counts = {};
        assets.forEach(a => {
            counts[a.type] = (counts[a.type] || 0) + 1;
        });
        console.log("Counts by type:", JSON.stringify(counts, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllAssets();
