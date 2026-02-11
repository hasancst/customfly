import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listShops() {
    try {
        const shops = await prisma.merchantConfig.groupBy({
            by: ['shop']
        });
        console.log("Unique Shops:", shops);

        const sessions = await prisma.session.findMany({
            select: { shop: true }
        });
        console.log("Session Shops:", sessions);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listShops();
