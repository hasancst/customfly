import express from 'express';
import { seedAssetsForShop, getMasterAssetsSummary, shopNeedsSeeding } from '../services/seedAssets.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/seed/assets
 * Manually trigger asset seeding for current shop
 */
router.post('/assets', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        
        logger.info(`[SeedRoute] Manual seed request from shop: ${shop}`);

        const result = await seedAssetsForShop(shop);

        if (result.success) {
            res.json({
                success: true,
                message: result.skipped 
                    ? 'Shop already has assets' 
                    : `Successfully copied ${result.copiedCount} assets`,
                ...result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        logger.error('[SeedRoute] Error in manual seed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/seed/status
 * Check if shop needs seeding
 */
router.get('/status', async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        
        const needsSeeding = await shopNeedsSeeding(shop);
        const summary = await getMasterAssetsSummary();

        res.json({
            shop,
            needsSeeding,
            masterAssets: summary
        });

    } catch (error) {
        logger.error('[SeedRoute] Error checking seed status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/seed/master-assets
 * Get list of master assets that will be copied
 */
router.get('/master-assets', async (req, res) => {
    try {
        const summary = await getMasterAssetsSummary();
        res.json(summary);

    } catch (error) {
        logger.error('[SeedRoute] Error getting master assets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
