
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

async function updateExistingGroup() {
    try {
        const shop = 'uploadfly-lab.myshopify.com';

        // 1. Delete the "Essential Fonts" I wrongly created
        await prisma.asset.deleteMany({
            where: { name: 'Essential Fonts' }
        });
        console.log("Deleted 'Essential Fonts'.");

        // 2. Find the user's last created font group
        // We look for the most recently created font asset
        const userGroup = await prisma.asset.findFirst({
            where: {
                shop,
                type: 'font',
                NOT: { name: 'System Default' } // Exclude system ones if any remain
            },
            orderBy: { createdAt: 'desc' }
        });

        if (userGroup) {
            console.log(`Found user group: "${userGroup.name}"`);

            // 3. Update it with the popular fonts list
            const fontListString = POPULAR_GOOGLE_FONTS.join(', ');

            const updated = await prisma.asset.update({
                where: { id: userGroup.id },
                data: {
                    value: fontListString,
                    config: {
                        ...userGroup.config, // Keep existing config like group name
                        fontType: 'google', // Ensure it's set to google so it loads correctly
                        googleConfig: 'specific',
                        specificFonts: fontListString
                    }
                }
            });

            console.log(`Successfully updated group "${updated.name}" with 20 popular fonts.`);
        } else {
            console.log("No user-created font group found. Please create one on the frontend first.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

updateExistingGroup();
