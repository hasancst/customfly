import AIService from '../services/ai/core/aiService.js';
import profilerService from '../services/ai/core/profilerService.js';

async function testPersonalization() {
    const shop = "customfly-dev.myshopify.com";
    const userId = "user_123";

    console.log("--- Testing AI Personalization & Language ---");

    // 1. Test English Detection
    console.log("\n[Test 1] English message:");
    const responseEn = await AIService.processUserMessage(shop, userId, "How can I set my canvas to 50x50 cm?");
    console.log("AI Response (Expect English):", responseEn.message);

    // 2. Test Indonesian Detection
    console.log("\n[Test 2] Indonesian message:");
    const responseId = await AIService.processUserMessage(shop, userId, "Bagaimana cara mengganti warna ke merah?");
    console.log("AI Response (Expect Indonesian):", responseId.message);

    // 3. Test Learning (Record action success)
    console.log("\n[Test 3] Learning (Action Success):");
    await profilerService.recordActionSuccess(shop, "UPDATE_CONFIG");
    const profile = await profilerService.getProfile(shop);
    console.log("Learned Patterns:", JSON.stringify(profile.learnedPatterns, null, 2));

    // 4. Test AI with learned patterns (profile should be in prompt)
    console.log("\n[Test 4] AI message with learned context:");
    const responsePersonalized = await AIService.processUserMessage(shop, userId, "Apa saran terbaik untuk toko saya?");
    console.log("AI Response:", responsePersonalized.message);
}

testPersonalization().catch(console.error);
