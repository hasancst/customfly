import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkMerchantConfigs() {
    try {
        const configs = await prisma.merchantConfig.findMany({});
        for (const c of configs) {
            console.log(`Config ${c.shopifyProductId}: baseImage = ${c.baseImage}`);
            if (c.variantBaseImages) {
                console.log(`  Variants:`, JSON.stringify(c.variantBaseImages, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkMerchantConfigs();
