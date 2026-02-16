const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

// 20 Most Popular Google Fonts
const POPULAR_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Oswald',
  'Raleway',
  'Nunito',
  'Playfair Display',
  'Merriweather',
  'Ubuntu',
  'Noto Sans',
  'Mukta',
  'Rubik',
  'Work Sans',
  'Bebas Neue',
  'Quicksand',
  'Josefin Sans',
  'Libre Baskerville'
];

async function createCustomflyFontGroup() {
  console.log('=== CREATING CUSTOMFLY FONT GROUP ===\n');
  console.log(`Shop: ${SHOP}`);
  console.log(`Fonts: ${POPULAR_FONTS.length}\n`);

  try {
    // Check if group already exists
    const existing = await prisma.asset.findFirst({
      where: {
        shop: SHOP,
        type: 'font',
        name: 'Customfly Font'
      }
    });

    if (existing) {
      console.log('⚠️  Group "Customfly Font" already exists');
      console.log('   Updating with new fonts...\n');
      
      await prisma.asset.update({
        where: { id: existing.id },
        data: {
          value: POPULAR_FONTS.join(', '),
          label: 'Popular Fonts',
          config: {
            group: 'Popular Fonts',
            category: 'Google Fonts',
            fontType: 'google',
            googleConfig: 'specific',
            specificFonts: POPULAR_FONTS.join(', '),
            fontCount: POPULAR_FONTS.length,
            fonts: POPULAR_FONTS,
            updatedAt: new Date().toISOString()
          }
        }
      });
      
      console.log('✅ Updated existing group');
    } else {
      console.log('Creating new group "Customfly Font"...\n');
      
      await prisma.asset.create({
        data: {
          shop: SHOP,
          type: 'font',
          name: 'Customfly Font',
          value: POPULAR_FONTS.join(', '),
          label: 'Popular Fonts',
          config: {
            group: 'Popular Fonts',
            category: 'Google Fonts',
            fontType: 'google',
            googleConfig: 'specific',
            specificFonts: POPULAR_FONTS.join(', '),
            fontCount: POPULAR_FONTS.length,
            fonts: POPULAR_FONTS,
            createdAt: new Date().toISOString()
          }
        }
      });
      
      console.log('✅ Created new group');
    }

    // Show fonts
    console.log('\n--- Fonts Included ---');
    POPULAR_FONTS.forEach((font, index) => {
      console.log(`  ${index + 1}. ${font}`);
    });

    // Verify
    console.log('\n--- Verification ---');
    const fontGroups = await prisma.asset.findMany({
      where: { shop: SHOP, type: 'font' },
      select: { name: true, config: true }
    });

    console.log(`Total font groups: ${fontGroups.length}`);
    fontGroups.forEach(group => {
      const fontCount = group.config?.fontCount || group.config?.fonts?.length || 0;
      console.log(`  - ${group.name}: ${fontCount} fonts`);
    });

    console.log('\n✅ Done! Font group "Customfly Font" is ready.');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCustomflyFontGroup().catch(console.error);
