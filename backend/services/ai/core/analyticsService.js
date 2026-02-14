import prisma from '../../../config/database.js';

/**
 * Service to track AI usage and impact.
 * Part of Phase 3: Analytics.
 */
class AnalyticsService {

    /**
     * Gets summary statistics for AI performance.
     */
    async getAIUsageStats(shopId) {
        const [totalSessions, totalActions, executedActions, recommendations] = await Promise.all([
            prisma.aISession.count({ where: { shop: shopId } }),
            prisma.aIAction.count({ where: { shop: shopId } }),
            prisma.aIAction.count({ where: { shop: shopId, status: 'executed' } }),
            prisma.aIRecommendation.count({ where: { shop: shopId, status: 'applied' } })
        ]);

        // Mock time saved calculation (5 mins per action)
        const timeSavedMinutes = executedActions * 5;

        return {
            usage: {
                totalSessions,
                totalActions,
                executedActions,
                successRate: totalActions > 0 ? (executedActions / totalActions) * 100 : 0
            },
            impact: {
                timeSavedMinutes,
                recommendationsApplied: recommendations
            }
        };
    }

    /**
     * Gets a list of recent actions for history view.
     */
    async getActionHistory(shopId, limit = 50) {
        return await prisma.aIAction.findMany({
            where: { shop: shopId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                session: {
                    select: { startedAt: true, userId: true }
                }
            }
        });
    }
}

export default new AnalyticsService();
