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

async function migrateGalleryFromRoot() {
  console.log('=== MIGRATING GALLERY FROM ROOT ===\n');
  console.log(`Shop: ${SHOP}`);
  console.log(`Bucket: ${BUCKET}\n`);
  
  try {
    // List files in root gallery/
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'gallery/',
      MaxKeys: 1000
    });

    const response = await s3Client.send(listCommand);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('No files found in gallery/');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${response.Contents.length} files\n`);
    let moved = 0;
    let failed = 0;

    for (const obj of response.Contents) {
      const oldKey = obj.Key;
      const filename = oldKey.split('/').pop();
      
      // Skip if it's a folder
      if (!filename) continue;
      
      const newKey = `${SHOP}/gallery/${filename}`;

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
        
        // Create database record
        const imageName = filename.replace(/\.[^/.]+$/, '').replace(/^\d+-/, '');
        const url = `https://${BUCKET}.${process.env.S3_REGION || 'us-southeast-1'}.linodeobjects.com/${newKey}`;
        
        try {
          await prisma.asset.create({
            data: {
              shop: SHOP,
              type: 'gallery',
              name: imageName,
              value: url,
              config: {
                filename,
                uploadedAt: new Date().toISOString()
              }
            }
          });
          console.log(`  ✓ Created database record: ${imageName}\n`);
        } catch (dbError) {
          if (dbError.code === 'P2002') {
            console.log(`  - Database record already exists: ${imageName}\n`);
          } else {
            console.log(`  ✗ Failed to create database record: ${dbError.message}\n`);
          }
        }
        
        moved++;
      } catch (error) {
        console.log(`  ✗ Failed to migrate ${filename}: ${error.message}\n`);
        failed++;
      }
    }

    console.log(`\n=== MIGRATION COMPLETE ===`);
    console.log(`Total moved: ${moved}`);
    console.log(`Total failed: ${failed}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  await prisma.$disconnect();
}

migrateGalleryFromRoot().catch(console.error);
