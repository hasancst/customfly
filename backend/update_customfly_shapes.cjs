const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load shapes dari Lumise
const lumiseShapes = require('./lumise_shapes_full.json');

async function updateCustomflyShapes() {
  try {
    console.log('🚀 Updating Customfly Shapes with Lumise data...\n');

    // Find existing Customfly Shapes assets
    const existingAssets = await prisma.asset.findMany({
      where: {
        type: 'shape',
        name: 'Customfly Shapes'
      }
    });

    if (existingAssets.length === 0) {
      console.log('❌ No "Customfly Shapes" assets found. Run import_lumise_shapes.cjs first.');
      return;
    }

    console.log(`📦 Found ${existingAssets.length} "Customfly Shapes" asset(s)\n`);

    // Format shapes: name|svg_content, name|svg_content, ...
    const shapesValue = lumiseShapes.map(shape => 
      `${shape.name}|${shape.content}`
    ).join(', ');

    let updated = 0;
    for (const asset of existingAssets) {
      console.log(`🔄 Updating asset for shop: ${asset.shop}`);
      
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          value: shapesValue,
          config: {
            source: 'lumise',
            imported: new Date().toISOString(),
            shapeCount: lumiseShapes.length,
            lastUpdated: new Date().toISOString()
          }
        }
      });

      console.log(`   ✅ Updated with ${lumiseShapes.length} shapes\n`);
      updated++;
    }

    console.log('═'.repeat(60));
    console.log('📊 Update Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ Assets updated: ${updated}`);
    console.log(`🎨 Shapes per asset: ${lumiseShapes.length}`);
    console.log('═'.repeat(60));
    console.log('\n✨ Update completed successfully!\n');

  } catch (error) {
    console.error('❌ Error updating shapes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateCustomflyShapes()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
