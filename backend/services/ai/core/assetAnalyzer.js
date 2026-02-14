import prisma from '../../../config/database.js';

/**
 * Service to analyze assets (fonts, colors, images) for recommendations.
 * Part of Phase 3: Asset Management.
 */
class AssetAnalyzer {

    /**
     * Summarizes asset usage and provides design-centric recommendations.
     */
    async analyzeAssetDiversity(shopId) {
        const assets = await prisma.asset.findMany({
            where: { shop: shopId },
            select: { type: true, name: true, value: true }
        });

        const fonts = assets.filter(a => a.type === 'font');
        const colors = assets.filter(a => a.type === 'color');
        const images = assets.filter(a => a.type === 'image');

        const recommendations = [];

        // 1. Font Analysis
        if (fonts.length < 3) {
            recommendations.push({
                type: 'DESIGN_TIP',
                message: 'You only have a few fonts. Adding high-quality serif and sans-serif pairings can improve design flexibility.'
            });
        }

        // 2. Color Analysis
        if (colors.length === 0) {
            recommendations.push({
                type: 'UX_TIP',
                message: 'No color palettes defined. Defining brand colors makes it easier for customers to stay on-brand.'
            });
        }

        return {
            stats: {
                totalFonts: fonts.length,
                totalColors: colors.length,
                totalImages: images.length
            },
            recommendations
        };
    }
}

export default new AssetAnalyzer();
