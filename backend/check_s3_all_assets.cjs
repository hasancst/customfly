const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

async function checkS3Assets() {
  console.log('=== CHECKING S3 ASSETS ===\n');
  console.log(`Shop: ${SHOP}`);
  console.log(`Bucket: ${BUCKET}\n`);

  const folders = ['fonts', 'gallery', 'shapes', 'clipart', 'patterns'];

  for (const folder of folders) {
    console.log(`\n--- ${folder.toUpperCase()} ---`);
    
    try {
      // Check new path: uploadfly-lab.myshopify.com/fonts/
      const newPathCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${SHOP}/${folder}/`,
        MaxKeys: 100
      });

      const newPathResponse = await s3Client.send(newPathCommand);
      
      if (newPathResponse.Contents && newPathResponse.Contents.length > 0) {
        console.log(`  New path (${SHOP}/${folder}/): ${newPathResponse.Contents.length} files`);
        newPathResponse.Contents.slice(0, 5).forEach(obj => {
          console.log(`    - ${obj.Key}`);
        });
      } else {
        console.log(`  New path (${SHOP}/${folder}/): No files`);
      }

      // Check old path: fonts/uploadfly-lab.myshopify.com/
      const oldPathCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${folder}/${SHOP}/`,
        MaxKeys: 100
      });

      const oldPathResponse = await s3Client.send(oldPathCommand);
      
      if (oldPathResponse.Contents && oldPathResponse.Contents.length > 0) {
        console.log(`  Old path (${folder}/${SHOP}/): ${oldPathResponse.Contents.length} files`);
        oldPathResponse.Contents.slice(0, 5).forEach(obj => {
          console.log(`    - ${obj.Key}`);
        });
      } else {
        console.log(`  Old path (${folder}/${SHOP}/): No files`);
      }

      // Check root path: gallery/ (no shop folder)
      const rootPathCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${folder}/`,
        MaxKeys: 100
      });

      const rootPathResponse = await s3Client.send(rootPathCommand);
      
      if (rootPathResponse.Contents && rootPathResponse.Contents.length > 0) {
        const rootFiles = rootPathResponse.Contents.filter(obj => {
          const parts = obj.Key.split('/');
          return parts.length === 2 && parts[0] === folder; // Only files directly in folder/
        });
        
        if (rootFiles.length > 0) {
          console.log(`  Root path (${folder}/): ${rootFiles.length} files`);
          rootFiles.slice(0, 5).forEach(obj => {
            console.log(`    - ${obj.Key}`);
          });
        }
      }

    } catch (error) {
      console.log(`  Error checking ${folder}: ${error.message}`);
    }
  }

  console.log('\n=== DONE ===');
}

checkS3Assets().catch(console.error);
