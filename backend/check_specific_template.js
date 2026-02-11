import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSpecificTemplate() {
    try {
        const design = await prisma.savedDesign.findFirst({
            where: { shopifyProductId: "8214119219234", isTemplate: true }
        });
        console.log("Template for 8214119219234:", JSON.stringify(design, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkSpecificTemplate();
