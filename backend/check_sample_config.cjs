
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
    try {
        const config = await prisma.merchantConfig.findFirst();
        console.log("Sample MerchantConfig:");
        console.log(JSON.stringify(config, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkConfig();
