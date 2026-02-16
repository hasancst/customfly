const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Delete test color palette
    const deleted = await prisma.asset.deleteMany({
      where: {
        shop: shop,
        name: 'Test Color Palette'
      }
    });
    
    console.log(`Deleted ${deleted.count} test assets`);
    
    // Delete test AI session and actions
    const testSession = await prisma.aISession.findFirst({
      where: {
        shop: shop,
        userId: 'test-user'
      }
    });
    
    if (testSession) {
      await prisma.aIAction.deleteMany({
        where: { sessionId: testSession.id }
      });
      
      await prisma.aISession.delete({
        where: { id: testSession.id }
      });
      
      console.log('Deleted test session and actions');
    }
    
    // Check remaining assets
    const assets = await prisma.asset.findMany({
      where: { shop: shop },
      select: { type: true, name: true }
    });
    
    console.log('\nRemaining assets:', assets.length);
    assets.forEach(a => console.log(`  - ${a.type}: ${a.name}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
