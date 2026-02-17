const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllShapes() {
  try {
    console.log('🔍 Checking All Shape Assets...\n');

    const allShapes = await prisma.asset.findMany({
      where: { type: 'shape' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total shape assets: ${allShapes.length}\n`);

    allShapes.forEach((asset, i) => {
      console.log(`${i + 1}. ${asset.name}`);
      console.log(`   ID: ${asset.id}`);
      console.log(`   Created: ${asset.createdAt}`);
      console.log(`   Value length: ${asset.value.length} characters`);
      console.log(`   Value preview: ${asset.value.substring(0, 100)}...`);
      
      // Check format
      const lines = asset.value.split('\n').filter(Boolean);
      console.log(`   Lines: ${lines.length}`);
      
      if (lines.length > 0) {
        const firstLine = lines[0];
        const parts = firstLine.split('|');
        console.log(`   First line parts: ${parts.length}`);
        if (parts.length >= 2) {
          console.log(`   ✅ Format looks correct (name|svg)`);
        } else {
          console.log(`   ❌ Format looks wrong (expected name|svg)`);
        }
      }
      
      console.log(`   Config:`, JSON.stringify(asset.config, null, 2));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllShapes();
