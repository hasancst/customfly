
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchDatabase() {
    try {
        const query = 'upload-placeholder';
        console.log(`Searching for "${query}" in the database...`);

        // Search in Assets
        const assets = await prisma.asset.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { value: { contains: query, mode: 'insensitive' } },
                ]
            }
        });
        if (assets.length > 0) {
            console.log(`Found in Assets (${assets.length} matches):`);
            assets.forEach(a => console.log(` - ID: ${a.id}, Type: ${a.type}, Name: ${a.name}, Value: ${a.value}`));
        } else {
            console.log('Not found in Assets.');
        }

        // Search in MerchantConfig
        const configs = await prisma.merchantConfig.findMany();
        const configMatches = configs.filter(c => {
            const str = JSON.stringify(c);
            return str.toLowerCase().includes(query.toLowerCase());
        });
        if (configMatches.length > 0) {
            console.log(`Found in MerchantConfig (${configMatches.length} matches):`);
            configMatches.forEach(c => console.log(` - ID: ${c.id}, ProductId: ${c.shopifyProductId}`));
        } else {
            console.log('Not found in MerchantConfig.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

searchDatabase();
