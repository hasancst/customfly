import fetch from 'node-fetch';
import FormData from 'form-data';

const API_URL = 'http://localhost:3011/imcst_api/public/upload/image';

async function testLargeUpload() {
    console.log("Testing Large Upload to:", API_URL);

    // Create a 5MB dummy buffer
    const size = 5 * 1024 * 1024;
    const buffer = Buffer.alloc(size, 'a');

    const form = new FormData();
    form.append('image', buffer, { filename: 'large-test.png', contentType: 'image/png' });

    try {
        const response = await fetch(`${API_URL}?folder=stress_test`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const status = response.status;
        const text = await response.text();

        console.log(`Status: ${status}`);
        if (status !== 200) {
            console.error(`Response: ${text.substring(0, 500)}`); // Print first 500 chars
        } else {
            console.log("✅ SUCCESS: Large file uploaded.");
        }
    } catch (err) {
        console.error("❌ ERROR: Request failed", err);
    }
}

testLargeUpload();
