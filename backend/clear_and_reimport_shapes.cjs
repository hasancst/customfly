const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function clearAndReimportShapes() {
  try {
    console.log('🔧 Clear and Re-import Customfly Shapes...\n');

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

      // Step 1: Delete ALL existing shape assets for this shop
      console.log(`   🗑️  Deleting all existing shape assets...`);
      const deleted = await prisma.asset.deleteMany({
        where: {
          shop: shop,
          type: 'shape'
        }
      });
      console.log(`   ✅ Deleted ${deleted.count} old asset(s)`);

      // Step 2: Create individual shape assets
      console.log(`   📝 Creating ${shapes.length} new shape assets...`);
      
      let created = 0;
      for (const shape of shapes) {
        await prisma.asset.create({
          data: {
            shop: shop,
            type: 'shape',
            name: shape.name,
            label: shape.name,
            value: shape.svg,
            isDefault: false,
            config: {
              source: 'lumise',
              imported: new Date().toISOString()
            }
          }
        });
        created++;
        
        // Show progress every 10 shapes
        if (created % 10 === 0) {
          console.log(`   ... ${created}/${shapes.length} created`);
        }
      }

      console.log(`   ✅ Created ${created} shape assets\n`);
    }

    console.log('═'.repeat(60));
    console.log('📊 Import Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ Total shapes imported: ${shapes.length}`);
    console.log(`💡 Each shape is now a separate asset`);
    console.log(`📋 Format: name="${shape.name}", value=SVG content`);
    console.log('═'.repeat(60));
    console.log('\n✨ Import completed successfully!\n');

    // Show sample
    console.log('📋 Sample of first 3 shapes:');
    shapes.slice(0, 3).forEach((shape, i) => {
      console.log(`   ${i + 1}. Name: "${shape.name}"`);
      console.log(`      SVG length: ${shape.svg.length} characters`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
clearAndReimportShapes()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
