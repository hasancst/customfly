const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApiResponse() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Simulate what the API does
    const assets = await prisma.asset.findMany({ 
      where: { shop },
      orderBy: { createdAt: 'desc' } 
    });
    
    const customflyColors = assets.find(a => a.name === 'Customfly Colors');
    
    if (!customflyColors) {
      console.log('Customfly Colors not found');
      return;
    }
    
    console.log('Asset found in API response:');
    console.log('ID:', customflyColors.id);
    console.log('Name:', customflyColors.name);
    console.log('Type:', customflyColors.type);
    console.log('Value length:', customflyColors.value.length);
    console.log('\nValue:');
    console.log(customflyColors.value);
    
    // Parse like frontend does
    const safeSplit = (val) => {
      if (!val) return [];
      const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 1 && !lines[0].includes('base64,')) {
        return lines[0].split(',').map(s => s.trim()).filter(Boolean);
      }
      return lines;
    };
    
    const parsed = safeSplit(customflyColors.value);
    console.log('\nParsed count:', parsed.length);
    console.log('First 3:', parsed.slice(0, 3));
    console.log('Last 3:', parsed.slice(-3));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApiResponse();
