const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLatestAIShapes() {
  try {
    console.log('🔧 Fixing Latest AI-created Shapes...\n');

    // Find all shape assets with wrong format
    const wrongFormatAssets = await prisma.asset.findMany({
      where: {
        type: 'shape'
      }
    });

    let fixed = 0;
    
    for (const asset of wrongFormatAssets) {
      // Check if format is wrong (shapes in config)
      if (asset.config?.shapes && Array.isArray(asset.config.shapes)) {
        console.log(`📝 Fixing: ${asset.name}`);
        console.log(`   Current format: WRONG (shapes in config)`);
        
        const shapesArray = asset.config.shapes;
        console.log(`   Found ${shapesArray.length} shapes in config`);
        
        // Convert to correct format
        const correctValue = shapesArray.map(shape => {
          const name = shape.name || 'Unnamed';
          const svg = shape.svg || '';
          return `${name}|${svg}`;
        }).join('\n');
        
        // Update the asset
        await prisma.asset.update({
          where: { id: asset.id },
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
        
        console.log(`   ✅ Fixed! ${shapesArray.length} shapes converted`);
        console.log(`   New value length: ${correctValue.length} characters\n`);
        fixed++;
      }
    }
    
    if (fixed === 0) {
      console.log('✅ All shape assets are already in correct format!');
    } else {
      console.log(`\n✅ Fixed ${fixed} asset(s)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLatestAIShapes()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
