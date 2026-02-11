import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findComplexConfigs() {
    try {
        const configs = await prisma.merchantConfig.findMany({});
        for (const c of configs) {
            if (c.variantBaseImages && Object.keys(c.variantBaseImages).length > 0) {
                console.log(`FOUND Config with variants: shop=${c.shop}, product=${c.shopifyProductId}`);
                console.log(`variantBaseImages:`, JSON.stringify(c.variantBaseImages, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findComplexConfigs();
