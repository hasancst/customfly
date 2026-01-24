
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POPULAR_GOOGLE_FONTS = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Raleway',
    'Merriweather',
    'Poppins',
    'Noto Sans',
    'Playfair Display',
    'Nunito',
    'Roboto Mono',
    'Ubuntu',
    'Play',
    'Lobster',
    'Pacifico',
    'Dancing Script',
    'Satisfy',
    'Anton'
];

async function fixFontGrouping() {
    try {
        const shop = 'uploadfly-lab.myshopify.com';

        // 1. Clean up the individual assets created previously
        // We identify them by the group 'Popular' we assigned earlier
        const deletedStats = await prisma.asset.deleteMany({
            where: {
                shop: shop,
                type: 'font',
                config: {
                    path: ['group'],
                    equals: 'Popular'
                }
            }
        });
        console.log(`Cleaned up ${deletedStats.count} individual font assets.`);

        // Also clean up "System Default" just to be clean
        await prisma.asset.deleteMany({
            where: { shop, name: 'System Default' }
        });

        // 2. Create ONE single asset containing ALL these fonts
        const fontListString = POPULAR_GOOGLE_FONTS.join(', ');

        const groupAsset = await prisma.asset.create({
            data: {
                shop,
                type: 'font',
                name: 'Essential Fonts', // The visible name of the Group
                value: fontListString,
                config: {
                    group: 'Start Here', // The badge label
                    fontType: 'google',
                    googleConfig: 'specific',
                    specificFonts: fontListString
                }
            }
        });

        console.log('Created single group asset "Essential Fonts" containing 20 fonts.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixFontGrouping();
