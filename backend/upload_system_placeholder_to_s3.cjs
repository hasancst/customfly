#!/usr/bin/env node

/**
 * Upload System Placeholder to S3
 * 
 * This script uploads the system placeholder image to S3 so it can be
 * accessed from frontend customer (storefront).
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function uploadSystemPlaceholder() {
    console.log('\n=== UPLOAD SYSTEM PLACEHOLDER TO S3 ===\n');

    try {
        // Import S3 service
        const { uploadToS3 } = await import('../backend/services/s3Service.js');
        const { getCDNUrl } = await import('../backend/config/s3.js');

        // Path to system placeholder
        const placeholderPath = path.join(__dirname, '../frontend/public/images/system-placeholder.png');
        
        console.log('📋 Checking file...');
        console.log('   Path:', placeholderPath);
        
        if (!fs.existsSync(placeholderPath)) {
            console.error('❌ File not found:', placeholderPath);
            console.log('\n💡 Alternative paths to check:');
            console.log('   - frontend/dist/images/system-placeholder.png');
            console.log('   - frontend/public/images/system-placeholder.png');
            return;
        }

        console.log('✅ File found');
        
        // Read file
        const fileBuffer = fs.readFileSync(placeholderPath);
        console.log('   Size:', (fileBuffer.length / 1024).toFixed(2), 'KB');

        // Upload to S3
        console.log('\n📤 Uploading to S3...');
        const s3Key = 'system/system-placeholder.png';
        
        const url = await uploadToS3(fileBuffer, s3Key, 'image/png');
        const cdnUrl = getCDNUrl(url);
        
        console.log('✅ Upload successful!');
        console.log('\n📋 URLs:');
        console.log('   S3 URL:', url);
        console.log('   CDN URL:', cdnUrl);
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Update database to use CDN URL instead of /images/system-placeholder.png');
        console.log('   2. Run: node backend/replace_placeholder_urls.cjs');
        console.log('\n✅ Done!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

uploadSystemPlaceholder();
