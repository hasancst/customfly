const { PrismaClient } = require('@prisma/client');
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const prisma = new PrismaClient();

const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
});

async function uploadBase64(base64String, key) {
    try {
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer;
        let contentType = 'image/jpeg';

        if (matches && matches.length === 3) {
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Check if it looks like base64
            if (base64String.length > 100 && !base64String.includes(' ') && !base64String.startsWith('http')) {
                buffer = Buffer.from(base64String, 'base64');
            } else {
                return null; // Not base64
            }
        }

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                ACL: 'public-read',
            },
        });

        await upload.done();
        return `${process.env.S3_PUBLIC_URL}/${key}`;
    } catch (e) {
        console.error(`Failed to upload to S3: ${key}`, e.message);
        return null;
    }
}

async function migrate() {
    console.log("Starting Migration to S3...");

    // 1. Migrate MerchantConfig baseImage and variantBaseImages
    const configs = await prisma.merchantConfig.findMany();
    for (const config of configs) {
        let updated = false;
        let updates = {};

        // baseImage
        if (config.baseImage && config.baseImage.startsWith('data:image')) {
            console.log(`Migrating MerchantConfig baseImage for shop ${config.shop}`);
            const key = `base-images/${config.shop}/${config.shopifyProductId}-${Date.now()}.jpg`;
            const url = await uploadBase64(config.baseImage, key);
            if (url) {
                updates.baseImage = url;
                updated = true;
            }
        }

        // variantBaseImages
        if (config.variantBaseImages) {
            let vbi = config.variantBaseImages;
            let vbiUpdated = false;
            for (const vid in vbi) {
                const val = vbi[vid];
                let base64 = typeof val === 'string' ? val : (val.url || val.default?.url);

                if (base64 && (base64.startsWith('data:image') || (base64.length > 500 && !base64.startsWith('http')))) {
                    console.log(`Migrating variant image ${vid} for shop ${config.shop}`);
                    const key = `variant-images/${config.shop}/${config.shopifyProductId}/${vid}-${Date.now()}.jpg`;
                    const url = await uploadBase64(base64, key);
                    if (url) {
                        if (typeof val === 'string') {
                            vbi[vid] = url;
                        } else if (val.url) {
                            val.url = url;
                        } else if (val.default?.url) {
                            val.default.url = url;
                        }
                        vbiUpdated = true;
                    }
                }
            }
            if (vbiUpdated) {
                updates.variantBaseImages = vbi;
                updated = true;
            }
        }

        if (updated) {
            await prisma.merchantConfig.update({
                where: { id: config.id },
                data: updates
            });
            console.log(`Updated MerchantConfig for config ID ${config.id}`);
        }
    }

    // 2. Migrate User Assets
    const assets = await prisma.asset.findMany({
        where: {
            OR: [
                { value: { startsWith: 'data:image' } },
                { value: { startsWith: 'data:application/octet-stream' } },
                { value: { contains: '|data:' } } // Font format: FontName|data:...
            ]
        }
    });

    for (const asset of assets) {
        console.log(`Migrating Asset ${asset.id} (${asset.type}) for shop ${asset.shop}`);

        // Check if this is a font asset with multiple fonts (FontName|data:...)
        if (asset.type === 'font' && asset.value.includes('|data:')) {
            const lines = asset.value.split('\n');
            const migratedLines = [];

            for (const line of lines) {
                if (line.includes('|data:')) {
                    const [fontName, base64Data] = line.split('|');
                    if (fontName && base64Data && base64Data.startsWith('data:')) {
                        console.log(`  Migrating font: ${fontName.trim()}`);
                        const sanitizedName = fontName.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
                        const extension = base64Data.includes('woff2') ? 'woff2' :
                            base64Data.includes('woff') ? 'woff' :
                                base64Data.includes('ttf') ? 'ttf' : 'otf';
                        const key = `fonts/${asset.shop}/${sanitizedName}-${Date.now()}.${extension}`;
                        const url = await uploadBase64(base64Data, key);
                        if (url) {
                            migratedLines.push(`${fontName.trim()}|${url}`);
                        } else {
                            migratedLines.push(line); // Keep original if upload fails
                        }
                    } else {
                        migratedLines.push(line);
                    }
                } else {
                    migratedLines.push(line);
                }
            }

            if (migratedLines.length > 0) {
                await prisma.asset.update({
                    where: { id: asset.id },
                    data: { value: migratedLines.join('\n') }
                });
                console.log(`Updated Font Asset ${asset.id}`);
            }
        } else if (asset.value.startsWith('data:')) {
            // Regular asset (image, etc.)
            const extension = asset.value.includes('png') ? 'png' : 'jpg';
            const key = `assets/${asset.shop}/${asset.type}/${asset.id}-${Date.now()}.${extension}`;
            const url = await uploadBase64(asset.value, key);
            if (url) {
                await prisma.asset.update({
                    where: { id: asset.id },
                    data: { value: url }
                });
                console.log(`Updated Asset ${asset.id}`);
            }
        }
    }

    // 3. Migrate SavedDesigns (only if they have base64 in designJson elements)
    // NOTE: This could be very large, so we iterate carefully
    const designs = await prisma.savedDesign.findMany();
    for (const design of designs) {
        let json = typeof design.designJson === 'string' ? JSON.parse(design.designJson) : design.designJson;
        if (!json) continue;

        let designUpdated = false;

        // Check for previewUrl first
        if (design.previewUrl && design.previewUrl.startsWith('data:image')) {
            console.log(`Migrating Preview for Design ${design.id}`);
            const key = `previews/${design.shop}/${design.id}-${Date.now()}.jpg`;
            const url = await uploadBase64(design.previewUrl, key);
            if (url) {
                await prisma.savedDesign.update({
                    where: { id: design.id },
                    data: { previewUrl: url }
                });
            }
        }

        // Check elements in pages
        if (Array.isArray(json)) {
            for (const page of json) {
                if (page.elements && Array.isArray(page.elements)) {
                    for (const el of page.elements) {
                        if (el.src && (el.src.startsWith('data:image') || (el.src.length > 500 && !el.src.startsWith('http')))) {
                            console.log(`Migrating design element ${el.id} for design ${design.id}`);
                            const key = `design-elements/${design.shop}/${design.id}/${el.id}-${Date.now()}.jpg`;
                            const url = await uploadBase64(el.src, key);
                            if (url) {
                                el.src = url;
                                designUpdated = true;
                            }
                        }
                    }
                }
            }
        }

        if (designUpdated) {
            await prisma.savedDesign.update({
                where: { id: design.id },
                data: { designJson: json }
            });
            console.log(`Updated SavedDesign ${design.id}`);
        }
    }

    console.log("Migration Completed!");
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration Failed:", err);
    process.exit(1);
});
