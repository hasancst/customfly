import { GoogleGenerativeAI } from "@google/generative-ai";
import ollamaService from "./ollamaService.js";
import deepseekService from "./deepseekService.js";

/**
 * LLM Service - Multi-provider AI abstraction layer
 * Supports: Gemini (cloud), DeepSeek (cloud), Ollama (self-hosted)
 */
class LLMService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'gemini';
        console.log(`[LLM] Using provider: ${this.provider}`);

        // Initialize Gemini if selected
        if (this.provider === 'gemini') {
            this.apiKey = process.env.GEMINI_API_KEY;
            if (this.apiKey) {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
            }
        }
    }

    /**
     * Route to appropriate provider
     */
    async analyze(systemPrompt, userPrompt) {
        switch (this.provider) {
            case 'ollama':
                return await ollamaService.analyze(systemPrompt, userPrompt);
            
            case 'deepseek':
                return await deepseekService.analyze(systemPrompt, userPrompt);
            
            case 'gemini':
            default:
                return await this._analyzeGemini(systemPrompt, userPrompt);
        }
    }

    /**
     * Gemini-specific implementation
     */
    async _analyzeGemini(systemPrompt, userPrompt) {
        if (!this.genAI) {
            throw new Error("GEMINI_API_KEY is not set in environment variables.");
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
                systemInstruction: systemPrompt,
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                }
            });

            const result = await model.generateContent(userPrompt);
            const response = await result.response;
            const text = response.text();

            return JSON.parse(text);
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw new Error(`Failed to communicate with Google AI Studio: ${error.message}`);
        }
    }

    /**
     * Generic completion method (for backward compatibility)
     */
    async generateCompletion(messages, options = {}) {
        const systemInstruction = messages.find(m => m.role === 'system')?.content || "";
        const userMessage = messages.find(m => m.role === 'user')?.content || "";
        
        return await this.analyze(systemInstruction, userMessage);
    }
}

export default new LLMService();
