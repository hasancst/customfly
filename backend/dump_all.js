import prisma from "./config/database.js";

async function dump() {
    try {
        const designs = await prisma.savedDesign.findMany({ take: 100 });
        console.log("Total SavedDesign count:", designs.length);
        console.log("Projects:", designs.map(d => ({ pId: d.shopifyProductId, s: d.shop, t: d.isTemplate })));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

dump();
