/**
 * Translation Service for Multi-language Support.
 * Handles language detection and prompt translation.
 */
class TranslationService {
    /**
     * Detects language from a message, with optional default language.
     * @param {string} message - User message
     * @param {string} defaultLanguage - Default language (from shop settings)
     */
    detectLanguage(message, defaultLanguage = 'id') {
        const idKeywords = ["bagaimana", "cara", "saya", "tambah", "kurang", "atur", "hapus", "ubah", "buat"];
        const enKeywords = ["how", "ways", "i", "add", "remove", "configure", "set", "delete", "change", "create"];

        const lowerMsg = message.toLowerCase();

        const isIndonesian = idKeywords.some(k => lowerMsg.includes(k));
        const isEnglish = enKeywords.some(k => lowerMsg.includes(k));

        // If message clearly indicates a language, use it
        if (isIndonesian && !isEnglish) return "id";
        if (isEnglish && !isIndonesian) return "en";

        // Otherwise, use default language from shop settings
        return defaultLanguage;
    }

    /**
     * Maps Shopify locale to our language code
     */
    mapShopifyLocale(shopifyLocale) {
        if (!shopifyLocale) return 'id';
        
        const locale = shopifyLocale.toLowerCase();
        
        // Indonesian
        if (locale.startsWith('id')) return 'id';
        
        // English
        if (locale.startsWith('en')) return 'en';
        
        // Default to Indonesian
        return 'id';
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
