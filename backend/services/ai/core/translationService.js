/**
 * Translation Service for Multi-language Support.
 * Handles language detection and prompt translation.
 */
class TranslationService {
    /**
     * Detects language from a message.
     */
    detectLanguage(message) {
        const idKeywords = ["bagaimana", "cara", "saya", "tambah", "kurang", "atur"];
        const enKeywords = ["how", "ways", "i", "add", "remove", "configure", "set"];

        const lowerMsg = message.toLowerCase();

        const isIndonesian = idKeywords.some(k => lowerMsg.includes(k));
        const isEnglish = enKeywords.some(k => lowerMsg.includes(k));

        if (isIndonesian && !isEnglish) return "id";
        if (isEnglish && !isIndonesian) return "en";

        return "id"; // Default to Indonesian for this app's context
    }

    /**
     * Gets a multilingual system prompt fragment.
     */
    getLanguagePrompt(language) {
        if (language === "id") {
            return `PENTING: Selalu merespons dalam bahasa Indonesia yang ramah dan profesional.`;
        }
        return `IMPORTANT: Always respond in friendly and professional English.`;
    }
}

export default new TranslationService();
