import prisma from "./config/database.js";

async function fuzzyFind() {
    try {
        const designs = await prisma.savedDesign.findMany({
            where: { shopifyProductId: { contains: "966" } }
        });
        console.log("Fuzzy match results:", JSON.stringify(designs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

fuzzyFind();
