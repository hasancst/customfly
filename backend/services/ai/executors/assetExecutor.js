import prisma from '../../../config/database.js';
import logger from '../../../config/logger.js';
import cache from '../../../config/cache.js';
import { downloadAndUploadMultipleImages } from '../../../utils/imageDownloader.js';

/**
 * Asset Executor
 * Handles AI actions for asset management (fonts, colors, gallery, shapes, options)
 */
class AssetExecutor {
    /**
     * Create a new asset (font group, color palette, gallery, shape, option)
     */
    async createAsset(shop, assetData) {
        logger.info('[Asset Executor] Creating asset', { 
            shop, 
            type: assetData.type, 
            name: assetData.name,
            valueLength: assetData.value?.length 
        });

        try {
            // Validate asset data
            if (!assetData.type || !assetData.name || !assetData.value) {
                throw new Error('Missing required fields: type, name, value');
            }
            
            // Log value for debugging (truncate if too long)
            const valuePreview = assetData.value.length > 200 
                ? assetData.value.substring(0, 200) + '...' 
                : assetData.value;
            logger.info('[Asset Executor] Asset value', { 
                shop, 
                type: assetData.type,
                valuePreview,
                fullLength: assetData.value.length
            });

            // Create asset
            const asset = await prisma.asset.create({
                data: {
                    shop,
                    type: assetData.type,
                    name: assetData.name,
                    value: assetData.value,
                    label: assetData.label || null,
                    config: assetData.config || {},
                    isDefault: assetData.isDefault || false
                }
            });

            logger.info('[Asset Executor] Asset created', { 
                shop, 
                assetId: asset.id, 
                type: asset.type,
                savedValueLength: asset.value.length
            });

            // Clear cache so frontend sees the new asset immediately
            cache.del(`assets_${shop}_all`);
            cache.del(`assets_${shop}_${assetData.type}`);

            return {
                success: true,
                result: {
                    message: `Created ${assetData.type} "${assetData.name}"`,
                    assetId: asset.id,
                    asset
                },
                previousState: null // No previous state for new asset
            };
        } catch (error) {
            logger.error('[Asset Executor] Failed to create asset', { shop, error: error.message });
            throw error;
        }
    }

    /**
     * Update an existing asset
     */
    async updateAsset(shop, assetId, updates) {
        logger.info('[Asset Executor] Updating asset', { shop, assetId, updates: Object.keys(updates) });

        try {
            // Get current asset for rollback
            let currentAsset = await prisma.asset.findFirst({
                where: { id: assetId, shop }
            });

            if (!currentAsset) {
                // Try to find by name
                currentAsset = await prisma.asset.findFirst({
                    where: { name: assetId, shop }
                });
                
                if (!currentAsset) {
                    throw new Error(`Asset not found: ${assetId}`);
                }
                
                // Use the found asset's ID
                assetId = currentAsset.id;
            }
            
            // Handle special case: colors array for color palette
            if (updates.colors && Array.isArray(updates.colors)) {
                logger.info('[Asset Executor] Converting colors array to value string', { 
                    shop, 
                    colorsCount: updates.colors.length 
                });
                
                updates.value = updates.colors
                    .map(c => `${c.name}|${c.hex}`)
                    .join(', ');
                
                delete updates.colors;
                
                logger.info('[Asset Executor] Converted value', { 
                    shop, 
                    valueLength: updates.value.length 
                });
            }

            // Update asset
            const updatedAsset = await prisma.asset.update({
                where: { id: assetId },
                data: {
                    ...updates,
                    updatedAt: new Date()
                }
            });

            logger.info('[Asset Executor] Asset updated', { shop, assetId });

            // Clear cache
            cache.del(`assets_${shop}_all`);
            cache.del(`assets_${shop}_${currentAsset.type}`);

            return {
                success: true,
                result: {
                    message: `Updated ${currentAsset.type} "${currentAsset.name}"`,
                    asset: updatedAsset
                },
                previousState: {
                    assetId,
                    ...currentAsset
                }
            };
        } catch (error) {
            logger.error('[Asset Executor] Failed to update asset', { shop, assetId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete an asset
     */
    async deleteAsset(shop, assetId) {
        logger.info('[Asset Executor] Deleting asset', { shop, assetId });

        try {
            // Find asset by ID or name
            let asset;
            
            // Try to find by ID first (UUID format)
            if (assetId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                asset = await prisma.asset.findFirst({
                    where: { id: assetId, shop }
                });
            }
            
            // If not found by ID, try by exact name
            if (!asset) {
                asset = await prisma.asset.findFirst({
                    where: { name: assetId, shop }
                });
            }

            // If still not found, try fuzzy matching
            if (!asset) {
                logger.info('[Asset Executor] Exact match not found, trying fuzzy match', { shop, assetId });
                
                const allAssets = await prisma.asset.findMany({
                    where: { shop }
                });
                
                // Calculate similarity scores for all assets
                const matches = allAssets.map(a => {
                    const nameLower = a.name.toLowerCase();
                    const searchLower = assetId.toLowerCase();
                    
                    let score = 0;
                    
                    // Exact match (case-insensitive)
                    if (nameLower === searchLower) score = 1000;
                    
                    // Asset name contains search term
                    else if (nameLower.includes(searchLower)) score = 500;
                    
                    // Search term contains asset name
                    else if (searchLower.includes(nameLower)) score = 400;
                    
                    // Word overlap
                    else {
                        const nameWords = nameLower.split(/\s+/);
                        const searchWords = searchLower.split(/\s+/);
                        const matchingWords = nameWords.filter(w => searchWords.includes(w)).length;
                        score = matchingWords * 100;
                    }
                    
                    return { asset: a, score };
                }).filter(m => m.score > 0);
                
                // Sort by score and take best match
                matches.sort((a, b) => b.score - a.score);
                
                if (matches.length > 0) {
                    asset = matches[0].asset;
                    logger.info('[Asset Executor] Found via fuzzy match', { 
                        shop, 
                        searchTerm: assetId, 
                        foundName: asset.name,
                        score: matches[0].score
                    });
                }
            }

            if (!asset) {
                const availableAssets = await prisma.asset.findMany({
                    where: { shop },
                    select: { name: true, type: true }
                });
                
                logger.error('[Asset Executor] Asset not found', { 
                    shop, 
                    assetId,
                    availableAssets: availableAssets.map(a => a.name)
                });
                
                throw new Error(`Asset not found: ${assetId}. Available: ${availableAssets.map(a => a.name).join(', ')}`);
            }

            // Delete asset
            await prisma.asset.delete({
                where: { id: asset.id }
            });

            logger.info('[Asset Executor] Asset deleted', { shop, assetId: asset.id, name: asset.name });

            // Clear cache
            cache.del(`assets_${shop}_all`);
            cache.del(`assets_${shop}_${asset.type}`);

            return {
                success: true,
                result: {
                    message: `Deleted ${asset.type} "${asset.name}"`
                },
                previousState: asset // Store for rollback
            };
        } catch (error) {
            logger.error('[Asset Executor] Failed to delete asset', { shop, assetId, error: error.message });
            throw error;
        }
    }

    /**
     * Create color palette asset
     */
    async createColorPalette(shop, paletteData) {
        logger.info('[Asset Executor] Creating color palette', { 
            shop, 
            name: paletteData.name,
            colorsCount: paletteData.colors?.length 
        });

        // Format colors as "Name|#HEX, Name|#HEX, ..."
        const colorValue = paletteData.colors
            .map(c => `${c.name}|${c.hex}`)
            .join(', ');
        
        logger.info('[Asset Executor] Formatted color value', { 
            shop, 
            colorValue: colorValue.substring(0, 200) + '...',
            valueLength: colorValue.length
        });

        return this.createAsset(shop, {
            type: 'color',
            name: paletteData.name,
            value: colorValue,
            label: paletteData.label || paletteData.category || null,
            config: {
                group: paletteData.category || 'Custom',
                category: paletteData.category || 'Custom',
                enablePricing: paletteData.enablePricing || false,
                colorCount: paletteData.colors.length,
                colors: paletteData.colors
            }
        });
    }

    /**
     * Create font group asset
     */
    async createFontGroup(shop, fontData) {
        logger.info('[Asset Executor] Creating font group', { shop, name: fontData.name });

        // For Google Fonts: comma-separated list
        // For uploaded fonts: URL|Name format
        let fontValue;
        if (fontData.fontType === 'google') {
            fontValue = fontData.fonts.join(', ');
        } else {
            fontValue = fontData.fonts
                .map(f => `${f.url}|${f.name}`)
                .join('\n');
        }

        return this.createAsset(shop, {
            type: 'font',
            name: fontData.name,
            value: fontValue,
            label: fontData.label || fontData.category || null,
            config: {
                group: fontData.category || 'Custom',
                category: fontData.category || 'Custom',
                fontType: fontData.fontType || 'google',
                googleConfig: fontData.fontType === 'google' ? 'specific' : undefined,
                specificFonts: fontData.fontType === 'google' ? fontValue : undefined,
                fontCount: fontData.fonts.length,
                fonts: fontData.fontType === 'google' ? fontData.fonts : fontData.fonts.map(f => f.name)
            }
        });
    }

    /**
     * Create gallery with automatic image download from URLs
     * @param {string} shop - Shop domain
     * @param {Object} galleryData - Gallery data with images array
     * @param {string} galleryData.name - Gallery name
     * @param {Array<{name: string, url: string}>} galleryData.images - Array of images with URLs
     * @returns {Promise<Object>} - Result with created asset
     */
    async createGallery(shop, galleryData) {
        logger.info('[Asset Executor] Creating gallery with image download', { 
            shop, 
            name: galleryData.name,
            imageCount: galleryData.images?.length || 0
        });

        try {
            // Download and upload images to S3
            const uploadedImages = await downloadAndUploadMultipleImages(
                galleryData.images,
                'gallery'
            );

            if (uploadedImages.length === 0) {
                throw new Error('Failed to download any images');
            }

            logger.info('[Asset Executor] Images uploaded to S3', { 
                shop, 
                uploadedCount: uploadedImages.length 
            });

            // Create value string in format: "Name|URL, Name|URL, ..."
            const galleryValue = uploadedImages
                .map(img => `${img.name}|${img.url}`)
                .join(', ');

            // Create gallery asset
            return this.createAsset(shop, {
                type: 'gallery',
                name: galleryData.name,
                value: galleryValue,
                label: galleryData.label || null,
                config: {
                    group: galleryData.category || 'General',
                    category: galleryData.category || 'General',
                    imageCount: uploadedImages.length,
                    source: 'ai-downloaded'
                }
            });
        } catch (error) {
            logger.error('[Asset Executor] Failed to create gallery', { 
                shop, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Rollback asset creation (delete it)
     */
    async rollbackCreate(shop, assetId) {
        logger.info('[Asset Executor] Rolling back asset creation', { shop, assetId });
        return this.deleteAsset(shop, assetId);
    }

    /**
     * Rollback asset update (restore previous state)
     */
    async rollbackUpdate(shop, previousState) {
        logger.info('[Asset Executor] Rolling back asset update', { shop, assetId: previousState.assetId });

        const { assetId, ...restoreData } = previousState;
        delete restoreData.id;
        delete restoreData.createdAt;
        delete restoreData.updatedAt;

        return this.updateAsset(shop, assetId, restoreData);
    }

    /**
     * Rollback asset deletion (recreate it)
     */
    async rollbackDelete(shop, previousState) {
        logger.info('[Asset Executor] Rolling back asset deletion', { shop });

        const { id, createdAt, updatedAt, ...assetData } = previousState;
        return this.createAsset(shop, assetData);
    }
}

export default new AssetExecutor();
