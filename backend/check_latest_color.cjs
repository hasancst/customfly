const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestColor() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    const asset = await prisma.asset.findFirst({
      where: {
        shop,
        type: 'color',
        name: 'Customfly Colors'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!asset) {
      console.log('No "Customfly Colors" found');
      return;
    }
    
    console.log('Asset ID:', asset.id);
    console.log('Name:', asset.name);
    console.log('Created:', asset.createdAt);
    console.log('\nValue length:', asset.value.length);
    console.log('\nValue:');
    console.log(asset.value);
    
    const colorPairs = asset.value.split(',').map(pair => pair.trim());
    console.log('\n\nColors count:', colorPairs.length);
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

checkLatestColor();
