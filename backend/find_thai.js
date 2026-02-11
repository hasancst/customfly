import prisma from "./config/database.js";

async function findThai() {
    try {
        const configs = await prisma.merchantConfig.findMany({
            where: { shop: { contains: "thaicustom" } }
        });
        console.log("Thai Configs:", configs);

        const designs = await prisma.savedDesign.findMany({
            where: { shop: { contains: "thaicustom" } }
        });
        console.log("Thai Designs:", designs);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findThai();
