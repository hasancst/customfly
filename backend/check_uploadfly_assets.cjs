const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MASTER_SHOP = 'uploadfly-lab.myshopify.com';

async function checkAssets() {
    try {
        console.log(`\nChecking all assets in ${MASTER_SHOP}...\n`);

        const allAssets = await prisma.asset.findMany({
            where: { shop: MASTER_SHOP },
            select: {
                id: true,
                type: true,
                name: true,
                isDefault: true,
                config: true,
                label: true
            },
            orderBy: [
                { type: 'asc' },
                { name: 'asc' }
            ]
        });

        console.log(`Total assets: ${allAssets.length}\n`);

        const byType = {};
        allAssets.forEach(a => {
            if (!byType[a.type]) byType[a.type] = [];
            byType[a.type].push(a);
        });

        Object.keys(byType).sort().forEach(type => {
            console.log(`\n${type.toUpperCase()} (${byType[type].length}):`);
            byType[type].forEach(a => {
                const category = a.config?.category || a.config?.group || 'N/A';
                console.log(`  - ${a.name}`);
                console.log(`    ID: ${a.id}`);
                console.log(`    isDefault: ${a.isDefault}`);
                console.log(`    category: ${category}`);
                if (a.label) console.log(`    label: ${a.label}`);
            });
        });

        console.log('\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAssets();
