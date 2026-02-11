import prisma from "./config/database.js";

async function dumpConfigs() {
    try {
        const configs = await prisma.merchantConfig.findMany({});
        console.log("All Configs:", JSON.stringify(configs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

dumpConfigs();
