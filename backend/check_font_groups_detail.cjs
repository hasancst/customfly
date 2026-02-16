const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFontGroups() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    const fonts = await prisma.asset.findMany({
      where: {
        shop: shop,
        type: 'font'
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Total font groups: ${fonts.length}\n`);
    
    fonts.forEach((font, index) => {
      console.log(`${index + 1}. ${font.name}`);
      console.log(`   ID: ${font.id}`);
      console.log(`   Created: ${font.createdAt}`);
      console.log(`   Config:`, JSON.stringify(font.config, null, 2));
      console.log(`   Value (first 100 chars): ${font.value.substring(0, 100)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFontGroups();
