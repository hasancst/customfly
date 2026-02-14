import prisma from '../config/database.js';
import aiService from '../services/ai/core/aiService.js';

/**
 * Script to test AI Service isolation and response.
 * Run with: node backend/tests/test_ai_chat.js
 */
async function testAIChat() {
    const testShop = "customfly-dev.myshopify.com";
    const testUser = "user_123";
    const testMessage = "Bagaimana cara mengatur ukuran kanvas menjadi 20x20 cm?";

    try {
        console.log("--- Testing AI Chat ---");
        console.log(`Input: ${testMessage}`);

        const response = await aiService.processUserMessage(testShop, testUser, testMessage);

        console.log("\n--- AI Response ---");
        console.log(`Message: ${response.message}`);
        console.log(`Actions Sugested: ${response.suggestedActions.length}`);

        // Verify DB logging
        const action = await prisma.aIAction.findFirst({
            where: { shop: testShop },
            orderBy: { createdAt: 'desc' }
        });

        if (action) {
            console.log("\n--- Audit Log Verified ---");
            console.log(`Action ID: ${action.id}`);
            console.log(`Action Type: ${action.actionType}`);
        }

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testAIChat();
