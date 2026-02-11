import prisma from "./config/database.js";

async function main() {
    const configs = await prisma.merchantConfig.findMany();
    console.log('Configs with variantBaseImages:');
    configs.forEach(c => {
        if (c.variantBaseImages && Object.keys(c.variantBaseImages).length > 0) {
            console.log(`- ${c.shopifyProductId}:`, JSON.stringify(c.variantBaseImages));
        }
    });
    process.exit(0);
}

main();
