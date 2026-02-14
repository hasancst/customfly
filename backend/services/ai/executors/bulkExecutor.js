import prisma from '../../../config/database.js';
import configExecutor from './configExecutor.js';

/**
 * Service to handle bulk configuration updates across multiple products.
 * Part of Phase 3: Bulk Operations.
 */
class BulkExecutor {

    /**
     * Applies the same configuration changes to a list of products.
     */
    async applyBulkChanges(shopId, productIds, changes) {
        console.log(`[Bulk Executor] Processing ${productIds.length} products for shop ${shopId}`);

        const results = {
            success: [],
            failed: []
        };

        for (const productId of productIds) {
            try {
                await configExecutor.applyChanges(shopId, productId, changes);
                results.success.push(productId);
            } catch (error) {
                console.error(`[Bulk Executor] Failed to update product ${productId}:`, error);
                results.failed.push({ productId, error: error.message });
            }
        }

        return results;
    }
}

export default new BulkExecutor();
