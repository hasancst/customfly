const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.merchantConfig.updateMany({
        where: {},
        data: {
            designerLayout: 'modal'
        }
    });
    console.log(`Updated ${result.count} records to modal`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
