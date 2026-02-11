import prisma from "./config/database.js";

async function checkProduct() {
    try {
        const config = await prisma.merchantConfig.findFirst({
            where: { shopifyProductId: "9662366810284" }
        });
        console.log("Config for 9662366810284:", JSON.stringify(config, null, 2));

        const template = await prisma.savedDesign.findFirst({
            where: { shopifyProductId: "9662366810284", isTemplate: true }
        });
        console.log("Template for 9662366810284:", JSON.stringify(template, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkProduct();
