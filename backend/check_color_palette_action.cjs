const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColorPaletteAction() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Get latest CREATE_COLOR_PALETTE action
    const action = await prisma.aIAction.findFirst({
      where: {
        shop,
        actionType: 'CREATE_COLOR_PALETTE'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!action) {
      console.log('No CREATE_COLOR_PALETTE action found');
      return;
    }
    
    console.log('Latest CREATE_COLOR_PALETTE Action:');
    console.log('ID:', action.id);
    console.log('Created:', action.createdAt);
    console.log('Status:', action.status);
    console.log('\nPayload:');
    console.log(JSON.stringify(action.output.payload, null, 2));
    
    if (action.output.payload.palette && action.output.payload.palette.colors) {
      console.log('\nColors count:', action.output.payload.palette.colors.length);
      console.log('\nColors:');
      action.output.payload.palette.colors.forEach((color, i) => {
        console.log(`${i + 1}. ${color.name} - ${color.hex}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColorPaletteAction();
