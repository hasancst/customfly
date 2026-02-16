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

async function checkShapes() {
  console.log('=== CHECKING S3 FOR SHAPES ===\n');
  
  const folders = [
    `${SHOP}/shapes/`,
    `shapes/${SHOP}/`,
    'shapes/'
  ];
  
  for (const prefix of folders) {
    console.log(`\nChecking: ${prefix}`);
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 100
      });
      
      const response = await s3Client.send(command);
      
      if (response.Contents && response.Contents.length > 0) {
        console.log(`  Found ${response.Contents.length} files:`);
        response.Contents.forEach(obj => {
          console.log(`    - ${obj.Key}`);
        });
      } else {
        console.log(`  No files found`);
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
}

checkShapes().catch(console.error);
