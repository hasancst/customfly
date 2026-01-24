
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Lime', hex: '#00FF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Gray', hex: '#808080' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Green', hex: '#008000' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Teal', hex: '#008080' },
    { name: 'Navy', hex: '#000080' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Pink', hex: '#FFC0CB' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Brown', hex: '#A52A2A' }
];

async function seedColors() {
    try {
        const shop = 'uploadfly-lab.myshopify.com';
        const groupName = 'Standard Colors';
        const colorValue = STANDARD_COLORS.map(c => `${c.name}|${c.hex}`).join(', ');

        console.log(`Seeding standard colors group: ${groupName}...`);

        // Check if group exists
        const existing = await prisma.asset.findFirst({
            where: {
                shop,
                name: groupName,
                type: 'color'
            }
        });

        if (!existing) {
            await prisma.asset.create({
                data: {
                    shop,
                    type: 'color',
                    name: groupName,
                    value: colorValue,
                    config: {
                        group: 'Basic',
                        enablePricing: false
                    }
                }
            });
            console.log(`+ Added Group: ${groupName} with ${STANDARD_COLORS.length} colors.`);
        } else {
            // Update existing
            await prisma.asset.update({
                where: { id: existing.id },
                data: {
                    value: colorValue
                }
            });
            console.log(`= Updated Group: ${groupName} with latest colors.`);
        }

        console.log("Done!");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

seedColors();
