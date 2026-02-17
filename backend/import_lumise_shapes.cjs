const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Data shapes dari Lumise (hanya name dan content/SVG)
// Data ini diambil dari tabel lumise_shapes
const lumiseShapes = require('./lumise_shapes_full.json');

async function importShapes() {
  try {
    console.log('🚀 Starting Lumise Shapes Import...\n');

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
    let totalSkipped = 0;

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

      if (existingShapes) {
        console.log(`⚠️  Shop already has "Customfly Shapes" asset. Skipping...`);
        totalSkipped++;
        continue;
      }

      // Create shapes asset for this shop
      const shapesValue = lumiseShapes.map(shape => 
        `${shape.name}|${shape.content}`
      ).join(', ');

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
            shapeCount: lumiseShapes.length
          }
        }
      });

      console.log(`✅ Created "Customfly Shapes" asset`);
      console.log(`   - Asset ID: ${asset.id}`);
      console.log(`   - Shapes count: ${lumiseShapes.length}`);
      console.log(`   - Type: ${asset.type}`);
      totalCreated++;
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Import Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ Assets created: ${totalCreated}`);
    console.log(`⚠️  Assets skipped: ${totalSkipped}`);
    console.log(`📦 Total shops processed: ${sessions.length}`);
    console.log(`🎨 Shapes per asset: ${lumiseShapes.length}`);
    console.log('═'.repeat(60));
    console.log('\n✨ Import completed successfully!\n');

  } catch (error) {
    console.error('❌ Error importing shapes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
importShapes()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
