const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCreateColorPalette() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Create a test session first
    const session = await prisma.aISession.create({
      data: {
        shop: shop,
        userId: 'test-user',
        status: 'active'
      }
    });
    
    // Create a test AI action with CREATE_COLOR_PALETTE type
    const action = await prisma.aIAction.create({
      data: {
        sessionId: session.id,
        shop: shop,
        actionType: 'CREATE_COLOR_PALETTE',
        target: 'asset',
        output: {
          type: 'CREATE_COLOR_PALETTE',
          payload: {
            palette: {
              name: 'Test Color Palette',
              category: 'Custom',
              colors: [
                { name: 'Black', hex: '#000000' },
                { name: 'White', hex: '#FFFFFF' },
                { name: 'Red', hex: '#FF0000' },
                { name: 'Blue', hex: '#0000FF' },
                { name: 'Green', hex: '#00FF00' }
              ]
            }
          },
          description: 'Test color palette creation',
          requiresApproval: false
        },
        status: 'pending'
      }
    });

    console.log('Created test action:', action.id);
    console.log('\nNow test executing it...');
    
    // Import assetExecutor
    const assetExecutor = await import('./services/ai/executors/assetExecutor.js');
    
    const result = await assetExecutor.default.createColorPalette(
      shop,
      action.output.payload.palette
    );
    
    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    // Mark as executed
    await prisma.aIAction.update({
      where: { id: action.id },
      data: {
        status: 'executed',
        executedAt: new Date()
      }
    });
    
    console.log('\nAction marked as executed');
    
    // Check if asset was created
    const asset = await prisma.asset.findFirst({
      where: {
        shop: shop,
        name: 'Test Color Palette'
      }
    });
    
    console.log('\nCreated asset:', JSON.stringify(asset, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateColorPalette();
