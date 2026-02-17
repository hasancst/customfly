const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDefaultShapes() {
  try {
    console.log('🔍 Checking Default Shape Asset...\n');

    const defaultShapes = await prisma.asset.findFirst({
      where: {
        type: 'shape',
        name: 'Customfly Default'
      }
    });

    if (!defaultShapes) {
      console.log('❌ Default Shape asset not found');
      
      // Show all shape assets
      const allShapes = await prisma.asset.findMany({
        where: { type: 'shape' }
      });
      
      console.log(`\n📋 All shape assets (${allShapes.length}):`);
      allShapes.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} (ID: ${s.id})`);
      });
      
      return;
    }

    console.log('✅ Asset found:');
    console.log(`   - ID: ${defaultShapes.id}`);
    console.log(`   - Shop: ${defaultShapes.shop}`);
    console.log(`   - Name: ${defaultShapes.name}`);
    console.log(`   - Type: ${defaultShapes.type}`);
    console.log(`   - Value length: ${defaultShapes.value.length} characters`);
    console.log(`   - Config:`, JSON.stringify(defaultShapes.config, null, 2));

    console.log(`\n📄 Raw value (first 500 chars):`);
    console.log(defaultShapes.value.substring(0, 500));
    console.log('...\n');

    // Try to parse the shapes
    const lines = defaultShapes.value.split('\n').filter(Boolean);
    console.log(`📊 Total lines: ${lines.length}`);

    console.log(`\n📋 First 3 items:`);
    console.log('═'.repeat(80));
    lines.slice(0, 3).forEach((line, i) => {
      console.log(`\n${i + 1}. Raw line:`);
      console.log(`   "${line.substring(0, 100)}..."`);
      
      const parts = line.split('|');
      console.log(`   Parts count: ${parts.length}`);
      if (parts.length >= 2) {
        const name = parts[0];
        const svg = parts.slice(1).join('|');
        console.log(`   Name: "${name}"`);
        console.log(`   SVG length: ${svg.length} characters`);
        console.log(`   SVG starts with: ${svg.substring(0, 50)}`);
        console.log(`   Is valid SVG: ${svg.trim().startsWith('<svg') || svg.trim().startsWith('<')}`);
      } else {
        console.log(`   ⚠️  Invalid format - expected "name|svg"`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDefaultShapes();
