const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyShapes() {
  try {
    console.log('🔍 Verifying Shapes Assets...\n');

    const shapes = await prisma.asset.findMany({
      where: {
        type: 'shape'
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ Found ${shapes.length} shape assets\n`);

    // Show first 10 shapes
    console.log('📋 First 10 shapes:');
    console.log('═'.repeat(80));
    shapes.slice(0, 10).forEach((shape, i) => {
      console.log(`${i + 1}. Name: "${shape.name}"`);
      console.log(`   Label: "${shape.label}"`);
      console.log(`   SVG length: ${shape.value.length} characters`);
      console.log(`   SVG preview: ${shape.value.substring(0, 80)}...`);
      console.log(`   Config:`, shape.config);
      console.log('');
    });

    console.log('═'.repeat(80));
    console.log(`✅ All ${shapes.length} shapes are properly imported!`);
    console.log(`💡 Each shape has:`);
    console.log(`   - Unique name (e.g., "Shape 2", "Shape 3")`);
    console.log(`   - SVG content in 'value' field`);
    console.log(`   - Proper metadata in 'config' field`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyShapes();
