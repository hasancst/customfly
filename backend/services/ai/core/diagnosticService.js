import prisma from '../../../config/database.js';

/**
 * Service to perform deep diagnostics on product configurations and assets.
 * Part of Phase 3: Troubleshooting Assistant.
 */
class DiagnosticService {

    /**
     * Performs a full health check for a product's customization setup.
     */
    async performFullDiagnostic(shopId, productId) {
        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            }
        });

        const issues = [];

        if (!config) {
            issues.push({
                code: 'MISSING_CONFIG',
                severity: 'critical',
                message: 'Product customizer is not configured for this product.',
                fixable: true
            });
            return { status: 'critical', issues };
        }

        // 1. Check Print Area
        if (!config.printArea || Object.keys(config.printArea).length === 0) {
            issues.push({
                code: 'EMPTY_PRINT_AREA',
                severity: 'high',
                message: 'No print area or layers defined. Customers wont see anything to customize.',
                fixable: true
            });
        }

        // 2. Check for broken assets (placeholder logic)
        // In a real scenario, we would verify asset URLs respond with 200

        // 3. Check for specific tools config
        const printArea = typeof config.printArea === 'string' ? JSON.parse(config.printArea) : config.printArea;
        if (printArea && printArea.layers) {
            const layers = printArea.layers;
            const hasText = layers.some(l => l.type === 'text');
            const hasImage = layers.some(l => l.type === 'image');

            if (!hasText && !hasImage) {
                issues.push({
                    code: 'NO_INTERACTIVE_LAYERS',
                    severity: 'medium',
                    message: 'No interactive layers found. Consider adding text or image upload options.',
                    fixable: true
                });
            }
        }

        return {
            status: issues.some(i => i.severity === 'critical' || i.severity === 'high') ? 'error' : 'warning',
            issues
        };
    }
}

export default new DiagnosticService();
