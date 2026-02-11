import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkProduct() {
    try {
        const config = await prisma.merchantConfig.findFirst({
            where: { shopifyProductId: "8301166395561" }
        });
        console.log("Config for 8301166395561:", JSON.stringify(config, null, 2));

        const template = await prisma.savedDesign.findFirst({
            where: { shopifyProductId: "8301166395561", isTemplate: true }
        });
        console.log("Template for 8301166395561:", JSON.stringify(template, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkProduct();
