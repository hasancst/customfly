const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeleteAsset() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    console.log('Current assets:');
    const assets = await prisma.asset.findMany({
      where: { shop },
      select: { id: true, name: true, type: true }
    });
    
    assets.forEach((asset, i) => {
      console.log(`${i + 1}. ${asset.name} (${asset.type}) - ID: ${asset.id}`);
    });
    
    console.log('\n--- Test Instructions ---');
    console.log('To test delete via AI:');
    console.log('1. Go to Assets page');
    console.log('2. Ask AI: "Delete the Customfly Default Font group"');
    console.log('3. Execute the action');
    console.log('4. Check if asset is deleted and page auto-refreshes');
    console.log('\nTo test delete manually:');
    console.log('1. Go to Assets page');
    console.log('2. Click the delete icon on any asset');
    console.log('3. Confirm deletion');
    console.log('4. Check if asset is removed from list');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteAsset();
