require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-southeast-1',
  endpoint: process.env.S3_ENDPOINT || 'https://us-southeast-1.linodeobjects.com',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  }
});

const BUCKET = process.env.S3_BUCKET || 'customfly';
const SHOP = 'uploadfly-lab.myshopify.com';

// Default shapes as SVG strings
const DEFAULT_SHAPES = [
  {
    name: 'Circle',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="currentColor"/></svg>'
  },
  {
    name: 'Square',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" fill="currentColor"/></svg>'
  },
  {
    name: 'Triangle',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="currentColor"/></svg>'
  },
  {
    name: 'Star',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 61,35 88,35 67,52 77,77 50,60 23,77 33,52 12,35 39,35" fill="currentColor"/></svg>'
  },
  {
    name: 'Heart',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,90 C50,90 10,65 10,40 C10,25 20,15 30,15 C40,15 50,25 50,25 C50,25 60,15 70,15 C80,15 90,25 90,40 C90,65 50,90 50,90 Z" fill="currentColor"/></svg>'
  },
  {
    name: 'Hexagon',
    category: 'Geometric',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="currentColor"/></svg>'
  },
  {
    name: 'Pentagon',
    category: 'Geometric',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,40 75,85 25,85 10,40" fill="currentColor"/></svg>'
  },
  {
    name: 'Octagon',
    category: 'Geometric',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="currentColor"/></svg>'
  },
  {
    name: 'Diamond',
    category: 'Geometric',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,50 50,90 10,50" fill="currentColor"/></svg>'
  },
  {
    name: 'Arrow Right',
    category: 'Arrows',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="10,30 60,30 60,10 90,50 60,90 60,70 10,70" fill="currentColor"/></svg>'
  },
  {
    name: 'Arrow Left',
    category: 'Arrows',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="90,30 40,30 40,10 10,50 40,90 40,70 90,70" fill="currentColor"/></svg>'
  },
  {
    name: 'Arrow Up',
    category: 'Arrows',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="30,90 30,40 10,40 50,10 90,40 70,40 70,90" fill="currentColor"/></svg>'
  },
  {
    name: 'Arrow Down',
    category: 'Arrows',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="30,10 30,60 10,60 50,90 90,60 70,60 70,10" fill="currentColor"/></svg>'
  },
  {
    name: 'Rounded Rectangle',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="20" width="90" height="60" rx="15" fill="currentColor"/></svg>'
  },
  {
    name: 'Ellipse',
    category: 'Basic Shapes',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="45" ry="30" fill="currentColor"/></svg>'
  }
];

async function restoreAssetGrouping() {
  console.log('=== RESTORING ASSET GROUPING ===\n');
  console.log(`Shop: ${SHOP}\n`);

  try {
    // 1. UPDATE EXISTING FONTS WITH GROUPING
    console.log('--- UPDATING FONTS GROUPING ---');
    const fonts = await prisma.asset.findMany({
      where: { shop: SHOP, type: 'font' }
    });

    console.log(`Found ${fonts.length} fonts to update`);
    
    for (const font of fonts) {
      const isMonogram = font.name.toLowerCase().includes('monogram');
      const group = isMonogram ? 'Monogram Fonts' : 'Custom Fonts';
      
      await prisma.asset.update({
        where: { id: font.id },
        data: {
          label: group, // Using label field for grouping
          config: {
            ...font.config,
            group: group,
            category: isMonogram ? 'Monogram' : 'Custom'
          }
        }
      });
      
      console.log(`  ✓ Updated: ${font.name} → Group: ${group}`);
    }

    // 2. UPDATE EXISTING GALLERY WITH GROUPING
    console.log('\n--- UPDATING GALLERY GROUPING ---');
    const galleryItems = await prisma.asset.findMany({
      where: { shop: SHOP, type: 'gallery' }
    });

    console.log(`Found ${galleryItems.length} gallery items to update`);
    
    // Categorize gallery items based on name patterns
    for (const item of galleryItems) {
      let category = 'Uncategorized';
      const nameLower = item.name.toLowerCase();
      
      if (nameLower.includes('anime') || nameLower.includes('girl') || nameLower.includes('boy')) {
        category = 'Anime & Characters';
      } else if (nameLower.includes('flower') || nameLower.includes('rose') || nameLower.includes('plant')) {
        category = 'Nature & Flowers';
      } else if (nameLower.includes('heart') || nameLower.includes('love') || nameLower.includes('valentine')) {
        category = 'Love & Romance';
      } else if (nameLower.includes('star') || nameLower.includes('sparkle') || nameLower.includes('firework')) {
        category = 'Decorative';
      } else if (nameLower.includes('404') || nameLower.includes('error') || nameLower.includes('icon')) {
        category = 'Icons & UI';
      } else if (nameLower.includes('pattern') || nameLower.includes('texture')) {
        category = 'Patterns';
      } else {
        category = 'General Clipart';
      }
      
      await prisma.asset.update({
        where: { id: item.id },
        data: {
          label: category,
          config: {
            ...item.config,
            category: category,
            group: category
          }
        }
      });
      
      console.log(`  ✓ Updated: ${item.name} → Category: ${category}`);
    }

    // 3. ADD DEFAULT SHAPES
    console.log('\n--- ADDING DEFAULT SHAPES ---');
    
    let shapesAdded = 0;
    let shapesSkipped = 0;
    
    for (const shape of DEFAULT_SHAPES) {
      // Check if shape already exists
      const existing = await prisma.asset.findFirst({
        where: {
          shop: SHOP,
          type: 'shape',
          name: shape.name
        }
      });
      
      if (existing) {
        console.log(`  - Shape already exists: ${shape.name}`);
        shapesSkipped++;
        continue;
      }
      
      // Upload SVG to S3
      const filename = `${shape.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
      const s3Key = `${SHOP}/shapes/${filename}`;
      
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          Body: shape.svg,
          ContentType: 'image/svg+xml',
          ACL: 'public-read'
        }));
        
        const url = `https://${BUCKET}.${process.env.S3_REGION}.linodeobjects.com/${s3Key}`;
        
        // Create database record
        await prisma.asset.create({
          data: {
            shop: SHOP,
            type: 'shape',
            name: shape.name,
            value: url,
            label: shape.category,
            config: {
              filename: filename,
              category: shape.category,
              group: shape.category,
              svg: shape.svg,
              uploadedAt: new Date().toISOString()
            }
          }
        });
        
        console.log(`  ✓ Added: ${shape.name} → Category: ${shape.category}`);
        shapesAdded++;
      } catch (error) {
        console.log(`  ✗ Failed to add ${shape.name}: ${error.message}`);
      }
    }

    // 4. SUMMARY
    console.log('\n=== SUMMARY ===');
    console.log(`Fonts updated: ${fonts.length}`);
    console.log(`Gallery items updated: ${galleryItems.length}`);
    console.log(`Shapes added: ${shapesAdded}`);
    console.log(`Shapes skipped: ${shapesSkipped}`);
    
    // Final count
    const finalCounts = {
      fonts: await prisma.asset.count({ where: { shop: SHOP, type: 'font' } }),
      colors: await prisma.asset.count({ where: { shop: SHOP, type: 'color' } }),
      gallery: await prisma.asset.count({ where: { shop: SHOP, type: 'gallery' } }),
      shapes: await prisma.asset.count({ where: { shop: SHOP, type: 'shape' } })
    };
    
    console.log('\n=== FINAL ASSET COUNT ===');
    console.log(`Fonts: ${finalCounts.fonts}`);
    console.log(`Colors: ${finalCounts.colors}`);
    console.log(`Gallery: ${finalCounts.gallery}`);
    console.log(`Shapes: ${finalCounts.shapes}`);
    console.log(`Total: ${Object.values(finalCounts).reduce((a, b) => a + b, 0)}`);
    
    console.log('\n✅ Asset grouping restored successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreAssetGrouping().catch(console.error);
