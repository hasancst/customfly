const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeDuplicate() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Delete "Customfly Google Font" (the older duplicate)
    const deleted = await prisma.asset.delete({
      where: {
        id: '0754a993-e938-416e-9e21-6637a301f84f'
      }
    });
    
    console.log('Deleted duplicate font group:', deleted.name);
    
    // Check remaining
    const fonts = await prisma.asset.findMany({
      where: {
        shop: shop,
        type: 'font'
      },
      select: { name: true, createdAt: true }
    });
    
    console.log('\nRemaining font groups:', fonts.length);
    fonts.forEach(f => console.log(`  - ${f.name} (${f.createdAt})`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicate();
