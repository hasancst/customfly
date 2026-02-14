import prisma from '../../../config/database.js';
import llmService from '../providers/llmService.js';
import productAnalyzer from './productAnalyzer.js';
import configAnalyzer from './configAnalyzer.js';
import recommendationEngine from './recommendationEngine.js';
import diagnosticService from './diagnosticService.js';
import assetAnalyzer from './assetAnalyzer.js';
import profilerService from './profilerService.js';
import translationService from './translationService.js';
import logger from '../../../config/logger.js';

/**
 * Core AI Service to manage multi-shop AI interactions.
 * Ensures strict shop isolation and audit logging.
 */
class AIService {

    /**
   * Main entry point for AI chat.
   * shopId is strictly extracted from verified session context.
   */
    async processUserMessage(shopId, userId, message, context = {}) {
        logger.info('[AIService] Processing message', { 
            shop: shopId, 
            userId, 
            messageLength: message.length,
            hasContext: !!context.productId 
        });

        // Convert product handle to ID if needed
        let productId = context.productId;
        if (productId && isNaN(productId)) {
            // productId is a handle (string), need to convert to ID
            logger.info('[AIService] Converting product handle to ID', { handle: productId });
            // For now, skip - we'll handle this in executor
            // TODO: Add handle-to-ID conversion if needed
        }

        // Step 0: Detect Language
        const language = translationService.detectLanguage(message);
        const languagePrompt = translationService.getLanguagePrompt(language);

        // 1. Initial shop data loading (ISOLATED)
        const [shopContext, assets, diagnostic, optimizations, deepDiagnostic, assetInsights, shopProfile] = await Promise.all([
            this._getShopContext(shopId, context.productId),
            this._getAvailableAssets(shopId),
            context.productId ? productAnalyzer.getDiagnostic(shopId, context.productId) : Promise.resolve(null),
            context.productId ? configAnalyzer.analyzeConfig(shopId, context.productId) : Promise.resolve({ suggestions: [] }),
            context.productId ? diagnosticService.performFullDiagnostic(shopId, context.productId) : Promise.resolve(null),
            assetAnalyzer.analyzeAssetDiversity(shopId),
            profilerService.getProfile(shopId)
        ]);

        // Proactively store recommendations in background
        if (optimizations.suggestions.length > 0) {
            recommendationEngine.createRecommendations(shopId, optimizations).catch(err => 
                logger.error("Recommendation Engine Error", { error: err.message, shop: shopId })
            );
        }

        // 2. Build system prompt with strictly defined guardrails and JSON schema
        const systemPrompt = `
      You are an AI Configuration Assistant for a Product Customizer Shopify App.
      Your task is to help the merchant configure their product customizer settings.
      
      GUARDRAILS:
      - You can ONLY manage data/configuration.
      - You DO NOT have access to scripts, source code, or the file system.
      - You can only access data for shop: ${shopId}.
      - ${languagePrompt}
      - Output MUST be a valid JSON object.
      
      ACTION SCHEMA:
      {
        "message": "Friendly response to the merchant",
        "type": "chat | configure | recommendation",
        "actions": [
          {
            "id": "unique_action_id",
            "type": "UPDATE_CONFIG | BULK_UPDATE_CONFIG | ADD_ELEMENT",
            "description": "Change canvas to 25x30cm",
            "requiresApproval": true,
            "payload": {
              "target": "merchantConfig",
              "productId": "string",
              "changes": { "paperSize": "Custom", "unit": "cm", "customPaperDimensions": { "width": 25, "height": 30 } },
              "productIds": ["id1", "id2"],
              "element": { "type": "text | image | monogram | gallery", "label": "string", "font": "string", "color": "string" }
            }
          }
        ]
      }

      CONTEXT:
      - Available Fonts: ${assets.fonts.join(', ')}
      - Available Color Palettes: ${assets.colors.join(', ')}
      - Asset Insights: ${JSON.stringify(assetInsights)}
      - Product Diagnostic (Basic): ${diagnostic || 'N/A'}
      - Product Diagnostic (Deep): ${JSON.stringify(deepDiagnostic)}
      - Auto-detected Optimizations: ${JSON.stringify(optimizations.suggestions)}
      - Shop Profile (Learned Patterns): ${JSON.stringify(assetInsights)}
      - Industry & Preferences: ${shopProfile.industry} (${shopProfile.stylePreference})
      - Product Data: ${JSON.stringify(shopContext)}

      ALWAYS explain your reasoning before suggesting an action.
    `;

        // 3. Call LLM (Gemini)
        const aiResponse = await llmService.analyze(systemPrompt, message);

        logger.info('[AIService] LLM response received', { 
            shop: shopId, 
            actionsCount: aiResponse.actions?.length || 0 
        });

        // 4. Create and Log AI Session & Action
        const session = await this._getOrCreateSession(shopId, userId);

        let loggedActions = [];
        if (aiResponse.actions && aiResponse.actions.length > 0) {
            for (const actionData of aiResponse.actions) {
                const loggedAction = await this._logAction(session.id, shopId, actionData);
                loggedActions.push({ ...actionData, dbId: loggedAction.id });
            }
        }

        logger.info('[AIService] Message processed successfully', { 
            shop: shopId, 
            sessionId: session.id,
            actionsLogged: loggedActions.length 
        });

        return {
            message: aiResponse.message,
            suggestedActions: loggedActions,
            sessionId: session.id
        };
    }

    /**
     * Gets fonts, colors, and other assets available for this shop.
     */
    async _getAvailableAssets(shopId) {
        const assets = await prisma.asset.findMany({
            where: { shop: shopId },
            select: { type: true, name: true }
        });

        return {
            fonts: assets.filter(a => a.type === 'font').map(a => a.name),
            colors: assets.filter(a => a.type === 'color').map(a => a.name)
        };
    }

    /**
     * Fetches only the data relevant to the current shop.
     * CRITICAL for multi-shop isolation.
     */
    async _getShopContext(shopId, productId) {
        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId || 'GLOBAL')
                }
            }
        });

        return {
            shop: shopId,
            productId: productId,
            currentSettings: config || {}
        };
    }

    async _getOrCreateSession(shopId, userId) {
        return await prisma.aISession.create({
            data: {
                shop: shopId,
                userId: userId,
                status: "active"
            }
        });
    }

    async _logAction(sessionId, shopId, aiOutput) {
        return await prisma.aIAction.create({
            data: {
                sessionId: sessionId,
                shop: shopId,
                actionType: aiOutput.type || "unknown",
                target: aiOutput.target || "general",
                output: aiOutput,
                status: aiOutput.requiresApproval ? "pending" : "executed"
            }
        });
    }
}

export default new AIService();
