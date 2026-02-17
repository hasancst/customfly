const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCustomShapes() {
  try {
    console.log('🔧 Fixing Custom Shapes Asset...\n');

    const customAsset = await prisma.asset.findFirst({
      where: {
        type: 'shape',
        name: 'custom'
      }
    });

    if (!customAsset) {
      console.log('❌ Custom asset not found');
      return;
    }

    console.log('✅ Found asset:', customAsset.name);
    console.log('   Config:', JSON.stringify(customAsset.config, null, 2));

    // Extract shapes from config
    const shapesArray = customAsset.config?.shapes || [];
    
    if (shapesArray.length === 0) {
      console.log('❌ No shapes found in config');
      return;
    }

    console.log(`\n📝 Converting ${shapesArray.length} shapes to SVG format...\n`);

    // Convert each shape to full SVG
    const svgShapes = shapesArray.map(shape => {
      const name = shape.name || 'Unnamed';
      const path = shape.path || '';
      const viewBox = shape.viewBox || '0 0 24 24';
      
      // Create complete SVG from path
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100" height="100"><path d="${path}" fill="currentColor"/></svg>`;
      
      console.log(`   ✅ ${name}: ${svg.length} chars`);
      
      return `${name}|${svg}`;
    });

    const correctValue = svgShapes.join('\n');
    
    console.log(`\n📊 Total value length: ${correctValue.length} characters`);
    console.log(`📋 Preview:\n${correctValue.substring(0, 200)}...\n`);

    // Update the asset
    await prisma.asset.update({
      where: { id: customAsset.id },
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

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomShapes()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
