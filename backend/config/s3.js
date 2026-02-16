import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});

export const S3_BUCKET = process.env.S3_BUCKET;
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

/**
 * Transforms an S3 URL to a CDN URL if CDN is enabled.
 * @param {string} s3Url - The original S3 URL.
 * @returns {string} - The transformed CDN URL or original S3 URL.
 */
export const getCDNUrl = (s3Url) => {
    const isEnabled = process.env.ENABLE_CDN === 'true';
    const cdnUrl = process.env.CDN_URL;
    const publicUrl = process.env.S3_PUBLIC_URL || S3_PUBLIC_URL;

    if (!s3Url || typeof s3Url !== 'string') return s3Url;

    // DEBUG: Log transformation
    const original = s3Url;

    if (isEnabled && cdnUrl) {
        const cdnBase = cdnUrl.replace(/\/$/, "");

        if (publicUrl) {
            const cleanPublicUrl = publicUrl.replace(/\/$/, "");
            if (s3Url.includes(cleanPublicUrl)) {
                const result = s3Url.replace(cleanPublicUrl, cdnBase);
                console.log('[getCDNUrl] Transformed:', { original, result, cleanPublicUrl, cdnBase });
                return result;
            }
        }

        // Fallback for Linode endpoint if publicUrl didn't match
        if (s3Url.includes('linodeobjects.com')) {
            const regex = /https:\/\/[^/]+\.linodeobjects\.com/;
            const result = s3Url.replace(regex, cdnBase);
            console.log('[getCDNUrl] Linode fallback:', { original, result, cdnBase });
            return result;
        }
    }

    if (original.includes('linodeobjects.com')) {
        console.log('[getCDNUrl] No transform (CDN disabled):', { original, isEnabled, cdnUrl });
    }

    return s3Url;
};

/**
 * Transforms an asset value string which may contain multiple URLs
 * Format: "Name|URL\nName2|URL2" or "URL"
 */
export const transformAssetValue = (value) => {
    if (!value || typeof value !== 'string') return value;

    // Check if it's a multiline/composite value
    if (value.includes('|')) {
        // Handle both newline-separated and comma-separated formats
        let lines;
        if (value.includes('\n')) {
            lines = value.split('\n');
        } else if (value.includes(',') && !value.includes('base64,')) {
            // Comma-separated format (for color palettes)
            lines = value.split(',').map(s => s.trim());
        } else {
            lines = [value];
        }
        
        const transformed = lines.map(line => {
            if (line.includes('|')) {
                const parts = line.split('|');
                const name = parts[0];
                const url = parts.slice(1).join('|'); // Handle cases where | appears in URL
                return `${name}|${getCDNUrl(url)}`;
            }
            return getCDNUrl(line);
        });
        
        // Return in the same format as input
        if (value.includes('\n')) {
            return transformed.join('\n');
        } else if (value.includes(',') && !value.includes('base64,')) {
            return transformed.join(', ');
        } else {
            return transformed[0];
        }
    }

    return getCDNUrl(value);
};

/**
 * Recursively scans an object/array and applies getCDNUrl to string values.
 */
export const transformDesignUrls = (data) => {
    if (!data) return data;
    if (typeof data === 'string') return getCDNUrl(data);
    if (Array.isArray(data)) return data.map(transformDesignUrls);
    if (typeof data === 'object' && data.constructor === Object) {
        const transformed = {};
        for (const key in data) {
            transformed[key] = transformDesignUrls(data[key]);
        }
        return transformed;
    }
    return data;
};

export default s3Client;
