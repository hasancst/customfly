const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHistory() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    // Check all font assets including deleted ones
    const fonts = await prisma.asset.findMany({
      where: {
        shop: shop,
        type: 'font'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total font groups in database: ${fonts.length}\n`);
    
    fonts.forEach((font, index) => {
      console.log(`${index + 1}. ${font.name}`);
      console.log(`   ID: ${font.id}`);
      console.log(`   Created: ${font.createdAt}`);
      console.log(`   Updated: ${font.updatedAt}`);
      console.log(`   Label: ${font.label}`);
      console.log(`   Config.fontType: ${font.config?.fontType}`);
      console.log(`   Config.googleConfig: ${font.config?.googleConfig}`);
      console.log('');
    });
    
    // Check if there are any with name containing "Google"
    const googleFonts = fonts.filter(f => f.name.toLowerCase().includes('google'));
    console.log(`\nFont groups with "Google" in name: ${googleFonts.length}`);
    googleFonts.forEach(f => console.log(`  - ${f.name} (${f.createdAt})`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistory();
