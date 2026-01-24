
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Combination of System Stacks and Popular Designer Fonts
const CUSTOMFLY_FONTS = [
    // System / Safe Fonts
    'Inter',
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',

    // Designer Favorites (Google Fonts)
    'Roboto',
    'Open Sans',
    'Montserrat',
    'Lato',
    'Poppins',
    'Playfair Display',
    'Oswald',
    'Raleway',
    'Nunito',
    'Merriweather'
];

async function createCustomflyGroup() {
    try {
        const shop = 'uploadfly-lab.myshopify.com';
        const groupName = 'Customfly Font';
        const fontListString = CUSTOMFLY_FONTS.join(', ');

        // Check if exists first to avoid duplicates
        const existing = await prisma.asset.findFirst({
            where: { shop, name: groupName }
        });

        if (existing) {
            console.log(`Group "${groupName}" already exists. Updating fonts...`);
            await prisma.asset.update({
                where: { id: existing.id },
                data: {
                    value: fontListString,
                    config: {
                        group: 'Default',
                        fontType: 'google', // Using google type allows loading the external fonts
                        googleConfig: 'specific',
                        specificFonts: fontListString
                    }
                }
            });
        } else {
            console.log(`Creating new group "${groupName}"...`);
            await prisma.asset.create({
                data: {
                    shop,
                    type: 'font',
                    name: groupName,
                    value: fontListString,
                    config: {
                        group: 'Default',
                        fontType: 'google',
                        googleConfig: 'specific',
                        specificFonts: fontListString
                    }
                }
            });
        }
        console.log('Success! "Customfly Font" group is ready with mixed system and designer fonts.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

createCustomflyGroup();
