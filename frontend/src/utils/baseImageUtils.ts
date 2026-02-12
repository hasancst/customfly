/**
 * Base Image Utilities
 * Handles normalization and processing of base image data across different formats
 */

export type BaseImageSource = 'manual' | 'shopify_product' | 'shopify_variant' | 'system';

export interface BaseImageData {
    source: BaseImageSource;
    url: string;
    metadata?: {
        imageId?: string;      // For Shopify product images
        variantId?: string;    // For Shopify variant images
        uploadedAt?: string;   // For manual uploads
    };
}

export type BaseImageValue = BaseImageData | string | undefined | null;

/**
 * Normalizes base image data to the new object format
 * Supports both legacy string format and new object format
 */
export function normalizeBaseImage(img: BaseImageValue): BaseImageData | null {
    if (!img) return null;

    // New format (object with source)
    if (typeof img === 'object' && 'source' in img && 'url' in img) {
        return img as BaseImageData;
    }

    // Legacy format (plain string URL)
    if (typeof img === 'string' && img !== 'none') {
        return {
            source: 'manual',
            url: img,
            metadata: {}
        };
    }

    return null;
}

/**
 * Extracts URL from base image data (handles both formats)
 */
export function getBaseImageUrl(img: BaseImageValue): string | undefined {
    const normalized = normalizeBaseImage(img);
    return normalized?.url;
}

/**
 * Checks if base image is from a specific source
 */
export function isBaseImageSource(img: BaseImageValue, source: BaseImageSource): boolean {
    const normalized = normalizeBaseImage(img);
    return normalized?.source === source;
}

/**
 * Creates a base image data object
 */
export function createBaseImageData(
    source: BaseImageSource,
    url: string,
    metadata?: BaseImageData['metadata']
): BaseImageData {
    return {
        source,
        url,
        metadata: metadata || {}
    };
}
