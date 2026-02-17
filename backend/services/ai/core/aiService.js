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
        // Detect context type
        const contextType = context.type || 'global';
        const productId = context.productId;
        
        logger.info('[AIService] Processing message', { 
            shop: shopId, 
            userId, 
            messageLength: message.length,
            contextType: contextType,
            productId: productId
        });

        // Convert product handle to ID if needed
        if (productId && isNaN(productId)) {
            // productId is a handle (string), need to convert to ID
            logger.info('[AIService] Converting product handle to ID', { handle: productId });
            // For now, skip - we'll handle this in executor
            // TODO: Add handle-to-ID conversion if needed
        }

        // Step 0: Get shop locale and detect language
        const shopLocale = await this._getShopLocale(shopId);
        const defaultLanguage = translationService.mapShopifyLocale(shopLocale);
        const language = translationService.detectLanguage(message, defaultLanguage);
        const languagePrompt = translationService.getLanguagePrompt(language);
        
        logger.info('[AIService] Language detection', { 
            shop: shopId, 
            shopLocale, 
            defaultLanguage, 
            detectedLanguage: language 
        });

        // 1. Initial shop data loading (ISOLATED)
        // Only load product-specific data if we're in product context
        const [shopContext, assets, diagnostic, optimizations, deepDiagnostic, assetInsights, shopProfile] = await Promise.all([
            this._getShopContext(shopId, productId),
            this._getAvailableAssets(shopId),
            (contextType === 'product' && productId) ? productAnalyzer.getDiagnostic(shopId, productId) : Promise.resolve(null),
            (contextType === 'product' && productId) ? configAnalyzer.analyzeConfig(shopId, productId) : Promise.resolve({ suggestions: [] }),
            (contextType === 'product' && productId) ? diagnosticService.performFullDiagnostic(shopId, productId) : Promise.resolve(null),
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
        // Add context-specific guidance
        let contextGuidance = '';
        if (contextType === 'assets') {
            contextGuidance = `
      CURRENT CONTEXT: Assets Management
      - User is in the Assets page (not product-specific)
      - Focus on asset-related actions: ADD_ITEMS_TO_ASSET, CREATE_COLOR_PALETTE, CREATE_FONT_GROUP, CREATE_GALLERY, CREATE_ASSET, UPDATE_ASSET, DELETE_ASSET
      - IMPORTANT: If user says "add to [group name]", use ADD_ITEMS_TO_ASSET, NOT CREATE_ASSET
      - DO NOT suggest product-specific actions like UPDATE_CONFIG or ADD_ELEMENT
      - When creating assets, DO NOT set productId (assets are global)
      `;
        } else if (contextType === 'settings') {
            contextGuidance = `
      CURRENT CONTEXT: Settings Management
      - User is in the Settings page (global settings)
      - Focus on settings actions: UPDATE_SETTINGS, UPDATE_DESIGNER_SETTINGS, UPDATE_CANVAS_SETTINGS
      - Use productId: 'GLOBAL' for global settings
      `;
        } else if (contextType === 'product' && productId) {
            contextGuidance = `
      CURRENT CONTEXT: Product Configuration
      - User is configuring product: ${productId}
      - You can suggest product-specific actions: UPDATE_CONFIG, ADD_ELEMENT, ADD_SIDE, REMOVE_SIDE
      - You can also suggest asset and settings actions
      `;
        } else {
            contextGuidance = `
      CURRENT CONTEXT: Global
      - User is in a general area
      - You can suggest any appropriate action based on their request
      `;
        }
        
        const systemPrompt = `
      You are an AI Configuration Assistant for a Product Customizer Shopify App.
      Your task is to help the merchant configure their product customizer settings.
      
      🚨 CRITICAL RULE - READ THIS FIRST:
      
      WHEN USER SAYS "add [items] to [existing group name]":
      - ❌ DO NOT use CREATE_ASSET or CREATE_COLOR_PALETTE or CREATE_FONT_GROUP
      - ❌ DO NOT create new group
      - ✅ ALWAYS use ADD_ITEMS_TO_ASSET action
      - ✅ Set assetIdentifier to the group name user mentioned
      
      EXAMPLES:
      - "add 5 shapes to Custom" → Use ADD_ITEMS_TO_ASSET with assetIdentifier="Custom"
      - "add colors to Brand Colors" → Use ADD_ITEMS_TO_ASSET with assetIdentifier="Brand Colors"
      - "add fonts to My Fonts" → Use ADD_ITEMS_TO_ASSET with assetIdentifier="My Fonts"
      
      ONLY use CREATE_ASSET when user EXPLICITLY says:
      - "create new group"
      - "make new group"
      - "buat group baru"
      
      ${contextGuidance}
      
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
            "type": "UPDATE_CONFIG | BULK_UPDATE_CONFIG | ADD_ELEMENT | ADD_SIDE | REMOVE_SIDE | CREATE_ASSET | UPDATE_ASSET | DELETE_ASSET | ADD_ITEMS_TO_ASSET | CREATE_COLOR_PALETTE | CREATE_FONT_GROUP | CREATE_GALLERY | UPDATE_SETTINGS | UPDATE_DESIGNER_SETTINGS | UPDATE_CANVAS_SETTINGS",
            "description": "Change canvas to 25x30cm",
            "requiresApproval": true,
            "payload": {
              "target": "merchantConfig | asset | settings",
              "productId": "string",
              "changes": { 
                "paperSize": "Custom", 
                "unit": "cm | mm | inch | px", 
                "customPaperDimensions": { "width": 25, "height": 30 } 
              },
              "productIds": ["id1", "id2"],
              "element": { "type": "text | image | monogram | gallery", "label": "string", "font": "string", "color": "string" },
              "side": { "id": "string", "name": "string", "baseImage": "string", "elements": [] },
              "sideId": "string",
              "asset": { "type": "font | color | gallery | shape | option", "name": "string", "value": "string", "label": "string", "config": {} },
              "assetId": "string",
              "assetIdentifier": "string (asset ID or name)",
              "items": ["item1", "item2"],
              "updates": {},
              "palette": { "name": "string", "category": "string", "colors": [{"name": "Red", "hex": "#FF0000"}] },
              "fontGroup": { "name": "string", "category": "string", "fontType": "google | uploaded", "fonts": ["Inter", "Roboto"] },
              "settings": {}
            }
          }
        ]
      }

      ASSET MANAGEMENT ACTIONS:
      - CREATE_COLOR_PALETTE: Create a new color palette
        Example: { "type": "CREATE_COLOR_PALETTE", "payload": { "palette": { "name": "Product Colors", "category": "Custom", "colors": [{"name": "Red", "hex": "#FF0000"}, {"name": "Blue", "hex": "#0000FF"}] } } }
      
      - CREATE_FONT_GROUP: Create a new font group
        Example: { "type": "CREATE_FONT_GROUP", "payload": { "fontGroup": { "name": "Modern Fonts", "category": "Custom", "fontType": "google", "fonts": ["Inter", "Roboto", "Poppins"] } } }
      
      - CREATE_GALLERY: Create a gallery with images downloaded from URLs
        Example: { "type": "CREATE_GALLERY", "payload": { "gallery": { "name": "Product Photos", "category": "Custom", "images": [{"name": "Photo 1", "url": "https://images.unsplash.com/photo-..."}, {"name": "Photo 2", "url": "https://images.unsplash.com/photo-..."}] } } }
        IMPORTANT: You CAN use free image URLs from Unsplash, Pexels, or other sources. The system will automatically download and upload them to our S3 storage.
      
      - CREATE_ASSET: Create any asset (generic) - ONLY use when user explicitly says "create new group"
        Example: { "type": "CREATE_ASSET", "payload": { "asset": { "type": "option", "name": "Sizes", "value": "Small, Medium, Large", "label": "Product Sizes" } } }
      
      - ADD_ITEMS_TO_ASSET: Add items to an EXISTING asset group - Use this when user wants to add items to existing group
        🚨 CRITICAL: This is the MOST IMPORTANT action for adding items!
        When to use: User says "add [items] to [group name]" or "tambah [items] ke [group name]"
        DO NOT use CREATE_ASSET when user mentions existing group name!
        
        Example for shapes: { "type": "ADD_ITEMS_TO_ASSET", "payload": { "assetIdentifier": "Custom", "items": ["Circle|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='40' fill='#FF6B6B'/></svg>", "Square|<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect x='10' y='10' width='80' height='80' fill='#4ECDC4'/></svg>"] } }
        Example for colors: { "type": "ADD_ITEMS_TO_ASSET", "payload": { "assetIdentifier": "Brand Colors", "items": ["Navy|#001F3F", "Coral|#FF6B6B"] } }
        Example for fonts: { "type": "ADD_ITEMS_TO_ASSET", "payload": { "assetIdentifier": "My Fonts", "items": ["Arial", "Helvetica"] } }
        
        IMPORTANT: 
        - Use assetIdentifier (asset name or ID) to specify which group to add to
        - For shapes: items must be complete SVG code in format "Name|<svg>...</svg>"
        - For colors: items must be in format "Name|#HEX"
        - For fonts: items can be just font names
        - DO NOT use CREATE_ASSET when user wants to add to existing group!
        
        USER PHRASES THAT MEAN "ADD TO EXISTING":
        - "add 5 shapes to Custom" → ADD_ITEMS_TO_ASSET with assetIdentifier="Custom"
        - "tambah shapes ke Custom" → ADD_ITEMS_TO_ASSET with assetIdentifier="Custom"
        - "add colors to Brand Colors" → ADD_ITEMS_TO_ASSET with assetIdentifier="Brand Colors"
        - "insert fonts to My Fonts" → ADD_ITEMS_TO_ASSET with assetIdentifier="My Fonts"
      
      - UPDATE_ASSET: Update existing asset properties (name, config, etc.)
        Example: { "type": "UPDATE_ASSET", "payload": { "assetId": "uuid_or_asset_name", "updates": { "name": "New Name", "value": "New Value" } } }
      
      - DELETE_ASSET: Delete an asset (use exact asset name from context)
        Example: { "type": "DELETE_ASSET", "payload": { "assetId": "Customfly Default Font" } }
        IMPORTANT: Use the exact asset name as shown in the context, NOT a placeholder like "uuid_for_..."

      SETTINGS ACTIONS:
      - UPDATE_SETTINGS: Update global app settings
        Example: { "type": "UPDATE_SETTINGS", "payload": { "settings": { "designerLayout": "modal", "buttonText": "Customize Now" } } }
      
      - UPDATE_DESIGNER_SETTINGS: Update designer UI settings
        Example: { "type": "UPDATE_DESIGNER_SETTINGS", "payload": { "productId": "GLOBAL", "settings": { "showGrid": true, "showRulers": false, "headerTitle": "Design Your Product" } } }
      
      - UPDATE_CANVAS_SETTINGS: Update canvas settings
        Example: { "type": "UPDATE_CANVAS_SETTINGS", "payload": { "productId": "GLOBAL", "settings": { "paperSize": "A4", "unit": "mm", "safeAreaPadding": 10 } } }

      UNIT CONVERSION REFERENCE:
      - px (pixels): Direct pixel values, no conversion (1px = 1px)
      - mm (millimeters): 1mm = 3.78px at 96 DPI
      - cm (centimeters): 1cm = 37.8px at 96 DPI
      - inch (inches): 1in = 96px at 96 DPI
      
      EXAMPLES:
      - "Set canvas to 1000x1000 pixels" → paperSize: "Custom", unit: "px", customPaperDimensions: {width: 1000, height: 1000}
      - "Change canvas to 21x29.7cm" → paperSize: "Custom", unit: "cm", customPaperDimensions: {width: 21, height: 29.7}
      - "Make it 210x297mm" → paperSize: "Custom", unit: "mm", customPaperDimensions: {width: 210, height: 297}
      - "Set to 8.5x11 inches" → paperSize: "Custom", unit: "inch", customPaperDimensions: {width: 8.5, height: 11}

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

    /**
     * Get shop locale from Shopify session or cache
     */
    async _getShopLocale(shopId) {
        try {
            // Try to get from session storage first
            const session = await prisma.session.findFirst({
                where: { shop: shopId },
                orderBy: { updatedAt: 'desc' }
            });

            if (session && session.locale) {
                return session.locale;
            }

            // If not in session, return default
            return 'id-ID'; // Default to Indonesian
        } catch (error) {
            logger.error('[AIService] Failed to get shop locale', { shop: shopId, error: error.message });
            return 'id-ID'; // Default to Indonesian on error
        }
    }
}

export default new AIService();
