# Fix: AI Context Detection for Assets & Settings Pages

**Date**: 2026-02-15  
**Status**: ✅ Fixed  
**Priority**: 🐛 Bug Fix

## Problem

When using AI Chat in the Assets or Settings pages, the system was logging `[AIChat] Final productId: null` repeatedly because these pages are not product-specific. This caused:

1. Unnecessary console logs
2. AI trying to load product-specific diagnostics when not needed
3. Potential confusion in AI responses (mixing product and asset contexts)

## Root Cause

The AI Chat component only detected `productId` from URL, but didn't understand the **context type**:
- **Product Context**: User is configuring a specific product
- **Assets Context**: User is managing global assets (fonts, colors, gallery)
- **Settings Context**: User is managing global app settings
- **Global Context**: User is in a general area

Without context type detection, the AI would:
- Try to load product diagnostics even in Assets page
- Not know whether to suggest product actions or asset actions
- Generate inappropriate action types

## Solution

### 1. Frontend: Context Type Detection

Updated `frontend/src/components/ai/AIChat.tsx` to detect context type from URL pathname:

```typescript
// Detect context type and productId
const context = React.useMemo(() => {
    // First try route params (when AIChat is inside route)
    if (params.productId) {
        return { type: 'product', productId: params.productId };
    }
    
    // Then try to extract from pathname (when AIChat is global)
    const match = location.pathname.match(/\/designer\/(\d+)/);
    if (match) {
        return { type: 'product', productId: match[1] };
    }
    
    // Check if we're in Assets page
    if (location.pathname.includes('/assets')) {
        return { type: 'assets', productId: null };
    }
    
    // Check if we're in Settings page
    if (location.pathname.includes('/settings')) {
        return { type: 'settings', productId: null };
    }
    
    // Default: global context
    return { type: 'global', productId: null };
}, [params.productId, location.pathname]);
```

### 2. Frontend: Send Context Type to Backend

Updated the chat request to include context type:

```typescript
const response = await fetch('/imcst_api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        message: userMessage,
        context: {
            type: context.type, // 'product', 'assets', 'settings', or 'global'
            productId: context.productId // null for assets/settings/global
        }
    })
});
```

### 3. Backend: Context-Aware Processing

Updated `backend/services/ai/core/aiService.js` to handle context type:

```javascript
async processUserMessage(shopId, userId, message, context = {}) {
    // Detect context type
    const contextType = context.type || 'global';
    const productId = context.productId;
    
    logger.info('[AIService] Processing message', { 
        shop: shopId, 
        userId, 
        messageLength: message.length,
        contextType: contextType,
        productId: productId
    });
    
    // Only load product-specific data if we're in product context
    const [shopContext, assets, diagnostic, optimizations, deepDiagnostic, assetInsights, shopProfile] = await Promise.all([
        this._getShopContext(shopId, productId),
        this._getAvailableAssets(shopId),
        (contextType === 'product' && productId) ? productAnalyzer.getDiagnostic(shopId, productId) : Promise.resolve(null),
        (contextType === 'product' && productId) ? configAnalyzer.analyzeConfig(shopId, productId) : Promise.resolve({ suggestions: [] }),
        (contextType === 'product' && productId) ? diagnosticService.performFullDiagnostic(shopId, productId) : Promise.resolve(null),
        assetAnalyzer.analyzeAssetDiversity(shopId),
        profilerService.getProfile(shopId)
    ]);
    
    // ... rest of processing
}
```

### 4. Backend: Context-Specific AI Guidance

Added context-specific guidance to the AI system prompt:

```javascript
let contextGuidance = '';
if (contextType === 'assets') {
    contextGuidance = `
CURRENT CONTEXT: Assets Management
- User is in the Assets page (not product-specific)
- Focus on asset-related actions: CREATE_COLOR_PALETTE, CREATE_FONT_GROUP, CREATE_ASSET, UPDATE_ASSET, DELETE_ASSET
- DO NOT suggest product-specific actions like UPDATE_CONFIG or ADD_ELEMENT
- When creating assets, DO NOT set productId (assets are global)
`;
} else if (contextType === 'settings') {
    contextGuidance = `
CURRENT CONTEXT: Settings Management
- User is in the Settings page (global settings)
- Focus on settings actions: UPDATE_SETTINGS, UPDATE_DESIGNER_SETTINGS, UPDATE_CANVAS_SETTINGS
- Use productId: 'GLOBAL' for global settings
`;
} else if (contextType === 'product' && productId) {
    contextGuidance = `
CURRENT CONTEXT: Product Configuration
- User is configuring product: ${productId}
- You can suggest product-specific actions: UPDATE_CONFIG, ADD_ELEMENT, ADD_SIDE, REMOVE_SIDE
- You can also suggest asset and settings actions
`;
} else {
    contextGuidance = `
CURRENT CONTEXT: Global
- User is in a general area
- You can suggest any appropriate action based on their request
`;
}
```

## Benefits

### 1. Cleaner Logs
- No more repeated `[AIChat] Final productId: null` logs
- Logs now show context type: `contextType: 'assets'`

### 2. Better Performance
- Product diagnostics only loaded when needed
- Faster AI responses in Assets/Settings pages

### 3. More Accurate AI Responses
- AI knows the context and suggests appropriate actions
- In Assets page: suggests CREATE_COLOR_PALETTE, CREATE_FONT_GROUP
- In Settings page: suggests UPDATE_SETTINGS, UPDATE_DESIGNER_SETTINGS
- In Product page: suggests UPDATE_CONFIG, ADD_ELEMENT

### 4. Prevents Errors
- AI won't try to create product-specific actions in Assets page
- AI won't try to create assets with productId (assets are global)

## Context Types

### 1. Product Context (`type: 'product'`)
**When**: User is in `/designer/:productId` or product configuration page

**AI Behavior**:
- Loads product diagnostics and optimizations
- Suggests product-specific actions: UPDATE_CONFIG, ADD_ELEMENT, ADD_SIDE
- Can also suggest asset and settings actions

**Example Prompts**:
- "Change canvas to A4 size"
- "Add a text tool"
- "Enable grid in designer"

### 2. Assets Context (`type: 'assets'`)
**When**: User is in `/assets` page

**AI Behavior**:
- Does NOT load product diagnostics
- Focuses on asset actions: CREATE_COLOR_PALETTE, CREATE_FONT_GROUP, CREATE_ASSET
- Does NOT suggest product-specific actions

**Example Prompts**:
- "Create a color palette with red, blue, green"
- "Add a font group with Inter and Roboto"
- "Delete the old color palette"

### 3. Settings Context (`type: 'settings'`)
**When**: User is in `/settings` page

**AI Behavior**:
- Does NOT load product diagnostics
- Focuses on settings actions: UPDATE_SETTINGS, UPDATE_DESIGNER_SETTINGS
- Uses `productId: 'GLOBAL'` for global settings

**Example Prompts**:
- "Change designer layout to modal"
- "Enable grid and rulers"
- "Set default canvas size to A4"

### 4. Global Context (`type: 'global'`)
**When**: User is in any other page

**AI Behavior**:
- Does NOT load product diagnostics
- Can suggest any appropriate action based on request
- Asks for clarification if needed

## Testing

### Test 1: Assets Page Context
1. Navigate to `/assets` page
2. Open AI Chat
3. Send message: "Create a color palette with red and blue"
4. Check logs: Should show `contextType: 'assets'`
5. AI should suggest CREATE_COLOR_PALETTE action

### Test 2: Settings Page Context
1. Navigate to `/settings` page
2. Open AI Chat
3. Send message: "Enable grid in designer"
4. Check logs: Should show `contextType: 'settings'`
5. AI should suggest UPDATE_DESIGNER_SETTINGS action

### Test 3: Product Page Context
1. Navigate to `/designer/123` page
2. Open AI Chat
3. Send message: "Change canvas to A4"
4. Check logs: Should show `contextType: 'product', productId: '123'`
5. AI should suggest UPDATE_CONFIG action

## Files Changed

### Frontend
- `frontend/src/components/ai/AIChat.tsx`
  - Added context type detection
  - Updated chat request to include context type

### Backend
- `backend/services/ai/core/aiService.js`
  - Added context type handling
  - Added context-specific AI guidance
  - Conditional loading of product diagnostics

## Related Issues

- Fixes repeated `[AIChat] Final productId: null` logs
- Improves AI response accuracy in Assets/Settings pages
- Prevents AI from suggesting inappropriate actions

## Future Enhancements

1. **Context-Specific Suggestions**: Show different quick prompts based on context
2. **Context Switching**: Allow user to switch context manually
3. **Multi-Context Actions**: Support actions that span multiple contexts
4. **Context History**: Remember user's last context

---

**Status**: ✅ Fixed and Deployed  
**Backend**: Restarted at 10:50 UTC  
**Frontend**: Updated (requires rebuild)
