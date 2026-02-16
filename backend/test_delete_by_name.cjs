const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeleteByName() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    const assetId = "Customfly Fonts Populer"; // Wrong name (AI generated)
    
    console.log(`Trying to delete asset: "${assetId}"`);
    
    // Simulate the fuzzy matching logic
    let asset;
    
    // Try to find by ID first (UUID format)
    if (assetId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('Trying to find by UUID...');
      asset = await prisma.asset.findFirst({
        where: { id: assetId, shop }
      });
    }
    
    // If not found by ID, try by exact name
    if (!asset) {
      console.log('Not a UUID, trying exact name match...');
      asset = await prisma.asset.findFirst({
        where: { name: assetId, shop }
      });
    }

    // If still not found, try fuzzy matching
    if (!asset) {
      console.log('Exact match not found, trying fuzzy match...');
      
      const allAssets = await prisma.asset.findMany({
        where: { shop }
      });
      
      // Try case-insensitive exact match
      asset = allAssets.find(a => a.name.toLowerCase() === assetId.toLowerCase());
      
      // Try partial match (contains)
      if (!asset) {
        console.log('Trying partial match...');
        asset = allAssets.find(a => 
          a.name.toLowerCase().includes(assetId.toLowerCase()) ||
          assetId.toLowerCase().includes(a.name.toLowerCase())
        );
      }
      
      if (asset) {
        console.log(`✅ Found via fuzzy match: "${asset.name}"`);
      }
    }

    if (!asset) {
      console.log(`❌ Asset not found: ${assetId}`);
      console.log('\nAvailable assets:');
      const assets = await prisma.asset.findMany({
        where: { shop },
        select: { name: true, type: true }
      });
      assets.forEach(a => console.log(`  - ${a.name} (${a.type})`));
      throw new Error(`Asset not found: ${assetId}`);
    }

    console.log(`\n✅ Would delete: ${asset.name} (ID: ${asset.id})`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteByName();
