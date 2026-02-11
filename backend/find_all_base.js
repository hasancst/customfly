import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findRest() {
    try {
        const configs = await prisma.merchantConfig.findMany({});
        console.log("All Merchant Configs:", configs.map(c => ({ id: c.id, shop: c.shop, prod: c.shopifyProductId })));

        const designs = await prisma.savedDesign.findMany({
            where: { isTemplate: true }
        });
        console.log("All Templates:", designs.map(d => ({ id: d.id, shop: d.shop, prod: d.shopifyProductId })));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findRest();
