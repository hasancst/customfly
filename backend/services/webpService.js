import sharp from 'sharp';

/**
 * Converts image buffer to WebP format
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Conversion options
 * @param {number} options.quality - WebP quality (0-100), default 85
 * @returns {Promise<Buffer>} - WebP buffer
 */
export async function convertToWebP(buffer, options = {}) {
    try {
        const webpBuffer = await sharp(buffer)
            .webp({
                quality: options.quality || 85,
                effort: 4 // Balance between speed and compression (0-6)
            })
            .toBuffer();

        console.log(`[WebP] Converted image: ${buffer.length} bytes → ${webpBuffer.length} bytes (${Math.round((1 - webpBuffer.length / buffer.length) * 100)}% reduction)`);

        return webpBuffer;
    } catch (error) {
        console.error('[WebP] Conversion error:', error.message);
        throw error;
    }
}

/**
 * Checks if image should be converted to WebP
 * @param {string} contentType - Original content type
 * @param {Object} options - Request options
 * @returns {boolean}
 */
export function shouldConvertToWebP(contentType, options = {}) {
    // Never convert if explicitly disabled
    if (options.skipWebP === true) return false;

    // Only convert standard image formats (not GIF to preserve animations)
    const convertibleTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    return convertibleTypes.includes(contentType);
}

/**
 * Updates filename extension to .webp
 * @param {string} filename - Original filename
 * @returns {string} - Filename with .webp extension
 */
export function updateFilenameForWebP(filename) {
    return filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}
