import prisma from "./config/database.js";

async function listAll() {
    try {
        const designs = await prisma.savedDesign.findMany({
            select: { shopifyProductId: true, name: true, shop: true, isTemplate: true }
        });
        console.log("All Designs:", designs);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listAll();
