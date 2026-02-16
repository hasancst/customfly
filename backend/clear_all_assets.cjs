const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SHOP = 'uploadfly-lab.myshopify.com';

async function clearAllAssets() {
  console.log('=== CLEARING ALL ASSETS ===\n');
  console.log(`Shop: ${SHOP}\n`);

  try {
    // Count before deletion
    const beforeCount = await prisma.asset.count({
      where: { shop: SHOP }
    });

    console.log(`Assets found: ${beforeCount}\n`);

    if (beforeCount === 0) {
      console.log('No assets to delete.');
      await prisma.$disconnect();
      return;
    }

    // Show breakdown by type
    const types = ['font', 'color', 'gallery', 'shape', 'option'];
    console.log('Breakdown by type:');
    for (const type of types) {
      const count = await prisma.asset.count({
        where: { shop: SHOP, type }
      });
      if (count > 0) {
        console.log(`  - ${type}: ${count}`);
      }
    }

    console.log('\nDeleting all assets...');

    // Delete all assets for this shop
    const result = await prisma.asset.deleteMany({
      where: { shop: SHOP }
    });

    console.log(`\n✅ Successfully deleted ${result.count} assets`);

    // Verify deletion
    const afterCount = await prisma.asset.count({
      where: { shop: SHOP }
    });

    console.log(`\nVerification: ${afterCount} assets remaining`);

    if (afterCount === 0) {
      console.log('\n✅ All assets cleared successfully!');
      console.log('\nNote: Files in S3 are NOT deleted. You can re-upload them from Assets menu.');
    } else {
      console.log('\n⚠️  Warning: Some assets may still remain');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllAssets().catch(console.error);
