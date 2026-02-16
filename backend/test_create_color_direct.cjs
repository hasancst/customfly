const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreateColor() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    const colors = [
      { name: 'Red', hex: '#FF0000' },
      { name: 'Green', hex: '#00FF00' },
      { name: 'Blue', hex: '#0000FF' },
      { name: 'Yellow', hex: '#FFFF00' },
      { name: 'Purple', hex: '#800080' }
    ];
    
    const colorValue = colors
      .map(c => `${c.name}|${c.hex}`)
      .join(', ');
    
    console.log('Creating color palette with value:');
    console.log(colorValue);
    console.log('\nValue length:', colorValue.length);
    
    const asset = await prisma.asset.create({
      data: {
        shop,
        type: 'color',
        name: 'Test Colors Direct',
        value: colorValue,
        label: 'Test',
        config: {
          group: 'Test',
          category: 'Test',
          colorCount: colors.length,
          colors: colors
        }
      }
    });
    
    console.log('\nAsset created:');
    console.log('ID:', asset.id);
    console.log('Value:', asset.value);
    console.log('Value length:', asset.value.length);
    
    // Verify
    const saved = await prisma.asset.findUnique({
      where: { id: asset.id }
    });
    
    console.log('\nVerification:');
    console.log('Saved value:', saved.value);
    console.log('Saved value length:', saved.value.length);
    
    const colorPairs = saved.value.split(',').map(pair => pair.trim());
    console.log('Colors count:', colorPairs.length);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateColor();
