const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

async function cleanupFontGroups() {
  console.log('=== CLEANING UP FONT GROUPS ===\n');

  try {
    // Get all font groups
    const fonts = await prisma.asset.findMany({
      where: { shop: SHOP, type: 'font' },
      select: { id: true, name: true, label: true, config: true }
    });

    console.log(`Found ${fonts.length} font groups\n`);

    // Find the correct one (has uploaded fonts from S3)
    const correctGroup = fonts.find(f => 
      f.config && 
      f.config.fontType === 'uploaded' && 
      f.config.fonts && 
      Array.isArray(f.config.fonts)
    );

    if (!correctGroup) {
      console.log('❌ Could not find the correct font group with uploaded fonts');
      await prisma.$disconnect();
      return;
    }

    console.log('✓ Correct group found:');
    console.log(`  Name: ${correctGroup.name}`);
    console.log(`  Fonts: ${correctGroup.config.fonts.length}`);
    console.log(`  ID: ${correctGroup.id}\n`);

    // Delete all other font groups
    const toDelete = fonts.filter(f => f.id !== correctGroup.id);

    if (toDelete.length === 0) {
      console.log('✓ No other groups to delete');
    } else {
      console.log(`Deleting ${toDelete.length} old groups:\n`);
      
      for (const font of toDelete) {
        await prisma.asset.delete({
          where: { id: font.id }
        });
        console.log(`  ✓ Deleted: ${font.name}`);
      }
    }

    // Verify final state
    console.log('\n--- Final State ---');
    const finalCount = await prisma.asset.count({
      where: { shop: SHOP, type: 'font' }
    });
    
    console.log(`Font groups remaining: ${finalCount}`);
    
    if (finalCount === 1) {
      console.log('\n✅ Cleanup successful! Only "Customfly Monogram" remains.');
    } else {
      console.log('\n⚠️  Warning: Expected 1 group, found', finalCount);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupFontGroups().catch(console.error);
