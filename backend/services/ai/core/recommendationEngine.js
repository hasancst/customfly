import prisma from '../../../config/database.js';

/**
 * Service to manage and store proactive AI recommendations.
 * Part of Phase 2: Recommendations System.
 */
class RecommendationEngine {

    /**
     * Generates and stores recommendations for a shop.
     */
    async createRecommendations(shopId, analyzerResults) {
        const recommendations = [];

        for (const suggestion of analyzerResults.suggestions) {
            // Check if this recommendation already exists to avoid duplicates
            const existing = await prisma.aIRecommendation.findFirst({
                where: {
                    shop: shopId,
                    title: suggestion.title,
                    status: 'new'
                }
            });

            if (!existing) {
                const created = await prisma.aIRecommendation.create({
                    data: {
                        shop: shopId,
                        category: suggestion.type,
                        priority: suggestion.priority,
                        title: suggestion.title,
                        description: suggestion.description,
                        actionable: true,
                        actions: suggestion.payload,
                        status: 'new'
                    }
                });
                recommendations.push(created);
            }
        }

        return recommendations;
    }

    /**
     * Gets all active recommendations for a shop.
     */
    async getActiveRecommendations(shopId) {
        return await prisma.aIRecommendation.findMany({
            where: {
                shop: shopId,
                status: 'new'
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Marks a recommendation as dismissed or applied.
     */
    async updateStatus(id, shopId, status) {
        return await prisma.aIRecommendation.updateMany({
            where: { id, shop: shopId },
            data: { status, updatedAt: new Date() }
        });
    }
}

export default new RecommendationEngine();
