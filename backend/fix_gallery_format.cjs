const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGalleryFormat() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    const galleries = await prisma.asset.findMany({
      where: {
        shop,
        type: 'gallery'
      }
    });
    
    console.log(`Found ${galleries.length} gallery asset(s)\n`);
    
    for (const asset of galleries) {
      console.log(`\nProcessing: ${asset.name}`);
      console.log('Current format:', asset.value.substring(0, 200));
      
      if (!asset.value) {
        console.log('  -> Empty, skipping');
        continue;
      }
      
      // Check if it's comma-separated (single line with commas)
      const lines = asset.value.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (lines.length === 1 && lines[0].includes(',')) {
        // It's comma-separated, convert to newline-separated
        const items = lines[0].split(',').map(s => s.trim()).filter(Boolean);
        const newValue = items.join('\n');
        
        console.log(`  -> Converting from comma-separated (${items.length} items) to newline-separated`);
        console.log('  -> New format:', newValue.substring(0, 200));
        
        await prisma.asset.update({
          where: { id: asset.id },
          data: { value: newValue }
        });
        
        console.log('  -> ✓ Updated');
      } else {
        console.log('  -> Already in correct format (newline-separated)');
      }
    }
    
    console.log('\n✓ Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixGalleryFormat();
