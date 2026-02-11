import prisma from "./config/database.js";

async function main() {
    const globalConfig = await prisma.merchantConfig.findFirst({
        where: { shopifyProductId: 'GLOBAL' }
    });
    console.log('GLOBAL CONFIG baseImageProperties:', JSON.stringify(globalConfig?.baseImageProperties, null, 2));
    process.exit(0);
}

main();
