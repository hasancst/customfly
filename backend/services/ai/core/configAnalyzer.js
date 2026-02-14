import prisma from '../../../config/database.js';

/**
 * Service to analyze existing configurations and detect optimization opportunities.
 * Part of Phase 2: Configuration Optimization.
 */
class ConfigAnalyzer {

    /**
     * Analyzes a specific product's configuration for common UX and performance issues.
     */
    async analyzeConfig(shopId, productId) {
        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            }
        });

        if (!config) return { status: 'NO_CONFIG', suggestions: [] };

        const suggestions = [];

        // 1. Check for Canvas Size (Too small or default 1000x1000 might not be ideal)
        if (config.paperSize === 'Default' || !config.customPaperDimensions) {
            suggestions.push({
                type: 'UX_IMPROVEMENT',
                priority: 'medium',
                title: 'Optimize Canvas Size',
                description: 'Using the default 1000x1000px canvas might result in lower print quality. Consider matching your physical product dimensions.',
                action: 'UPDATE_CONFIG',
                payload: { paperSize: 'Custom', unit: 'cm' }
            });
        }

        // 2. Check for missing SafeArea
        if (!config.showSafeArea || !config.safeAreaPadding) {
            suggestions.push({
                type: 'QUALITY_CONTROL',
                priority: 'high',
                title: 'Add Safe Area',
                description: 'Safe areas help customers stay within printable boundaries, reducing printing errors.',
                action: 'UPDATE_CONFIG',
                payload: { showSafeArea: true, safeAreaPadding: 10 }
            });
        }

        // 3. Check for unused/default elements in printArea
        if (config.printArea && config.printArea.layers) {
            const layers = config.printArea.layers;
            const unusedLayers = layers.filter(layer => {
                if (layer.type === 'text' && layer.text === 'Your Text Here') return true;
                if (layer.type === 'image' && !layer.url) return true;
                if (layer.type === 'monogram' && layer.text === 'ABC') return true;
                return false;
            });

            if (unusedLayers.length > 0) {
                suggestions.push({
                    type: 'CLEANUP',
                    priority: 'low',
                    title: 'Remove Default Elements',
                    description: `You have ${unusedLayers.length} default elements that haven't been customized. Removing them keeps the designer clean.`,
                    action: 'REMOVE_UNUSED',
                    payload: {
                        productId,
                        layerIds: unusedLayers.map(l => l.id)
                    }
                });
            }
        }

        return {
            status: suggestions.length > 0 ? 'NEEDS_OPTIMIZATION' : 'HEALTHY',
            suggestions
        };
    }
}

export default new ConfigAnalyzer();
