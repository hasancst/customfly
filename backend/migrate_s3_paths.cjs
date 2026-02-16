const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

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

async function migrateS3Paths() {
  console.log('=== MIGRATING S3 PATHS ===\n');
  console.log(`Shop: ${SHOP}`);
  console.log(`Bucket: ${BUCKET}\n`);

  const folders = ['fonts', 'gallery', 'shapes'];
  let totalMoved = 0;
  let totalFailed = 0;

  for (const folder of folders) {
    console.log(`\n--- Processing ${folder.toUpperCase()} ---`);
    
    try {
      // List files in OLD path: fonts/uploadfly-lab.myshopify.com/
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${folder}/${SHOP}/`,
        MaxKeys: 1000
      });

      const response = await s3Client.send(listCommand);
      
      if (!response.Contents || response.Contents.length === 0) {
        console.log(`  No files found in ${folder}/${SHOP}/`);
        continue;
      }

      console.log(`  Found ${response.Contents.length} files to migrate`);

      for (const obj of response.Contents) {
        const oldKey = obj.Key;
        
        // Extract filename from old path: fonts/uploadfly-lab.myshopify.com/filename.otf
        const filename = oldKey.split('/').pop();
        
        // Create new path: uploadfly-lab.myshopify.com/fonts/filename.otf
        const newKey = `${SHOP}/${folder}/${filename}`;

        try {
          // Copy to new location
          const copyCommand = new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/${oldKey}`,
            Key: newKey
          });

          await s3Client.send(copyCommand);
          console.log(`  ✓ Copied: ${filename}`);

          // Delete old file
          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: oldKey
          });

          await s3Client.send(deleteCommand);
          console.log(`  ✓ Deleted old: ${oldKey}`);

          totalMoved++;
        } catch (error) {
          console.log(`  ✗ Failed to migrate ${filename}: ${error.message}`);
          totalFailed++;
        }
      }
    } catch (error) {
      console.log(`  Error processing ${folder}: ${error.message}`);
    }
  }

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Total moved: ${totalMoved}`);
  console.log(`Total failed: ${totalFailed}`);

  // Now create database records for migrated assets
  console.log(`\n--- Creating Database Records ---`);
  
  try {
    await createDatabaseRecords();
  } catch (error) {
    console.log(`Error creating database records: ${error.message}`);
  }

  await prisma.$disconnect();
}

async function createDatabaseRecords() {
  const shop = SHOP;
  
  // List fonts in new location
  const fontsCommand = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `${shop}/fonts/`,
    MaxKeys: 1000
  });

  const fontsResponse = await s3Client.send(fontsCommand);
  
  if (fontsResponse.Contents && fontsResponse.Contents.length > 0) {
    console.log(`\nCreating ${fontsResponse.Contents.length} font records...`);
    
    for (const obj of fontsResponse.Contents) {
      const filename = obj.Key.split('/').pop();
      const fontName = filename.replace(/\.[^/.]+$/, '').replace(/-\d+$/, ''); // Remove extension and timestamp
      const url = `https://${BUCKET}.${process.env.S3_REGION}.linodeobjects.com/${obj.Key}`;
      
      try {
        await prisma.asset.create({
          data: {
            shop,
            type: 'font',
            name: fontName,
            value: url,
            config: {
              filename,
              uploadedAt: new Date().toISOString()
            }
          }
        });
        console.log(`  ✓ Created font record: ${fontName}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`  - Font already exists: ${fontName}`);
        } else {
          console.log(`  ✗ Failed to create font record: ${error.message}`);
        }
      }
    }
  }

  // List gallery images in new location
  const galleryCommand = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `${shop}/gallery/`,
    MaxKeys: 1000
  });

  const galleryResponse = await s3Client.send(galleryCommand);
  
  if (galleryResponse.Contents && galleryResponse.Contents.length > 0) {
    console.log(`\nCreating ${galleryResponse.Contents.length} gallery records...`);
    
    for (const obj of galleryResponse.Contents) {
      const filename = obj.Key.split('/').pop();
      const imageName = filename.replace(/\.[^/.]+$/, '').replace(/^\d+-/, ''); // Remove extension and timestamp prefix
      const url = `https://${BUCKET}.${process.env.S3_REGION}.linodeobjects.com/${obj.Key}`;
      
      try {
        await prisma.asset.create({
          data: {
            shop,
            type: 'gallery',
            name: imageName,
            value: url,
            config: {
              filename,
              uploadedAt: new Date().toISOString()
            }
          }
        });
        console.log(`  ✓ Created gallery record: ${imageName}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`  - Gallery already exists: ${imageName}`);
        } else {
          console.log(`  ✗ Failed to create gallery record: ${error.message}`);
        }
      }
    }
  }
}

migrateS3Paths().catch(console.error);
