import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for some S3-compatible providers like Linode
});

/**
 * Uploads a file buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 object key (path/filename)
 * @param {string} contentType - Mime type
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export async function uploadToS3(buffer, key, contentType) {
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                ACL: 'public-read', // Ensure it's publicly readable
            },
        });

        await upload.done();
        return `${process.env.S3_PUBLIC_URL}/${key}`;
    } catch (error) {
        console.error(`S3 Upload Error for key: ${key}`, {
            message: error.message,
            stack: error.stack,
            code: error.code,
            bucket: process.env.S3_BUCKET
        });
        throw error;
    }
}

/**
 * Converts a base64 string to a buffer and uploads to S3
 * @param {string} base64String - Raw base64 data (with or without prefix)
 * @param {string} key - S3 object key
 * @returns {Promise<string>} - Public URL
 */
export async function uploadBase64ToS3(base64String, key) {
    try {
        // Remove data URI prefix if present
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer;
        let contentType = 'image/jpeg';

        if (matches && matches.length === 3) {
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Assume it's raw base64
            buffer = Buffer.from(base64String, 'base64');
        }

        return await uploadToS3(buffer, key, contentType);
    } catch (error) {
        console.error("S3 Base64 Upload Error:", error);
        throw error;
    }
}

/**
 * Deletes an object from S3
 * @param {string} key - S3 object key
 */
export async function deleteFromS3(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
        });
        await s3Client.send(command);
    } catch (error) {
        console.error("S3 Delete Error:", error);
        throw error;
    }
}
