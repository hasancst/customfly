const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllCustomflyColors() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Get ALL assets with name "Customfly Colors"
    const assets = await prisma.asset.findMany({
      where: {
        shop,
        type: 'color',
        name: 'Customfly Colors'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${assets.length} asset(s) with name "Customfly Colors"\n`);
    
    assets.forEach((asset, index) => {
      console.log(`\n=== Asset ${index + 1} ===`);
      console.log('ID:', asset.id);
      console.log('Created:', asset.createdAt);
      console.log('Updated:', asset.updatedAt);
      console.log('Value length:', asset.value.length);
      console.log('Value:', asset.value.substring(0, 200) + (asset.value.length > 200 ? '...' : ''));
      
      // Count colors
      const lines = asset.value.split('\n').map(l => l.trim()).filter(Boolean);
      let colorCount = 0;
      if (lines.length === 1 && !lines[0].includes('base64,')) {
        colorCount = lines[0].split(',').map(s => s.trim()).filter(Boolean).length;
      } else {
        colorCount = lines.length;
      }
      console.log('Color count:', colorCount);
    });
    
    // Also check if there are any other color assets
    console.log('\n\n=== ALL Color Assets ===');
    const allColorAssets = await prisma.asset.findMany({
      where: { shop, type: 'color' },
      orderBy: { createdAt: 'desc' }
    });
    
    allColorAssets.forEach(asset => {
      const lines = asset.value.split('\n').map(l => l.trim()).filter(Boolean);
      let colorCount = 0;
      if (lines.length === 1 && !lines[0].includes('base64,')) {
        colorCount = lines[0].split(',').map(s => s.trim()).filter(Boolean).length;
      } else {
        colorCount = lines.length;
      }
      console.log(`- ${asset.name} (ID: ${asset.id.substring(0, 8)}...) - ${colorCount} colors`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllCustomflyColors();
