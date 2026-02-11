import prisma from "./config/database.js";

async function main() {
    const configs = await prisma.merchantConfig.findMany();
    console.log('Configs with baseImageProperties:');
    configs.forEach(c => {
        if (c.baseImageProperties) {
            console.log(`- ${c.shopifyProductId} (${c.shop}):`, JSON.stringify(c.baseImageProperties));
        }
    });
    process.exit(0);
}

main();
