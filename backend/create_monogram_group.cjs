require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

async function createMonogramGroup() {
  console.log('=== CREATING CUSTOMFLY MONOGRAM GROUP ===\n');
  console.log(`Shop: ${SHOP}`);
  console.log(`Bucket: ${BUCKET}\n`);

  try {
    // 1. List all fonts from S3
    console.log('--- Fetching fonts from S3 ---');
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${SHOP}/fonts/`,
      MaxKeys: 100
    });

    const response = await s3Client.send(listCommand);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ No fonts found in S3');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${response.Contents.length} font files in S3\n`);

    // 2. Process each font and collect URLs
    const fontUrls = [];
    const fontNames = [];

    for (const obj of response.Contents) {
      const filename = obj.Key.split('/').pop();
      
      // Skip if not a font file
      if (!filename || !filename.match(/\.(otf|ttf|woff|woff2)$/i)) {
        continue;
      }

      // Clean font name (remove timestamp and extension)
      const fontName = filename
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/-\d+$/, '') // Remove timestamp
        .replace(/_/g, ' '); // Replace underscores with spaces

      const url = `https://${BUCKET}.${process.env.S3_REGION}.linodeobjects.com/${obj.Key}`;
      
      fontUrls.push(url);
      fontNames.push(fontName);
      
      console.log(`  ✓ ${fontName}`);
      console.log(`    URL: ${url}`);
    }

    if (fontUrls.length === 0) {
      console.log('\n❌ No valid font files found');
      await prisma.$disconnect();
      return;
    }

    console.log(`\n--- Creating Font Group ---`);
    console.log(`Group Name: Customfly Monogram`);
    console.log(`Total Fonts: ${fontUrls.length}\n`);

    // 3. Create single asset record with all fonts
    // Format: URL1|Name1, URL2|Name2, ...
    const fontValue = fontUrls.map((url, index) => {
      return `${url}|${fontNames[index]}`;
    }).join('\n');

    const asset = await prisma.asset.create({
      data: {
        shop: SHOP,
        type: 'font',
        name: 'Customfly Monogram',
        value: fontValue,
        label: 'Monogram',
        config: {
          group: 'Monogram',
          category: 'Monogram Fonts',
          fontType: 'uploaded',
          fontCount: fontUrls.length,
          fonts: fontNames,
          createdAt: new Date().toISOString()
        }
      }
    });

    console.log('✅ Font group created successfully!');
    console.log(`   ID: ${asset.id}`);
    console.log(`   Name: ${asset.name}`);
    console.log(`   Fonts: ${fontUrls.length}`);

    // 4. Verify
    console.log('\n--- Verification ---');
    const count = await prisma.asset.count({
      where: { shop: SHOP, type: 'font' }
    });
    console.log(`Total font groups in database: ${count}`);

    console.log('\n✅ Done! Font group "Customfly Monogram" is ready.');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMonogramGroup().catch(console.error);
