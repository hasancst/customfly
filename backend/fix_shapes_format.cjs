const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixShapesFormat() {
  try {
    console.log('🔧 Fixing Shapes Format...\n');

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

    // Extract shapes
    const shapes = shapesTable.data.map(shape => ({
      name: shape.name,
      svg: shape.content
    }));

    console.log(`✅ Extracted ${shapes.length} shapes from lumi.json\n`);

    // Format: name|svg (one per line, separated by newline)
    const shapesValue = shapes.map(shape => `${shape.name}|${shape.svg}`).join('\n');

    console.log(`📝 Formatted value length: ${shapesValue.length} characters`);
    console.log(`📋 Format: name|svg (newline separated)\n`);

    // Get all shops
    const sessions = await prisma.session.findMany({
      select: { shop: true },
      distinct: ['shop']
    });

    if (sessions.length === 0) {
      console.log('❌ No shops found in database.');
      return;
    }

    console.log(`📦 Found ${sessions.length} shop(s)\n`);

    for (const session of sessions) {
      const shop = session.shop;
      console.log(`🏪 Processing shop: ${shop}`);
      console.log('─'.repeat(60));

      // Step 1: Delete ALL existing shape assets
      console.log(`   🗑️  Deleting all existing shape assets...`);
      const deleted = await prisma.asset.deleteMany({
        where: {
          shop: shop,
          type: 'shape'
        }
      });
      console.log(`   ✅ Deleted ${deleted.count} old asset(s)`);

      // Step 2: Create ONE group asset with all shapes
      console.log(`   📝 Creating "Customfly Shapes" group asset...`);
      
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
            shapeCount: shapes.length,
            format: 'name|svg (newline separated)'
          }
        }
      });

      console.log(`   ✅ Created asset ID: ${asset.id}`);
      console.log(`   📊 Contains ${shapes.length} shapes\n`);
    }

    console.log('═'.repeat(60));
    console.log('📊 Import Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ Created 1 group asset: "Customfly Shapes"`);
    console.log(`🎨 Contains ${shapes.length} shapes`);
    console.log(`📋 Format: name|svg (newline separated)`);
    console.log('═'.repeat(60));
    console.log('\n✨ Import completed successfully!\n');

    // Show sample
    console.log('📋 Sample of first 3 shapes:');
    shapes.slice(0, 3).forEach((shape, i) => {
      console.log(`   ${i + 1}. ${shape.name}`);
      console.log(`      SVG: ${shape.svg.substring(0, 60)}...`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
fixShapesFormat()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
