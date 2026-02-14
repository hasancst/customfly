import prisma from '../../../config/database.js';

/**
 * Profiler Service to handle Phase 4: Personalization & Learning.
 * Analyzes shop data to detect industry, style, and usage patterns.
 */
class ProfilerService {

    /**
     * Get or create a profile for the shop.
     */
    async getProfile(shopId) {
        let profile = await prisma.aIShopProfile.findUnique({
            where: { shop: shopId }
        });

        if (!profile) {
            profile = await this.initializeProfile(shopId);
        }

        return profile;
    }

    /**
     * Initializes a new profile by analyzing existing shop data.
     */
    async initializeProfile(shopId) {
        console.log(`[Profiler] Initializing profile for ${shopId}`);

        // Fetch some products to guess industry
        const products = await prisma.merchantConfig.findMany({
            where: { shop: shopId },
            take: 20,
            select: { shopifyProductId: true }
        });

        // In a real scenario, we might fetch actual Shopify product data (titles/tags)
        // For now, let's detect based on configuration traits
        const industry = await this._detectIndustry(shopId);

        return await prisma.aIShopProfile.create({
            data: {
                shop: shopId,
                industry: industry,
                stylePreference: "standard",
                learnedPatterns: {
                    frequentCanvasSizes: [],
                    preferredColors: [],
                    approvedActionTypes: {}
                }
            }
        });
    }

    /**
     * Increments the count for an approved action type to learn preferences.
     */
    async recordActionSuccess(shopId, actionType) {
        const profile = await this.getProfile(shopId);
        const patterns = profile.learnedPatterns || {};

        if (!patterns.approvedActionTypes) patterns.approvedActionTypes = {};

        patterns.approvedActionTypes[actionType] = (patterns.approvedActionTypes[actionType] || 0) + 1;

        await prisma.aIShopProfile.update({
            where: { shop: shopId },
            data: { learnedPatterns: patterns }
        });
    }

    /**
     * Internal helper to guess industry based on available data.
     */
    async _detectIndustry(shopId) {
        // Mock logic: In a real app, query Shopify API for product categories
        const industries = ["Apparel", "Home Decor", "Stationery", "Custom Gifts"];
        return industries[Math.floor(Math.random() * industries.length)];
    }

    /**
     * Explicit feedback recording.
     */
    async recordFeedback(shopId, { sessionId, actionId, rating, comment }) {
        return await prisma.aIFeedback.create({
            data: {
                shop: shopId,
                sessionId,
                actionId,
                rating,
                comment
            }
        });
    }
}

export default new ProfilerService();
