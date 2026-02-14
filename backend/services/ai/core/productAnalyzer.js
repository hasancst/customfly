import prisma from '../../../config/database.js';

/**
 * Service to analyze Shopify product data and suggest configurations.
 * Part of Phase 2: Core Features.
 */
class ProductAnalyzer {

    /**
     * Analyzes a product and determines its type and recommended tools.
     */
    async analyzeProduct(shopId, productId, shopifyData) {
        if (!shopifyData) return null;

        const title = (shopifyData.title || "").toLowerCase();
        const bodyHtml = (shopifyData.body_html || "").toLowerCase();
        const tags = (shopifyData.tags || "").toLowerCase();

        const analysis = {
            productType: "generic",
            confidence: 0.5,
            recommendations: []
        };

        // 1. Determine Product Type
        if (title.includes("t-shirt") || title.includes("kaos") || tags.includes("apparel")) {
            analysis.productType = "apparel";
            analysis.recommendations.push({
                type: "ADD_OPTION",
                label: "Custom Text",
                tool: "text",
                position: "center"
            });
        } else if (title.includes("mug") || title.includes("gelas")) {
            analysis.productType = "drinkware";
            analysis.recommendations.push({
                type: "ADD_OPTION",
                label: "Photo Upload",
                tool: "image",
                position: "wrap"
            });
        }

        return analysis;
    }

    /**
     * Identifies if a product is missing basic configuration.
     */
    async getDiagnostic(shopId, productId) {
        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            }
        });

        if (!config) return "MISSING_CONFIG";
        if (!config.paperSize) return "MISSING_CANVAS_DIMENSIONS";

        return "HEALTHY";
    }
}

export default new ProductAnalyzer();
