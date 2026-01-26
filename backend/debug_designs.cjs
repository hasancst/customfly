const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching SavedDesigns...");
    const designs = await prisma.savedDesign.findMany({
        select: {
            id: true,
            name: true,
            shop: true,
            shopifyProductId: true,
            isTemplate: true,
            createdAt: true
        }
    });
    console.table(designs);
    console.log(`Total designs: ${designs.length}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
