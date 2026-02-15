/**
 * DeepSeek Service - Cloud AI with affordable pricing
 * API: https://platform.deepseek.com/
 * Pricing: $0.14 per 1M input tokens, $0.28 per 1M output tokens
 * Much cheaper than OpenAI/Gemini!
 */
class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.baseUrl = 'https://api.deepseek.com/v1';
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        
        if (!this.apiKey) {
            console.warn('[DeepSeek] API key not set');
        } else {
            console.log(`[DeepSeek] Initialized with model ${this.model}`);
        }
    }

    /**
     * Generate completion using DeepSeek API
     * Compatible with OpenAI API format
     */
    async generateCompletion(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('DEEPSEEK_API_KEY is not set in environment variables');
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.max_tokens || 2048,
                    top_p: options.top_p || 0.9,
                    response_format: { type: 'json_object' }, // Force JSON output
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '{}';

            // Parse JSON response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(content);
            } catch (e) {
                console.error('[DeepSeek] Failed to parse JSON:', content);
                // Fallback: wrap in object
                parsedResponse = {
                    message: content,
                    actions: []
                };
            }

            return parsedResponse;

        } catch (error) {
            console.error('[DeepSeek] Error:', error.message);
            throw new Error(`Failed to communicate with DeepSeek: ${error.message}`);
        }
    }

    /**
     * Analyze text using DeepSeek
     */
    async analyze(systemPrompt, userPrompt) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        return await this.generateCompletion(messages);
    }

    /**
     * Check API key validity
     */
    async healthCheck() {
        if (!this.apiKey) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[DeepSeek] Available models:', data.data?.map(m => m.id));
                return true;
            }
            return false;
        } catch (error) {
            console.error('[DeepSeek] Health check failed:', error.message);
            return false;
        }
    }
}

export default new DeepSeekService();
