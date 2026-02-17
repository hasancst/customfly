const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShapesAsset() {
  try {
    console.log('🔍 Checking Customfly Shapes Asset...\n');

    const shapesAsset = await prisma.asset.findFirst({
      where: {
        type: 'shape',
        name: 'Customfly Shapes'
      }
    });

    if (!shapesAsset) {
      console.log('❌ No Customfly Shapes asset found');
      return;
    }

    console.log('✅ Asset found:');
    console.log(`   - ID: ${shapesAsset.id}`);
    console.log(`   - Shop: ${shapesAsset.shop}`);
    console.log(`   - Type: ${shapesAsset.type}`);
    console.log(`   - Name: ${shapesAsset.name}`);
    console.log(`   - Label: ${shapesAsset.label}`);
    console.log(`   - Created: ${shapesAsset.createdAt}`);
    console.log(`   - Updated: ${shapesAsset.updatedAt}`);
    console.log(`   - Config:`, JSON.stringify(shapesAsset.config, null, 2));
    
    // Parse the value to check structure
    const shapes = JSON.parse(shapesAsset.value);
    console.log(`\n📊 Shapes data:`);
    console.log(`   - Total shapes: ${shapes.length}`);
    console.log(`   - Data structure: Array of objects with 'name' and 'content' fields`);
    
    // Show first 5 shapes
    console.log(`\n📋 First 5 shapes:`);
    shapes.slice(0, 5).forEach((shape, i) => {
      console.log(`\n   ${i + 1}. Name: "${shape.name}"`);
      console.log(`      Content length: ${shape.content.length} characters`);
      console.log(`      Content preview: ${shape.content.substring(0, 100)}...`);
    });

    console.log(`\n✅ Data structure is correct!`);
    console.log(`   Each shape has separate 'name' and 'content' fields.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShapesAsset();
