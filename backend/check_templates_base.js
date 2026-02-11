import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findMockup() {
    try {
        const designs = await prisma.savedDesign.findMany({
            where: { isTemplate: true }
        });
        for (const d of designs) {
            console.log(`Checking template: ${d.name} (${d.shopifyProductId})`);
            const json = d.designJson;
            if (Array.isArray(json)) {
                json.forEach((p, i) => {
                    console.log(`  Page ${i}: baseImage = ${p.baseImage}`);
                });
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findMockup();
