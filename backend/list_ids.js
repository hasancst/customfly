import prisma from "./config/database.js";

async function listAll() {
    try {
        const designs = await prisma.savedDesign.findMany({
            select: { shopifyProductId: true }
        });
        console.log("IDs:", designs.map(d => `[${d.shopifyProductId}]`));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listAll();
