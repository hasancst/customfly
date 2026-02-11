import prisma from "./config/database.js";

async function findAnything() {
    try {
        const configs = await prisma.merchantConfig.findMany({
            where: { headerTitle: { contains: "Test" } }
        });
        console.log("Configs with Test:", configs);

        const designs = await prisma.savedDesign.findMany({
            where: { name: { contains: "Test" } }
        });
        console.log("Designs with Test:", designs);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findAnything();
