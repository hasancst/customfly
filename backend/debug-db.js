import prisma from './config/database.js';

async function debug() {
    console.log("--- Database Debug ---");

    const configs = await prisma.merchantConfig.findMany({ take: 5 });
    console.log("\nMerchantConfigs (First 5):");
    configs.forEach(c => console.log(`ID: ${c.id}, Shop: ${c.shop}, ProductID: ${c.shopifyProductId}`));

    const designs = await prisma.savedDesign.findMany({ take: 5 });
    console.log("\nSavedDesigns (First 5):");
    designs.forEach(d => console.log(`ID: ${d.id}, Shop: ${d.shop}, ProductID: ${d.shopifyProductId}, IsTemplate: ${d.isTemplate}`));

    const assets = await prisma.asset.findMany({ take: 5 });
    console.log("\nAssets (First 5):");
    assets.forEach(a => console.log(`ID: ${a.id}, Shop: ${a.shop}, Name: ${a.name}`));
}

debug().catch(console.error);
