
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOptionAssets() {
    try {
        const assets = await prisma.asset.findMany({
            where: { type: 'option' }
        });
        console.log(`Checking ${assets.length} option assets...`);
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

checkOptionAssets();
