import axios from 'axios';
import { Upload } from '@aws-sdk/lib-storage';
import s3Client, { S3_BUCKET } from '../config/s3.js';
import logger from '../config/logger.js';

/**
 * Download image from URL and upload to S3
 * @param {string} imageUrl - URL of the image to download
 * @param {string} folder - S3 folder (e.g., 'gallery', 'patterns')
 * @param {string} filename - Optional filename (will generate if not provided)
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
export async function downloadAndUploadImage(imageUrl, folder = 'gallery', filename = null) {
    try {
        logger.info('[Image Downloader] Downloading image', { imageUrl, folder });

        // Download image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Get content type
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        // Generate filename if not provided
        if (!filename) {
            const ext = contentType.split('/')[1] || 'jpg';
            filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        }

        // Ensure filename has extension
        if (!filename.includes('.')) {
            const ext = contentType.split('/')[1] || 'jpg';
            filename = `${filename}.${ext}`;
        }

        const key = `${folder}/${filename}`;

        logger.info('[Image Downloader] Uploading to S3', { key, size: response.data.length });

        // Upload to S3
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: S3_BUCKET,
                Key: key,
                Body: Buffer.from(response.data),
                ContentType: contentType,
                ACL: 'public-read'
            }
        });

        await upload.done();

        // Construct S3 URL
        const s3Url = `${process.env.S3_PUBLIC_URL}/${key}`;
        
        logger.info('[Image Downloader] Upload successful', { s3Url });

        return s3Url;
    } catch (error) {
        logger.error('[Image Downloader] Failed to download/upload image', { 
            imageUrl, 
            error: error.message 
        });
        throw new Error(`Failed to download image: ${error.message}`);
    }
}

/**
 * Download multiple images and upload to S3
 * @param {Array<{url: string, name: string}>} images - Array of image objects
 * @param {string} folder - S3 folder
 * @returns {Promise<Array<{name: string, url: string}>>} - Array of uploaded images
 */
export async function downloadAndUploadMultipleImages(images, folder = 'gallery') {
    const results = [];
    
    for (const image of images) {
        try {
            const s3Url = await downloadAndUploadImage(image.url, folder, image.name);
            results.push({
                name: image.name,
                url: s3Url
            });
        } catch (error) {
            logger.error('[Image Downloader] Failed to process image', { 
                name: image.name, 
                url: image.url, 
                error: error.message 
            });
            // Continue with other images even if one fails
        }
    }
    
    return results;
}
