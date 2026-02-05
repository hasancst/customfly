
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGalleryAssets() {
    try {
        const assets = await prisma.asset.findMany({
            where: { type: 'gallery' }
        });
        console.log(`Checking ${assets.length} gallery assets...`);
        assets.forEach(a => {
            console.log(`Asset ID: ${a.id}, Name: ${a.name}`);
            console.log(`Value: ${a.value}`);
            console.log('---');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkGalleryAssets();
