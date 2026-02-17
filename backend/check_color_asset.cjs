const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkColorAsset() {
    console.log('=== CHECK COLOR ASSET ===\n');

    try {
        // Find color assets
        const colorAssets = await prisma.asset.findMany({
            where: {
                type: 'color',
                shop: 'uploadfly-lab.myshopify.com'
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${colorAssets.length} color assets:\n`);

        for (const asset of colorAssets) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Asset ID: ${asset.id}`);
            console.log(`Name: ${asset.name}`);
            console.log(`Type: ${asset.type}`);
            console.log(`\nValue (raw):`);
            console.log(asset.value);
            console.log(`\nValue length: ${asset.value ? asset.value.length : 0} characters`);
            
            // Try to parse the value
            if (asset.value) {
                console.log(`\nParsed colors:`);
                const colors = asset.value.split('\n')
                    .filter(Boolean)
                    .map((line, index) => {
                        const [name, color] = line.split('|');
                        return {
                            index,
                            name: name ? name.trim() : '',
                            value: color ? color.trim() : (name ? name.trim() : '')
                        };
                    });
                
                console.log(JSON.stringify(colors, null, 2));
                console.log(`Total colors: ${colors.length}`);
            }
            
            console.log(`\nConfig:`);
            console.log(JSON.stringify(asset.config, null, 2));
            console.log(`\nCreated: ${asset.createdAt}`);
            console.log(`Updated: ${asset.updatedAt}`);
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n✅ Done!`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkColorAsset();
