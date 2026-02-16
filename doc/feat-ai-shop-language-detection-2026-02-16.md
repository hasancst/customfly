# Feature: AI Default Language Based on Shop Language - 2026-02-16

## Overview
AI Chat now automatically uses the shop's language as the default language for responses. This provides a better user experience by responding in the merchant's preferred language without requiring explicit language detection from every message.

## Implementation

### 1. Translation Service Updates
**File**: `backend/services/ai/core/translationService.js`

Added new methods:
- `detectLanguage(message, defaultLanguage)` - Now accepts default language parameter
- `mapShopifyLocale(shopifyLocale)` - Maps Shopify locale codes to our language codes

Supported languages:
- `id` - Indonesian (Bahasa Indonesia)
- `en` - English

### 2. AI Service Updates
**File**: `backend/services/ai/core/aiService.js`

Added:
- `_getShopLocale(shopId)` - Fetches shop locale from database
- Updated `processUserMessage()` to:
  1. Get shop locale from database
  2. Map Shopify locale to language code
  3. Use as default language for AI responses
  4. Log language detection for debugging

### 3. Auth Hook Updates
**File**: `backend/config/shopify.js`

Updated `afterAuth` hook to:
- Fetch shop information after authentication
- Infer shop language from domain (e.g., `.id` domains → Indonesian)
- Store locale in Session table for later retrieval

### 4. Database Schema
**File**: `backend/prisma/schema.prisma`

The `Session` model already has a `locale` field:
```prisma
model Session {
  id                  String    @id
  shop                String
  locale              String?   // Stores shop language preference
  // ... other fields
}
```

## How It Works

### Language Detection Flow

1. **User sends message to AI Chat**
2. **AI Service fetches shop locale** from Session table
3. **Map locale to language code**:
   - `id-ID`, `id` → Indonesian
   - `en-US`, `en-GB`, `en` → English
   - Default → Indonesian
4. **Detect language from message**:
   - If message contains clear language indicators (keywords), use that language
   - Otherwise, use shop's default language
5. **Generate response** in detected/default language

### Shop Locale Detection

When merchant installs the app:
1. OAuth authentication completes
2. `afterAuth` hook runs
3. Checks shop domain for language hints:
   - Domain contains `.id` → Indonesian
   - Otherwise → English (default)
4. Stores locale in Session table

### Language Override

Users can still override the default language by using language-specific keywords:
- Indonesian keywords: "bagaimana", "cara", "saya", "tambah", "kurang", "atur", "hapus", "ubah", "buat"
- English keywords: "how", "ways", "i", "add", "remove", "configure", "set", "delete", "change", "create"

## Examples

### Example 1: Indonesian Shop
```
Shop: uploadfly-lab.myshopify.com (detected as English domain)
Stored locale: en-US
User message: "add text element"
AI response: English (matches shop locale)
```

### Example 2: Indonesian Shop with Override
```
Shop: toko-saya.myshopify.com (detected as English domain)
Stored locale: en-US
User message: "bagaimana cara tambah text"
AI response: Indonesian (overridden by message keywords)
```

### Example 3: Indonesian Domain
```
Shop: toko.co.id (contains .id)
Stored locale: id-ID
User message: "configure canvas"
AI response: Indonesian (shop default, no clear English indicators)
```

## Benefits

1. **Better UX**: Merchants get responses in their preferred language automatically
2. **Consistent Experience**: Language persists across sessions
3. **Flexible**: Can still override with message keywords
4. **Scalable**: Easy to add more languages in the future

## Logging

Language detection is logged for debugging:
```javascript
logger.info('[AIService] Language detection', { 
    shop: shopId, 
    shopLocale: 'id-ID',
    defaultLanguage: 'id',
    detectedLanguage: 'id'
});
```

## Future Enhancements

1. **Fetch actual shop language from Shopify API** instead of inferring from domain
2. **Add more languages**: Spanish, French, German, etc.
3. **User preference override**: Allow merchants to set preferred AI language in settings
4. **Language auto-detection improvement**: Use more sophisticated NLP for detection

## Testing

To test:
1. Install app on a shop
2. Check Session table for stored locale
3. Send messages to AI Chat
4. Verify responses are in correct language
5. Try overriding with language-specific keywords

## Status
✅ Implemented and deployed - Backend restarted at 01:01 UTC
