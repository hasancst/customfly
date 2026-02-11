import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findProduct() {
    try {
        const configs = await prisma.merchantConfig.findMany({});
        for (const c of configs) {
            console.log(`Checking config for shop: ${c.shop}, product: ${c.shopifyProductId}`);
        }

        const designs = await prisma.savedDesign.findMany({});
        for (const d of designs) {
            console.log(`Design: ${d.name}, shop: ${d.shop}, prod: ${d.shopifyProductId}, isTemplate: ${d.isTemplate}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findProduct();
