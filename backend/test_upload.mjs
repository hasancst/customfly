import { uploadBase64ToS3 } from './services/s3Service.js';
import fs from 'fs';

async function run() {
    const base64 = process.argv[2];
    if (!base64) {
        console.error("Missing base64 argument");
        process.exit(1);
    }
    try {
        const key = `debug/user_upload_${Date.now()}.jpg`;
        const url = await uploadBase64ToS3(base64, key);
        console.log("UPLOAD_SUCCESS:" + url);
    } catch (e) {
        console.error("UPLOAD_ERROR:" + e.message);
        process.exit(1);
    }
}
run();
