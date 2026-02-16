import prisma from '../../../config/database.js';
import logger from '../../../config/logger.js';

/**
 * Settings Executor
 * Handles AI actions for app settings and configurations
 */
class SettingsExecutor {
    /**
     * Update global settings (not product-specific)
     */
    async updateGlobalSettings(shop, settings) {
        logger.info('[Settings Executor] Updating global settings', { shop, keys: Object.keys(settings) });

        try {
            // For now, we'll store global settings in a special MerchantConfig with productId = 'GLOBAL'
            // This allows us to have shop-wide defaults
            
            let config = await prisma.merchantConfig.findFirst({
                where: { shop, shopifyProductId: 'GLOBAL' }
            });

            const previousState = config ? { ...config } : null;

            if (config) {
                // Update existing
                config = await prisma.merchantConfig.update({
                    where: { id: config.id },
                    data: {
                        ...settings,
                        updatedAt: new Date()
                    }
                });
            } else {
                // Create new
                config = await prisma.merchantConfig.create({
                    data: {
                        shop,
                        shopifyProductId: 'GLOBAL',
                        printArea: { elements: [] }, // Empty print area for global config
                        ...settings
                    }
                });
            }

            logger.info('[Settings Executor] Global settings updated', { shop });

            return {
                success: true,
                result: {
                    message: 'Global settings updated',
                    settings: config
                },
                previousState
            };
        } catch (error) {
            logger.error('[Settings Executor] Failed to update global settings', { shop, error: error.message });
            throw error;
        }
    }

    /**
     * Update product-specific settings
     */
    async updateProductSettings(shop, productId, settings) {
        logger.info('[Settings Executor] Updating product settings', { shop, productId });

        try {
            const config = await prisma.merchantConfig.findFirst({
                where: { shop, shopifyProductId: productId }
            });

            if (!config) {
                throw new Error(`Product configuration not found for ${productId}`);
            }

            const previousState = { ...config };

            const updatedConfig = await prisma.merchantConfig.update({
                where: { id: config.id },
                data: {
                    ...settings,
                    updatedAt: new Date()
                }
            });

            logger.info('[Settings Executor] Product settings updated', { shop, productId });

            return {
                success: true,
                result: {
                    message: `Settings updated for product ${productId}`,
                    config: updatedConfig
                },
                previousState
            };
        } catch (error) {
            logger.error('[Settings Executor] Failed to update product settings', { shop, productId, error: error.message });
            throw error;
        }
    }

    /**
     * Update designer UI settings
     */
    async updateDesignerSettings(shop, productId, designerSettings) {
        logger.info('[Settings Executor] Updating designer settings', { shop, productId });

        const settings = {};

        // Map designer settings to config fields
        if (designerSettings.layout) settings.designerLayout = designerSettings.layout;
        if (designerSettings.buttonText) settings.buttonText = designerSettings.buttonText;
        if (designerSettings.headerTitle) settings.headerTitle = designerSettings.headerTitle;
        if (designerSettings.showGrid !== undefined) settings.showGrid = designerSettings.showGrid;
        if (designerSettings.showRulers !== undefined) settings.showRulers = designerSettings.showRulers;
        if (designerSettings.showSafeArea !== undefined) settings.showSafeArea = designerSettings.showSafeArea;
        if (designerSettings.enabledTools) settings.enabledTools = designerSettings.enabledTools;
        if (designerSettings.enabledDownload !== undefined) settings.enabledDownload = designerSettings.enabledDownload;
        if (designerSettings.enabledReset !== undefined) settings.enabledReset = designerSettings.enabledReset;
        if (designerSettings.enabledUndoRedo !== undefined) settings.enabledUndoRedo = designerSettings.enabledUndoRedo;

        if (productId && productId !== 'GLOBAL') {
            return this.updateProductSettings(shop, productId, settings);
        } else {
            return this.updateGlobalSettings(shop, settings);
        }
    }

    /**
     * Update canvas settings
     */
    async updateCanvasSettings(shop, productId, canvasSettings) {
        logger.info('[Settings Executor] Updating canvas settings', { shop, productId });

        const settings = {};

        // Map canvas settings to config fields
        if (canvasSettings.paperSize) settings.paperSize = canvasSettings.paperSize;
        if (canvasSettings.customDimensions) settings.customPaperDimensions = canvasSettings.customDimensions;
        if (canvasSettings.unit) settings.unit = canvasSettings.unit;
        if (canvasSettings.safeAreaPadding !== undefined) settings.safeAreaPadding = canvasSettings.safeAreaPadding;
        if (canvasSettings.safeAreaRadius !== undefined) settings.safeAreaRadius = canvasSettings.safeAreaRadius;
        if (canvasSettings.safeAreaWidth !== undefined) settings.safeAreaWidth = canvasSettings.safeAreaWidth;
        if (canvasSettings.safeAreaHeight !== undefined) settings.safeAreaHeight = canvasSettings.safeAreaHeight;
        if (canvasSettings.safeAreaOffset) settings.safeAreaOffset = canvasSettings.safeAreaOffset;

        if (productId && productId !== 'GLOBAL') {
            return this.updateProductSettings(shop, productId, settings);
        } else {
            return this.updateGlobalSettings(shop, settings);
        }
    }

    /**
     * Rollback settings update
     */
    async rollbackSettings(shop, previousState) {
        logger.info('[Settings Executor] Rolling back settings', { shop });

        if (!previousState) {
            throw new Error('No previous state to rollback to');
        }

        const { id, createdAt, updatedAt, ...restoreData } = previousState;

        if (previousState.shopifyProductId === 'GLOBAL') {
            return this.updateGlobalSettings(shop, restoreData);
        } else {
            return this.updateProductSettings(shop, previousState.shopifyProductId, restoreData);
        }
    }
}

export default new SettingsExecutor();
