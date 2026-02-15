/**
 * Ollama Service - Self-hosted AI model integration
 * Compatible with Ollama API (OpenAI-like interface)
 */
class OllamaService {
    constructor() {
        this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
        console.log(`[Ollama] Initialized with ${this.baseUrl} using model ${this.model}`);
    }

    /**
     * Generate completion using Ollama
     */
    async generateCompletion(messages, options = {}) {
        try {
            // Convert messages to Ollama format
            const systemInstruction = messages.find(m => m.role === 'system')?.content || "";
            const userMessage = messages.find(m => m.role === 'user')?.content || "";

            const prompt = `${systemInstruction}\n\nUser: ${userMessage}\n\nAssistant:`;

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    format: 'json', // Request JSON output
                    options: {
                        temperature: options.temperature || 0.7,
                        top_p: options.top_p || 0.9,
                        num_predict: options.max_tokens || 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Parse JSON response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(data.response);
            } catch (e) {
                // If not valid JSON, wrap in object
                parsedResponse = {
                    message: data.response,
                    actions: []
                };
            }

            return parsedResponse;

        } catch (error) {
            console.error('[Ollama] Error:', error.message);
            throw new Error(`Failed to communicate with Ollama: ${error.message}`);
        }
    }

    /**
     * Analyze text using Ollama
     */
    async analyze(systemPrompt, userPrompt) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        return await this.generateCompletion(messages);
    }

    /**
     * Check if Ollama is available
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                console.log('[Ollama] Available models:', data.models?.map(m => m.name));
                return true;
            }
            return false;
        } catch (error) {
            console.error('[Ollama] Health check failed:', error.message);
            return false;
        }
    }
}

export default new OllamaService();
