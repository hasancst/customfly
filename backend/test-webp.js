#!/usr/bin/env node

/**
 * Test script to verify WebP conversion functionality
 * Tests both WebP-enabled and disabled uploads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3011';

async function createTestImage() {
    // Create a simple test PNG (1x1 red pixel)
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const testFile = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testFile, pngBuffer);
    return testFile;
}

async function testUpload(webpEnabled) {
    const testFile = await createTestImage();

    try {
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('image', fs.createReadStream(testFile));

        const webpParam = webpEnabled ? '&webp=true' : '';
        const url = `${API_URL}/imcst_api/public/upload/image?folder=gallery${webpParam}`;

        console.log(`\n🧪 Testing upload with WebP ${webpEnabled ? 'ENABLED' : 'DISABLED'}...`);
        console.log(`   URL: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Upload successful:`);
            console.log(`   Format: ${result.format}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Key: ${result.key}`);

            // Verify format
            if (webpEnabled && result.format !== 'webp') {
                console.log(`⚠️  WARNING: WebP was enabled but format is ${result.format}`);
            } else if (!webpEnabled && result.format === 'webp') {
                console.log(`⚠️  WARNING: WebP was disabled but format is ${result.format}`);
            } else {
                console.log(`✓  Format matches expectation`);
            }
        } else {
            console.log(`❌ Upload failed: ${response.status} ${response.statusText}`);
            const error = await response.text();
            console.log(`   Error: ${error}`);
        }
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }
}

async function runTests() {
    console.log('🚀 WebP Conversion Test Suite\n');
    console.log('='.repeat(60));

    // Test 1: Upload without WebP
    await testUpload(false);

    // Test 2: Upload with WebP
    await testUpload(true);

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Tests complete!\n');
    console.log('Expected Results:');
    console.log('  • Test 1: Should upload as PNG');
    console.log('  • Test 2: Should upload as WebP');
    console.log('\nTo verify manually:');
    console.log('  1. Check S3 bucket for uploaded files');
    console.log('  2. Verify file extensions (.png vs .webp)');
    console.log('  3. Compare file sizes (WebP should be smaller)');
}

runTests().catch(console.error);
