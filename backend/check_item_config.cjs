const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.merchantConfig.findMany({
        where: {
            shopifyProductId: '8214119219234'
        }
    });
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
