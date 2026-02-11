import prisma from "./config/database.js";

async function findProduct() {
    try {
        const samples = await prisma.merchantConfig.findMany({
            take: 10
        });
        console.log("Sample Configs:", JSON.stringify(samples, null, 2));

        const designs = await prisma.savedDesign.findMany({
            take: 5,
            where: { isTemplate: true }
        });
        console.log("Sample Templates:", JSON.stringify(designs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findProduct();
