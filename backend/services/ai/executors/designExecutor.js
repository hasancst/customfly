import prisma from '../../../config/database.js';
import logger from '../../../config/logger.js';
import cache from '../../../config/cache.js';

/**
 * Executes design-level changes (adding/removing sides/pages).
 */
class DesignExecutor {

    /**
     * Adds a new side/page to the saved design.
     */
    async addSide(shopId, productId, sideData) {
        console.log('[Design Executor] addSide called', { shopId, productId, sideData });
        
        // 1. Find or create saved design
        let design = await prisma.savedDesign.findFirst({
            where: {
                shop: shopId,
                shopifyProductId: String(productId),
                isTemplate: false
            },
            orderBy: { updatedAt: 'desc' }
        });

        let designJson;
        let previousState = null;

        if (!design) {
            // Create new design with first side
            console.log('[Design Executor] No design found, creating new one');
            
            // Get config to use as base for first side
            const config = await prisma.merchantConfig.findUnique({
                where: {
                    shop_shopifyProductId: {
                        shop: shopId,
                        shopifyProductId: String(productId)
                    }
                }
            });

            const firstSide = {
                id: 'default',
                name: 'Side 1',
                elements: config?.printArea?.layers || [],
                baseImage: config?.baseImage || '',
                baseImageScale: config?.baseImageScale || 100,
                baseImageAsMask: config?.baseImageAsMask || false,
                baseImageMaskInvert: config?.baseImageMaskInvert || false,
                baseImageProperties: config?.baseImageProperties || {
                    x: 0, y: 0, scale: 1, width: 1000, height: 1000
                },
                baseImageColorEnabled: config?.baseImageColorEnabled || false
            };

            designJson = [firstSide];
        } else {
            // Parse existing design
            designJson = typeof design.designJson === 'string' 
                ? JSON.parse(design.designJson) 
                : design.designJson;
            
            previousState = JSON.parse(JSON.stringify(designJson));
        }

        // 2. Create new side
        const newSide = {
            id: sideData.id || `side_${Date.now()}`,
            name: sideData.name || `Side ${designJson.length + 1}`,
            elements: sideData.elements || [],
            baseImage: sideData.baseImage || '',
            baseImageScale: sideData.baseImageScale || 100,
            baseImageAsMask: sideData.baseImageAsMask || false,
            baseImageMaskInvert: sideData.baseImageMaskInvert || false,
            baseImageProperties: sideData.baseImageProperties || {
                x: 0, y: 0, scale: 1, width: 1000, height: 1000
            },
            baseImageColorEnabled: sideData.baseImageColorEnabled || false
        };

        // 3. Add new side to array
        designJson.push(newSide);
        console.log('[Design Executor] New side added, total sides:', designJson.length);

        // 4. Update or create saved design
        let result;
        if (design) {
            result = await prisma.savedDesign.update({
                where: { id: design.id },
                data: {
                    designJson: designJson,
                    updatedAt: new Date()
                }
            });
        } else {
            result = await prisma.savedDesign.create({
                data: {
                    shop: shopId,
                    shopifyProductId: String(productId),
                    designJson: designJson,
                    name: `Design for Product ${productId}`,
                    status: 'draft',
                    isTemplate: false
                }
            });
        }

        logger.info('[Design Executor] Side added successfully', {
            shop: shopId,
            productId,
            sideName: newSide.name,
            totalSides: designJson.length
        });

        // Clear cache
        cache.del(`product_${shopId}_${productId}`);
        cache.del(`pub_prod_${shopId}_${productId}`);

        return { 
            result, 
            previousState: previousState ? { designJson: previousState } : null,
            newSide
        };
    }

    /**
     * Removes a side/page from the saved design.
     */
    async removeSide(shopId, productId, sideId) {
        console.log('[Design Executor] removeSide called', { shopId, productId, sideId });
        
        const design = await prisma.savedDesign.findFirst({
            where: {
                shop: shopId,
                shopifyProductId: String(productId),
                isTemplate: false
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!design) {
            throw new Error('Design not found');
        }

        let designJson = typeof design.designJson === 'string' 
            ? JSON.parse(design.designJson) 
            : design.designJson;
        
        const previousState = JSON.parse(JSON.stringify(designJson));

        // Don't allow removing the last side
        if (designJson.length <= 1) {
            throw new Error('Cannot remove the last side');
        }

        // Remove the side
        designJson = designJson.filter(side => side.id !== sideId);
        console.log('[Design Executor] Side removed, remaining sides:', designJson.length);

        const result = await prisma.savedDesign.update({
            where: { id: design.id },
            data: {
                designJson: designJson,
                updatedAt: new Date()
            }
        });

        logger.info('[Design Executor] Side removed successfully', {
            shop: shopId,
            productId,
            sideId,
            remainingSides: designJson.length
        });

        // Clear cache
        cache.del(`product_${shopId}_${productId}`);
        cache.del(`pub_prod_${shopId}_${productId}`);

        return { 
            result, 
            previousState: { designJson: previousState }
        };
    }
}

export default new DesignExecutor();
