import prisma from "./config/database.js";

async function checkProductData() {
    try {
        const productId = "8214119219234";
        const shop = "uploadfly-lab.myshopify.com";

        console.log("--- MerchantConfig ---");
        const config = await prisma.merchantConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } }
        });
        console.log(JSON.stringify(config, null, 2));

        console.log("\n--- SavedDesigns (Templates/Drafts) ---");
        const designs = await prisma.savedDesign.findMany({
            where: { shop, shopifyProductId: productId },
            orderBy: { updatedAt: 'desc' }
        });
        console.log(JSON.stringify(designs, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkProductData();
