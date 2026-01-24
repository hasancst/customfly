
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFont() {
    try {
        const font = await prisma.googleFont.findFirst({
            where: {
                name: {
                    contains: 'Ubuntu',
                    mode: 'insensitive'
                }
            }
        });

        if (font) {
            console.log(`FOUND: ${font.name}`);
        } else {
            console.log("NOT FOUND");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkFont();
