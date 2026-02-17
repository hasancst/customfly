const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAIShapes() {
  try {
    console.log('🔧 Fixing AI-created Shapes Asset...\n');

    const aiShapes = await prisma.asset.findFirst({
      where: {
        type: 'shape',
        name: 'Customfly Default'
      }
    });

    if (!aiShapes) {
      console.log('❌ Customfly Default asset not found');
      return;
    }

    console.log('✅ Found asset:', aiShapes.name);
    console.log('   Current format: WRONG (shapes in config, names in value)');

    // Extract shapes from config
    const shapesArray = aiShapes.config?.shapes || [];
    
    if (shapesArray.length === 0) {
      console.log('❌ No shapes found in config');
      return;
    }

    console.log(`   Found ${shapesArray.length} shapes in config\n`);

    // Convert to correct format: name|svg (newline separated)
    const correctValue = shapesArray.map(shape => {
      const name = shape.name || 'Unnamed';
      const svg = shape.svg || '';
      return `${name}|${svg}`;
    }).join('\n');

    console.log('📝 Converting to correct format...');
    console.log(`   Format: name|svg (newline separated)`);
    console.log(`   New value length: ${correctValue.length} characters\n`);

    // Update the asset
    await prisma.asset.update({
      where: { id: aiShapes.id },
      data: {
        value: correctValue,
        config: {
          source: 'ai-generated',
          imported: new Date().toISOString(),
          shapeCount: shapesArray.length,
          format: 'name|svg (newline separated)'
        }
      }
    });

    console.log('✅ Asset updated successfully!');
    console.log(`   - ${shapesArray.length} shapes converted`);
    console.log(`   - Format: name|svg (newline separated)`);
    console.log(`   - Config cleaned up\n`);

    // Show sample
    console.log('📋 Sample of first 3 shapes:');
    shapesArray.slice(0, 3).forEach((shape, i) => {
      console.log(`   ${i + 1}. ${shape.name}`);
      console.log(`      SVG: ${shape.svg.substring(0, 60)}...`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAIShapes()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
