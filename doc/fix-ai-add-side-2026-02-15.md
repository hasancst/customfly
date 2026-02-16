# Fix: AI Add Side/Page Feature

**Date**: 2026-02-15  
**Status**: ✅ Complete  
**Issue**: AI incorrectly tried to add "views" field to MerchantConfig when user requested adding a new side (Back)

## Problem

User requested: "add a new back side with name Back"

AI generated action with type `UPDATE_CONFIG` trying to add `views` field to `MerchantConfig`, but:
1. `MerchantConfig` schema doesn't have a `views` field
2. Multiple sides/pages are stored in `SavedDesign.designJson` as an array
3. Execution failed with "Unknown argument `views`" error

## Root Cause

1. AI didn't understand the difference between:
   - `MerchantConfig.printArea.layers` (single flat structure)
   - `SavedDesign.designJson` (array of pages/sides)

2. No executor existed to handle adding/removing sides

## Solution

### 1. Created New Executor: `designExecutor.js`

Location: `backend/services/ai/executors/designExecutor.js`

**Methods**:
- `addSide(shopId, productId, sideData)` - Adds new side/page to SavedDesign
- `removeSide(shopId, productId, sideId)` - Removes side/page from SavedDesign

**Features**:
- Auto-creates SavedDesign if doesn't exist
- Uses MerchantConfig as base for first side
- Prevents removing last side
- Returns previousState for rollback

### 2. Added New Action Types

**ADD_SIDE**: Add a new side/page to the design
```json
{
  "type": "ADD_SIDE",
  "payload": {
    "productId": "8232157511714",
    "side": {
      "id": "back",
      "name": "Back",
      "baseImage": "",
      "elements": []
    }
  }
}
```

**REMOVE_SIDE**: Remove a side/page from the design
```json
{
  "type": "REMOVE_SIDE",
  "payload": {
    "productId": "8232157511714",
    "sideId": "back"
  }
}
```

### 3. Updated AI System Prompt

File: `backend/services/ai/core/aiService.js`

Added `ADD_SIDE` and `REMOVE_SIDE` to action types:
```javascript
"type": "UPDATE_CONFIG | BULK_UPDATE_CONFIG | ADD_ELEMENT | ADD_SIDE | REMOVE_SIDE"
```

### 4. Updated Action Execution Route

File: `backend/routes/ai.routes.js`

Added handlers for new action types:
```javascript
} else if (output.type === 'ADD_SIDE') {
    result = await designExecutor.addSide(
        shop,
        output.payload.productId,
        output.payload.side
    );
} else if (output.type === 'REMOVE_SIDE') {
    result = await designExecutor.removeSide(
        shop,
        output.payload.productId,
        output.payload.sideId
    );
}
```

## Data Structure

### SavedDesign.designJson Structure
```json
[
  {
    "id": "default",
    "name": "Side 1",
    "elements": [...],
    "baseImage": "https://...",
    "baseImageScale": 100,
    "baseImageAsMask": true,
    "baseImageMaskInvert": false,
    "baseImageProperties": {
      "x": 0,
      "y": 0,
      "scale": 1,
      "width": 900,
      "height": 900
    },
    "baseImageColorEnabled": false
  },
  {
    "id": "back",
    "name": "Back",
    "elements": [],
    "baseImage": "",
    "baseImageScale": 100,
    "baseImageAsMask": false,
    "baseImageMaskInvert": false,
    "baseImageProperties": {
      "x": 0,
      "y": 0,
      "scale": 1,
      "width": 1000,
      "height": 1000
    },
    "baseImageColorEnabled": false
  }
]
```

## Testing

User should now be able to:
1. Ask AI: "add a new back side with name Back"
2. AI should generate `ADD_SIDE` action
3. Execute action to add new side to SavedDesign
4. Frontend will display "Side 2" tab

## Files Changed

1. ✅ `backend/services/ai/executors/designExecutor.js` (NEW)
2. ✅ `backend/routes/ai.routes.js` (UPDATED)
3. ✅ `backend/services/ai/core/aiService.js` (UPDATED)
4. ✅ `backend/.env` (AI_PROVIDER=deepseek)
5. ✅ Backend restarted

## Next Steps

User should:
1. Open AI chat in designer
2. Type: "add a new back side with name Back"
3. Review and execute the generated action
4. Verify new side appears in designer

## Notes

- DeepSeek AI provider is now active (70% cheaper than GPT-4)
- Invalid action from previous attempt was deleted
- System now properly distinguishes between config changes and design changes
