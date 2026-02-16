import prisma from '../../../config/database.js';
import cache from '../../../config/cache.js';

/**
 * Executes configuration changes suggested by AI.
 * Strictly scoped to the provided shopId for safety.
 */
class ConfigExecutor {

    /**
     * Main entry point to apply changes to MerchantConfig.
     */
    async applyChanges(shopId, productId, changes) {
        console.log(`[AI Executor] Applying changes for shop ${shopId}, product ${productId}`);

        // Whitelist field yang boleh diubah oleh AI untuk keamanan
        const allowedFields = [
            'paperSize', 'unit', 'customPaperDimensions',
            'buttonText', 'headerTitle', 'designerLayout',
            'showRulers', 'showSafeArea', 'safeAreaPadding',
            'printArea', 'views'
        ];

        const cleanData = {};
        Object.keys(changes).forEach(key => {
            if (allowedFields.includes(key)) {
                cleanData[key] = changes[key];
            }
        });

        if (Object.keys(cleanData).length === 0) {
            throw new Error("No valid configuration fields provided for update.");
        }

        // Fetch current state for rollback purposes
        const currentState = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId || 'GLOBAL')
                }
            }
        });

        const previousState = {};
        if (currentState) {
            Object.keys(cleanData).forEach(key => {
                previousState[key] = currentState[key];
            });
        }

        // Update database
        const result = await prisma.merchantConfig.upsert({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId || 'GLOBAL')
                }
            },
            update: cleanData,
            create: {
                shop: shopId,
                shopifyProductId: String(productId || 'GLOBAL'),
                printArea: {}, // Mandatory default
                ...cleanData
            }
        });

        // Clear cache
        cache.del(`product_${shopId}_${productId}`);
        cache.del(`pub_prod_${shopId}_${productId}`);

        return { result, previousState };
    }
}

export default new ConfigExecutor();
