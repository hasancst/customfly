import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting ShopConfig Seeding ---');

    // Find all distinct shops from sessions
    const sessions = await prisma.session.findMany({
        select: { shop: true },
        distinct: ['shop'],
    });

    const shops = sessions.map(s => s.shop);
    console.log(`Found ${shops.length} existing shops: ${shops.join(', ')}`);

    for (const shop of shops) {
        const existing = await prisma.shopConfig.findUnique({
            where: { shop },
        });

        if (!existing) {
            console.log(`Seeding config for ${shop}...`);
            await prisma.shopConfig.create({
                data: {
                    shop,
                    plan: 'free',
                    maxProducts: 20,
                    maxAssets: 200,
                    maxDesigns: 100,
                    enableWebP: true,
                    enableAdvancedTools: true,
                },
            });
        } else {
            console.log(`Config already exists for ${shop}.`);
        }
    }

    console.log('--- Seeding Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
