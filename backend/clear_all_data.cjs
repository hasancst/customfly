const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearData() {
    try {
        console.log("Starting data cleanup...");

        // Delete all designs
        const designsDeleted = await prisma.savedDesign.deleteMany({});
        console.log(`Deleted ${designsDeleted.count} saved designs.`);

        // Delete all merchant configs
        const configsDeleted = await prisma.merchantConfig.deleteMany({});
        console.log(`Deleted ${configsDeleted.count} merchant configurations.`);

        console.log("Cleanup complete.");
    } catch (error) {
        console.error("Cleanup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearData();
