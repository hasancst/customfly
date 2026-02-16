const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGalleryData() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    const galleries = await prisma.asset.findMany({
      where: {
        shop,
        type: 'gallery'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${galleries.length} gallery asset(s)\n`);
    
    galleries.forEach((asset, index) => {
      console.log(`\n=== Gallery ${index + 1}: ${asset.name} ===`);
      console.log('ID:', asset.id);
      console.log('Created:', asset.createdAt);
      console.log('Value length:', asset.value.length);
      console.log('\nFirst 500 chars:', asset.value.substring(0, 500));
      
      // Parse items
      const lines = asset.value.split('\n').map(l => l.trim()).filter(Boolean);
      console.log('\nTotal items:', lines.length);
      console.log('\nFirst 5 items:');
      lines.slice(0, 5).forEach((line, i) => {
        const parts = line.split('|');
        console.log(`  ${i+1}. Parts: ${parts.length}`);
        parts.forEach((part, j) => {
          console.log(`     Part ${j}: ${part.substring(0, 100)}${part.length > 100 ? '...' : ''}`);
        });
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGalleryData();
