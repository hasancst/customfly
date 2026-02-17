const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function extractAndImportShapes() {
  try {
    console.log('🚀 Starting Lumise Shapes Extraction and Import...\n');

    // Read lumi.json file
    const lumiPath = path.join(__dirname, '..', 'lumi.json');
    console.log(`📂 Reading file: ${lumiPath}`);
    
    const lumiData = JSON.parse(fs.readFileSync(lumiPath, 'utf-8'));
    
    // Find the shapes table data
    const shapesTable = lumiData.find(item => item.type === 'table' && item.name === 'lumise_shapes');
    
    if (!shapesTable || !shapesTable.data) {
      console.log('❌ No shapes data found in lumi.json');
      return;
    }

    const shapes = shapesTable.data.map(shape => ({
      name: shape.name,
      content: shape.content
    }));

    console.log(`✅ Extracted ${shapes.length} shapes from lumi.json\n`);

    // Get all active sessions (shops)
    const sessions = await prisma.session.findMany({
      select: {
        shop: true
      },
      distinct: ['shop']
    });

    if (sessions.length === 0) {
      console.log('❌ No shops found in database. Please install the app first.');
      return;
    }

    console.log(`📦 Found ${sessions.length} shop(s):`);
    sessions.forEach((s, i) => console.log(`   ${i + 1}. ${s.shop}`));
    console.log('');

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const session of sessions) {
      const shop = session.shop;
      console.log(`\n🏪 Processing shop: ${shop}`);
      console.log('─'.repeat(60));

      // Check if shop already has Customfly Shapes
      const existingShapes = await prisma.asset.findFirst({
        where: {
          shop: shop,
          type: 'shape',
          name: 'Customfly Shapes'
        }
      });

      // Store shapes as JSON array (proper format)
      const shapesValue = JSON.stringify(shapes);

      if (existingShapes) {
        // Update existing asset
        await prisma.asset.update({
          where: { id: existingShapes.id },
          data: {
            value: shapesValue,
            config: {
              source: 'lumise',
              imported: new Date().toISOString(),
              shapeCount: shapes.length,
              lastUpdated: new Date().toISOString()
            }
          }
        });
        console.log(`✅ Updated "Customfly Shapes" asset`);
        console.log(`   - Asset ID: ${existingShapes.id}`);
        console.log(`   - Shapes count: ${shapes.length}`);
        totalUpdated++;
      } else {
        // Create new asset
        const asset = await prisma.asset.create({
          data: {
            shop: shop,
            type: 'shape',
            name: 'Customfly Shapes',
            label: 'Customfly Shapes',
            value: shapesValue,
            isDefault: false,
            config: {
              source: 'lumise',
              imported: new Date().toISOString(),
              shapeCount: shapes.length
            }
          }
        });
        console.log(`✅ Created "Customfly Shapes" asset`);
        console.log(`   - Asset ID: ${asset.id}`);
        console.log(`   - Shapes count: ${shapes.length}`);
        totalCreated++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Import Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ Assets created: ${totalCreated}`);
    console.log(`🔄 Assets updated: ${totalUpdated}`);
    console.log(`📦 Total shops processed: ${sessions.length}`);
    console.log(`🎨 Shapes imported: ${shapes.length}`);
    console.log('═'.repeat(60));
    console.log('\n✨ Import completed successfully!\n');

    // Show sample of first 3 shapes
    console.log('📋 Sample shapes:');
    shapes.slice(0, 3).forEach((shape, i) => {
      console.log(`   ${i + 1}. ${shape.name}`);
      console.log(`      SVG: ${shape.content.substring(0, 80)}...`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
extractAndImportShapes()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
