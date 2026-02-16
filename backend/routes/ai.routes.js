import express from "express";
import aiService from "../services/ai/core/aiService.js";
import prisma from "../config/database.js";
import configExecutor from "../services/ai/executors/configExecutor.js";
import bulkExecutor from "../services/ai/executors/bulkExecutor.js";
import productExecutor from "../services/ai/executors/productExecutor.js";
import designExecutor from "../services/ai/executors/designExecutor.js";
import assetExecutor from "../services/ai/executors/assetExecutor.js";
import settingsExecutor from "../services/ai/executors/settingsExecutor.js";
import profilerService from "../services/ai/core/profilerService.js";
import analyticsService from "../services/ai/core/analyticsService.js";
import logger from "../config/logger.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { aiRateLimiter } from "../middleware/aiRateLimit.js";

const router = express.Router();

// Apply rate limiting to all AI routes
router.use(aiRateLimiter);

/**
 * POST /api/ai/chat
 * Main chat endpoint for AI assistant.
 * Shop is pulled from res.locals.shopify.session (verified JWT).
 */
router.post("/chat", asyncHandler(async (req, res) => {
    const { message, context, userId } = req.body;
    const shop = res.locals.shopify?.session?.shop;
    
    logger.info('[AI Chat] Request received', { shop, messageLength: message?.length });

    if (!shop) {
        logger.warn('[AI Chat] Missing shop session');
        return res.status(401).json({ error: "Missing shop session" });
    }
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const response = await aiService.processUserMessage(shop, userId, message, context);
    
    logger.info('[AI Chat] Response sent', { 
        shop, 
        actionsCount: response.suggestedActions?.length || 0 
    });
    
    res.json(response);
}));

/**
 * POST /api/ai/actions/:id/execute
 * Execute or approve a pending AI action.
 * Strictly verified against the current shop session.
 */
router.post("/actions/:id/execute", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;

    logger.info('[AI Action] Execute request', { shop, actionId: id });

    // 1. Fetch the action from database
    const action = await prisma.aIAction.findFirst({
        where: { id, shop } // Ensure the shop owns this action
    });

    if (!action) {
        logger.warn('[AI Action] Action not found', { shop, actionId: id });
        return res.status(404).json({ error: "Action not found or unauthorized." });
    }

    if (action.status === 'executed') {
        logger.warn('[AI Action] Action already executed', { shop, actionId: id });
        return res.status(400).json({ error: "Action already executed." });
    }

    // 2. Parse payload and execute
    const output = action.output; // This is the JSON from Gemini
    let result;

    try {
        if (output.type === 'UPDATE_CONFIG') {
            result = await configExecutor.applyChanges(
                shop,
                output.payload.productId,
                output.payload.changes
            );
        } else if (output.type === 'BULK_UPDATE_CONFIG') {
            const productIds = req.body.productIds || output.payload.productIds;
            result = await bulkExecutor.applyBulkChanges(
                shop,
                productIds,
                output.payload.changes
            );
        } else if (output.type === 'ADD_ELEMENT') {
            result = await productExecutor.addElement(
                shop,
                output.payload.productId,
                output.payload.element
            );
        } else if (output.type === 'REMOVE_UNUSED') {
            result = await productExecutor.removeUnusedElements(
                shop,
                output.payload.productId,
                output.payload.layerIds
            );
        } else if (output.type === 'ADD_SIDE') {
            result = await designExecutor.addSide(
                shop,
                output.payload.productId,
                output.payload.side
            );
        } else if (output.type === 'REMOVE_SIDE') {
            result = await designExecutor.removeSide(
                shop,
                output.payload.productId,
                output.payload.sideId
            );
        } else if (output.type === 'CREATE_ASSET') {
            result = await assetExecutor.createAsset(
                shop,
                output.payload.asset
            );
        } else if (output.type === 'UPDATE_ASSET') {
            result = await assetExecutor.updateAsset(
                shop,
                output.payload.assetId,
                output.payload.updates
            );
        } else if (output.type === 'DELETE_ASSET') {
            result = await assetExecutor.deleteAsset(
                shop,
                output.payload.assetId
            );
        } else if (output.type === 'CREATE_COLOR_PALETTE') {
            result = await assetExecutor.createColorPalette(
                shop,
                output.payload.palette
            );
        } else if (output.type === 'CREATE_FONT_GROUP') {
            result = await assetExecutor.createFontGroup(
                shop,
                output.payload.fontGroup
            );
        } else if (output.type === 'CREATE_GALLERY') {
            result = await assetExecutor.createGallery(
                shop,
                output.payload.gallery
            );
        } else if (output.type === 'UPDATE_SETTINGS') {
            result = await settingsExecutor.updateGlobalSettings(
                shop,
                output.payload.settings
            );
        } else if (output.type === 'UPDATE_DESIGNER_SETTINGS') {
            result = await settingsExecutor.updateDesignerSettings(
                shop,
                output.payload.productId || 'GLOBAL',
                output.payload.settings
            );
        } else if (output.type === 'UPDATE_CANVAS_SETTINGS') {
            result = await settingsExecutor.updateCanvasSettings(
                shop,
                output.payload.productId || 'GLOBAL',
                output.payload.settings
            );
        } else {
            logger.error('[AI Action] Unknown action type', { shop, actionId: id, type: output.type });
            return res.status(400).json({ error: `Execution for type ${output.type} not yet implemented.` });
        }
    } catch (executionError) {
        console.error('[AI Action] Execution failed:', {
            shop,
            actionId: id,
            type: output.type,
            error: executionError.message,
            stack: executionError.stack,
            payload: output.payload
        });
        logger.error('[AI Action] Execution failed', { 
            shop, 
            actionId: id, 
            type: output.type,
            error: executionError.message,
            stack: executionError.stack,
            payload: output.payload
        });
        return res.status(500).json({ 
            error: `Failed to execute action: ${executionError.message}`,
            details: executionError.message
        });
    }

    // 3. Mark as executed and store previous state for rollback
    await prisma.aIAction.update({
        where: { id },
        data: {
            status: 'executed',
            changes: result.previousState, // Now storing what it was BEFORE the change
            executedAt: new Date(),
            approvedAt: new Date()
        }
    });

    // Phase 4: Record success for learning
    await profilerService.recordActionSuccess(shop, action.actionType);

    logger.info('[AI Action] Executed successfully', { shop, actionId: id, type: output.type });

    res.json({ success: true, result: result.result });
}));

/**
 * POST /api/ai/actions/:id/rollback
 * Revert an action using its stored previous state.
 */
router.post("/actions/:id/rollback", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;

    logger.info('[AI Action] Rollback request', { shop, actionId: id });

    const action = await prisma.aIAction.findFirst({
        where: { id, shop, status: 'executed' }
    });

    if (!action || !action.changes || Object.keys(action.changes).length === 0) {
        logger.warn('[AI Action] Cannot rollback', { shop, actionId: id, reason: 'no history' });
        return res.status(400).json({ error: "Action cannot be rolled back (no history found)." });
    }

    const output = action.output;
    let result;

    // Use configExecutor to put back the old values
    result = await configExecutor.applyChanges(
        shop,
        output.payload.productId || 'GLOBAL',
        action.changes // These are the OLD values
    );

    // Mark action as rolled_back
    await prisma.aIAction.update({
        where: { id },
        data: { status: 'rolled_back' }
    });

    logger.info('[AI Action] Rolled back successfully', { shop, actionId: id });

    res.json({ success: true, result: result.result });
}));

/**
 * GET /api/ai/sessions
 * List chat sessions for the current shop.
 */
router.get("/sessions", asyncHandler(async (req, res) => {
    const shop = res.locals.shopify.session.shop;
    const sessions = await prisma.aISession.findMany({
        where: { shop },
        orderBy: { startedAt: 'desc' },
        take: 20
    });
    res.json(sessions);
}));

/**
 * GET /api/ai/sessions/:id
 * Get full context and actions for a specific session.
 */
router.get("/sessions/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;
    const session = await prisma.aISession.findFirst({
        where: { id, shop },
        include: { actions: true }
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
}));

/**
 * DELETE /api/ai/sessions/:id
 * Delete a session and its associated actions.
 */
router.delete("/sessions/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;

    // Delete actions first due to relation
    await prisma.aIAction.deleteMany({ where: { sessionId: id, shop } });
    await prisma.aISession.delete({ where: { id, shop } });

    logger.info('[AI Session] Deleted', { shop, sessionId: id });

    res.json({ success: true });
}));

/**
 * GET /api/ai/recommendations
 * Fetch proactive recommendations for the shop.
 */
router.get("/recommendations", asyncHandler(async (req, res) => {
    const shop = res.locals.shopify.session.shop;
    const recommendations = await prisma.aIRecommendation.findMany({
        where: { shop, status: 'new' },
        orderBy: { priority: 'desc' }
    });
    res.json(recommendations);
}));

/**
 * POST /api/ai/recommendations/:id/status
 * Update recommendation status (applied, dismissed).
 */
router.post("/recommendations/:id/status", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const shop = res.locals.shopify.session.shop;

    await prisma.aIRecommendation.updateMany({
        where: { id, shop },
        data: { status, updatedAt: new Date() }
    });

    logger.info('[AI Recommendation] Status updated', { shop, recommendationId: id, status });

    res.json({ success: true });
}));

/**
 * GET /api/ai/analytics
 * Fetch AI usage and impact metrics.
 */
router.get("/analytics", asyncHandler(async (req, res) => {
    const shop = res.locals.shopify.session.shop;
    const stats = await analyticsService.getAIUsageStats(shop);
    res.json(stats);
}));

/**
 * GET /api/ai/actions/history
 * Fetch detailed history of AI actions.
 */
router.get("/actions/history", asyncHandler(async (req, res) => {
    const shop = res.locals.shopify.session.shop;
    const history = await analyticsService.getActionHistory(shop);
    res.json(history);
}));

/**
 * POST /api/ai/feedback
 * Record user feedback for a session or action.
 */
router.post("/feedback", asyncHandler(async (req, res) => {
    const shop = res.locals.shopify.session.shop;
    const { sessionId, actionId, rating, comment } = req.body;

    const feedback = await profilerService.recordFeedback(shop, {
        sessionId,
        actionId,
        rating,
        comment
    });

    logger.info('[AI Feedback] Recorded', { shop, sessionId, actionId, rating });

    res.json({ success: true, feedback });
}));

export default router;
