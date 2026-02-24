import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Seed Assets Service
 * Copies default assets from master shop (uploadfly-lab) to new shops
 */

const MASTER_SHOP = 'uploadfly-lab.myshopify.com';

/**
 * Copy all assets from master shop to target shop
 * @param {string} targetShop - Shop domain to copy assets to
 * @returns {Promise<{success: boolean, copiedCount: number, assets: Array}>}
 */
export async function seedAssetsForShop(targetShop) {
    try {
        logger.info(`[SeedAssets] Starting asset seeding for shop: ${targetShop}`);

        // Check if shop already has assets
        const existingAssets = await prisma.asset.count({
            where: { shop: targetShop }
        });

        if (existingAssets > 0) {
            logger.info(`[SeedAssets] Shop ${targetShop} already has ${existingAssets} assets, skipping seed`);
            return {
                success: true,
                copiedCount: 0,
                skipped: true,
                message: 'Shop already has assets'
            };
        }

        // Get all assets from master shop
        const masterAssets = await prisma.asset.findMany({
            where: { 
                shop: MASTER_SHOP,
                // Copy all Customfly assets (starter templates)
                name: {
                    startsWith: 'Customfly'
                }
            }
        });

        if (masterAssets.length === 0) {
            logger.warn(`[SeedAssets] No master assets found in ${MASTER_SHOP}`);
            return {
                success: true,
                copiedCount: 0,
                message: 'No master assets to copy'
            };
        }

        logger.info(`[SeedAssets] Found ${masterAssets.length} master assets to copy`);

        // Copy assets to target shop
        const copiedAssets = [];
        for (const masterAsset of masterAssets) {
            const { id, createdAt, updatedAt, shop, ...assetData } = masterAsset;
            
            const newAsset = await prisma.asset.create({
                data: {
                    ...assetData,
                    shop: targetShop,
                    // Mark as default so it can be identified as seeded
                    isDefault: true
                }
            });

            copiedAssets.push(newAsset);
            logger.info(`[SeedAssets] Copied asset: ${newAsset.type} - ${newAsset.name}`);
        }

        logger.info(`[SeedAssets] Successfully copied ${copiedAssets.length} assets to ${targetShop}`);

        return {
            success: true,
            copiedCount: copiedAssets.length,
            assets: copiedAssets.map(a => ({
                id: a.id,
                type: a.type,
                name: a.name
            }))
        };

    } catch (error) {
        logger.error(`[SeedAssets] Error seeding assets for ${targetShop}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get summary of master assets available for seeding
 * @returns {Promise<Object>}
 */
export async function getMasterAssetsSummary() {
    try {
        const masterAssets = await prisma.asset.findMany({
            where: { 
                shop: MASTER_SHOP,
                name: {
                    startsWith: 'Customfly'
                }
            },
            select: {
                id: true,
                type: true,
                name: true,
                label: true,
                isDefault: true
            }
        });

        const summary = {
            total: masterAssets.length,
            byType: {
                font: masterAssets.filter(a => a.type === 'font').length,
                color: masterAssets.filter(a => a.type === 'color').length,
                gallery: masterAssets.filter(a => a.type === 'gallery').length,
                shape: masterAssets.filter(a => a.type === 'shape').length,
                option: masterAssets.filter(a => a.type === 'option').length
            },
            assets: masterAssets
        };

        return summary;

    } catch (error) {
        logger.error('[SeedAssets] Error getting master assets summary:', error);
        throw error;
    }
}

/**
 * Check if shop needs asset seeding
 * @param {string} shop - Shop domain
 * @returns {Promise<boolean>}
 */
export async function shopNeedsSeeding(shop) {
    try {
        const assetCount = await prisma.asset.count({
            where: { shop }
        });

        return assetCount === 0;

    } catch (error) {
        logger.error(`[SeedAssets] Error checking if shop needs seeding:`, error);
        return false;
    }
}

export default {
    seedAssetsForShop,
    getMasterAssetsSummary,
    shopNeedsSeeding,
    MASTER_SHOP
};
