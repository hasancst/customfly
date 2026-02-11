import prisma from "./config/database.js";

async function checkConfig() {
    try {
        const config = await prisma.merchantConfig.findFirst({
            where: { shopifyProductId: "9662366810284" }
        });
        if (config) {
            console.log("Config variantBaseImages:", JSON.stringify(config.variantBaseImages, null, 2));
            console.log("Config baseImage:", config.baseImage);
        } else {
            console.log("No config found for 9662366810284");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkConfig();
