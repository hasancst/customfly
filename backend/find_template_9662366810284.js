import prisma from "./config/database.js";

async function findDesign() {
    try {
        const designs = await prisma.savedDesign.findMany({
            where: { shopifyProductId: "9662366810284", isTemplate: true }
        });
        console.log("Templates for 9662366810284:", JSON.stringify(designs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findDesign();
