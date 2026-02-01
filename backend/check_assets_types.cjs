
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const assets = await prisma.asset.groupBy({
        by: ['type'],
        _count: {
            type: true
        }
    });
    console.log(JSON.stringify(assets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
