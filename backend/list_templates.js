import prisma from "./config/database.js";

async function listTemplates() {
    try {
        const designs = await prisma.savedDesign.findMany({
            where: { isTemplate: true },
            select: { id: true, shopifyProductId: true, name: true, shop: true }
        });
        console.log("All Templates:", JSON.stringify(designs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listTemplates();
