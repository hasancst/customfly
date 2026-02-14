import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Service to handle LLM API calls using Google Gemini Flash.
 * Optimized for fast, structured JSON responses.
 */
class LLMService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
        }
    }

    /**
     * Generates a completion based on the prompt and system instructions.
     * Uses Gemini 1.5 Flash by default for speed and cost efficiency.
     */
    async generateCompletion(messages, options = {}) {
        if (!this.genAI) {
            throw new Error("GEMINI_API_KEY is not set in environment variables.");
        }

        try {
            // Convert OpenAI-style messages to Gemini-style
            const systemInstruction = messages.find(m => m.role === 'system')?.content || "";
            const userMessage = messages.find(m => m.role === 'user')?.content || "";

            // Initialize model with JSON constraint
            const model = this.genAI.getGenerativeModel({
                model: options.model || process.env.GEMINI_MODEL || "gemini-1.5-flash",
                systemInstruction: systemInstruction,
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: options.temperature || 0.7,
                }
            });

            const result = await model.generateContent(userMessage);
            const response = await result.response;
            const text = response.text();

            return JSON.parse(text);
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw new Error(`Failed to communicate with Google AI Studio: ${error.message}`);
        }
    }

    /**
     * Specialized method for analyzing products or configurations.
     */
    async analyze(systemPrompt, userPrompt) {
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];
        return this.generateCompletion(messages);
    }
}

export default new LLMService();
