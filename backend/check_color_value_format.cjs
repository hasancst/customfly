const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColorValueFormat() {
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
    console.log('Value length:', asset.value.length);
    console.log('\nChecking for newlines:');
    console.log('Contains \\n:', asset.value.includes('\n'));
    console.log('Contains \\r:', asset.value.includes('\r'));
    console.log('Contains comma:', asset.value.includes(','));
    
    console.log('\nFirst 200 chars (with escape sequences visible):');
    console.log(JSON.stringify(asset.value.substring(0, 200)));
    
    console.log('\nLast 100 chars (with escape sequences visible):');
    console.log(JSON.stringify(asset.value.substring(asset.value.length - 100)));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColorValueFormat();
