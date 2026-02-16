const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColorAsset() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Get latest color asset
    const asset = await prisma.asset.findFirst({
      where: {
        shop,
        type: 'color',
        name: 'Default Colors'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!asset) {
      console.log('No "Default Colors" asset found');
      return;
    }
    
    console.log('Asset Details:');
    console.log('ID:', asset.id);
    console.log('Name:', asset.name);
    console.log('Type:', asset.type);
    console.log('Created:', asset.createdAt);
    console.log('\nValue (raw):');
    console.log(asset.value);
    console.log('\nValue length:', asset.value.length);
    
    // Parse colors
    const colorPairs = asset.value.split(',').map(pair => pair.trim());
    console.log('\nColors count:', colorPairs.length);
    console.log('\nColors:');
    colorPairs.forEach((pair, i) => {
      const [name, hex] = pair.split('|').map(s => s.trim());
      console.log(`${i + 1}. ${name} - ${hex}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColorAsset();
