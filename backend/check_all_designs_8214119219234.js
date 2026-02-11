import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAllDesigns() {
    try {
        const designs = await prisma.savedDesign.findMany({
            where: { shopifyProductId: "8214119219234" }
        });
        console.log("Designs for 8214119219234:", JSON.stringify(designs, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllDesigns();
