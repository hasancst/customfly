import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listConfigs() {
    try {
        const configs = await prisma.merchantConfig.findMany({});
        for (const c of configs) {
            console.log(`- Shop: ${c.shop}, ProdID: ${c.shopifyProductId}, Header: ${c.headerTitle}`);
            if (c.variantBaseImages) {
                console.log(`  Variants: ${Object.keys(c.variantBaseImages).length}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listConfigs();
