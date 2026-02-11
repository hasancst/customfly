import prisma from "./config/database.js";

async function listMerchantConfigs() {
    try {
        const configs = await prisma.merchantConfig.findMany({
            select: { shopifyProductId: true, shop: true }
        });
        console.log("Merchant Configs:", configs);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listMerchantConfigs();
