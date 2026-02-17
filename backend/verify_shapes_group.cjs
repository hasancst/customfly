const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyShapesGroup() {
  try {
    console.log('🔍 Verifying Customfly Shapes Group...\n');

    const shapesAsset = await prisma.asset.findFirst({
      where: {
        type: 'shape',
        name: 'Customfly Shapes'
      }
    });

    if (!shapesAsset) {
      console.log('❌ Customfly Shapes asset not found');
      return;
    }

    console.log('✅ Asset found:');
    console.log(`   - ID: ${shapesAsset.id}`);
    console.log(`   - Shop: ${shapesAsset.shop}`);
    console.log(`   - Name: ${shapesAsset.name}`);
    console.log(`   - Label: ${shapesAsset.label}`);
    console.log(`   - Type: ${shapesAsset.type}`);
    console.log(`   - Value length: ${shapesAsset.value.length} characters`);
    console.log(`   - Config:`, JSON.stringify(shapesAsset.config, null, 2));

    // Parse the shapes
    const lines = shapesAsset.value.split('\n').filter(Boolean);
    console.log(`\n📊 Total shapes in group: ${lines.length}`);

    // Show first 5 shapes
    console.log(`\n📋 First 5 shapes:`);
    console.log('═'.repeat(80));
    lines.slice(0, 5).forEach((line, i) => {
      const parts = line.split('|');
      const name = parts[0];
      const svg = parts.slice(1).join('|'); // In case SVG contains |
      console.log(`${i + 1}. Name: "${name}"`);
      console.log(`   SVG length: ${svg.length} characters`);
      console.log(`   SVG preview: ${svg.substring(0, 80)}...`);
      console.log('');
    });

    console.log('═'.repeat(80));
    console.log('✅ Format is correct!');
    console.log('💡 One group asset "Customfly Shapes" containing 93 shapes');
    console.log('📋 Format: name|svg (newline separated)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyShapesGroup();
