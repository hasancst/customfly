import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPaper() {
    try {
        const config = await prisma.merchantConfig.findFirst({
            where: { shopifyProductId: "8214119219234" }
        });
        console.log("Paper Size info:", {
            paperSize: config?.paperSize,
            customPaperDimensions: config?.customPaperDimensions,
            unit: config?.unit
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkPaper();
