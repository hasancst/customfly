# Feature: AI Unit Configuration Support

**Date**: 2026-02-15  
**Status**: ✅ Complete  
**Request**: Enable AI to configure canvas size units (px, cm, mm, inch)

## Overview

AI can now understand and configure canvas size with different units. This allows merchants to ask AI to set canvas dimensions in their preferred unit without manual conversion.

## Changes Made

### 1. Updated AI System Prompt

**Location**: `backend/services/ai/core/aiService.js`

**Added Unit Options**:
```javascript
"changes": { 
  "paperSize": "Custom", 
  "unit": "cm | mm | inch | px",  // NEW: Added px option
  "customPaperDimensions": { "width": 25, "height": 30 } 
}
```

**Added Unit Conversion Reference**:
```javascript
UNIT CONVERSION REFERENCE:
- px (pixels): Direct pixel values, no conversion (1px = 1px)
- mm (millimeters): 1mm = 3.78px at 96 DPI
- cm (centimeters): 1cm = 37.8px at 96 DPI
- inch (inches): 1in = 96px at 96 DPI
```

**Added Examples**:
```javascript
EXAMPLES:
- "Set canvas to 1000x1000 pixels" → paperSize: "Custom", unit: "px", customPaperDimensions: {width: 1000, height: 1000}
- "Change canvas to 21x29.7cm" → paperSize: "Custom", unit: "cm", customPaperDimensions: {width: 21, height: 29.7}
- "Make it 210x297mm" → paperSize: "Custom", unit: "mm", customPaperDimensions: {width: 210, height: 297}
- "Set to 8.5x11 inches" → paperSize: "Custom", unit: "inch", customPaperDimensions: {width: 8.5, height: 11}
```

### 2. Created Unit Configuration Tests

**Location**: `backend/tests/ai_unit_config.test.js`

**Test Coverage**:
- ✅ Set canvas size in pixels (px)
- ✅ Set canvas size in centimeters (cm)
- ✅ Set canvas size in millimeters (mm)
- ✅ Set canvas size in inches (inch)
- ✅ Update unit without changing dimensions
- ✅ Handle previousState for rollback
- ✅ Validate unit is in allowed list

**All 7 tests passed** ✅

## AI Capabilities

### Natural Language Understanding

AI can now understand various ways merchants express canvas size:

**Pixels**:
- "Set canvas to 1000x1000 pixels"
- "Make it 800 by 600 px"
- "Change size to 1920x1080 pixels"

**Centimeters**:
- "Set canvas to 21x29.7cm"
- "Make it A4 size in centimeters" (21 x 29.7 cm)
- "Change to 10 by 15 cm"

**Millimeters**:
- "Set canvas to 210x297mm"
- "Make it 100mm by 150mm"
- "Change to A4 in millimeters"

**Inches**:
- "Set canvas to 8.5x11 inches"
- "Make it letter size" (8.5 x 11 inch)
- "Change to 4 by 6 inches"

### AI Action Generation

When merchant asks: **"Set canvas to 1000x1000 pixels"**

AI generates:
```json
{
  "type": "UPDATE_CONFIG",
  "description": "Set canvas to 1000x1000 pixels",
  "payload": {
    "target": "merchantConfig",
    "productId": "8232157511714",
    "changes": {
      "paperSize": "Custom",
      "unit": "px",
      "customPaperDimensions": {
        "width": 1000,
        "height": 1000
      }
    }
  }
}
```

### Unit Conversion Intelligence

AI understands standard paper sizes and can convert them:

**A4 Paper**:
- In mm: 210 × 297
- In cm: 21 × 29.7
- In inch: 8.27 × 11.69
- In px: 794 × 1123 (at 96 DPI)

**Letter Paper**:
- In inch: 8.5 × 11
- In mm: 215.9 × 279.4
- In cm: 21.59 × 27.94
- In px: 816 × 1056 (at 96 DPI)

## Usage Examples

### Example 1: Set Canvas in Pixels
```
User: "Set canvas to 1000x1000 pixels"

AI Response:
"I'll set the canvas to 1000×1000 pixels. This gives you a square canvas 
perfect for social media posts or product images."

Action Generated:
- paperSize: "Custom"
- unit: "px"
- customPaperDimensions: { width: 1000, height: 1000 }
```

### Example 2: Set Canvas in Centimeters
```
User: "Change canvas to A4 size in centimeters"

AI Response:
"I'll set the canvas to A4 size (21×29.7cm). This is the standard paper 
size used in most countries."

Action Generated:
- paperSize: "Custom"
- unit: "cm"
- customPaperDimensions: { width: 21, height: 29.7 }
```

### Example 3: Set Canvas in Millimeters
```
User: "Make it 100mm by 150mm"

AI Response:
"I'll set the canvas to 100×150mm. This is a common size for postcards 
and small prints."

Action Generated:
- paperSize: "Custom"
- unit: "mm"
- customPaperDimensions: { width: 100, height: 150 }
```

### Example 4: Set Canvas in Inches
```
User: "Set to letter size"

AI Response:
"I'll set the canvas to Letter size (8.5×11 inches). This is the standard 
paper size used in the United States."

Action Generated:
- paperSize: "Custom"
- unit: "inch"
- customPaperDimensions: { width: 8.5, height: 11 }
```

### Example 5: Change Unit Only
```
User: "Change unit to millimeters"

AI Response:
"I'll change the unit to millimeters. Your current dimensions will remain 
the same but displayed in mm."

Action Generated:
- unit: "mm"
```

## Integration with Frontend

The AI-generated actions work seamlessly with the frontend unit selector:

1. AI generates action with `unit` and `customPaperDimensions`
2. Action is executed via `configExecutor.applyChanges()`
3. Config is saved to database with unit and dimensions
4. Frontend loads config and displays in correct unit
5. Unit dropdown shows selected unit
6. Canvas renders with correct pixel dimensions

## Validation

### Backend Validation
- Unit must be one of: `px`, `cm`, `mm`, `inch`
- Dimensions must be positive numbers
- Both width and height are required for custom size

### Frontend Validation
- Unit selector only shows when paperSize is "Custom"
- Dimensions are converted to pixels for rendering
- Conversion rates are consistent between AI and frontend

## Testing

### Manual Testing Checklist
- [ ] Ask AI: "Set canvas to 1000x1000 pixels"
- [ ] Ask AI: "Change canvas to 21x29.7cm"
- [ ] Ask AI: "Make it 210x297mm"
- [ ] Ask AI: "Set to 8.5x11 inches"
- [ ] Ask AI: "Change unit to millimeters"
- [ ] Verify action is generated correctly
- [ ] Execute action and verify config is saved
- [ ] Reload designer and verify unit is displayed
- [ ] Verify canvas renders with correct dimensions

### Automated Testing
```bash
cd backend
npm test -- ai_unit_config.test.js
```

**Result**: ✅ All 7 tests passed

## Files Changed

1. ✅ `backend/services/ai/core/aiService.js` - Updated system prompt
2. ✅ `backend/tests/ai_unit_config.test.js` - Added unit tests
3. ✅ Backend restarted

## Benefits

1. **Natural Language**: Merchants can use natural language to set canvas size
2. **Unit Flexibility**: Support for px, cm, mm, and inch
3. **No Manual Conversion**: AI handles unit conversion automatically
4. **Consistent**: Same conversion rates as frontend
5. **Validated**: Comprehensive test coverage

## Notes

- AI uses DeepSeek provider (70% cheaper than GPT-4)
- Unit conversion happens at render time in frontend
- Database stores dimensions in the specified unit
- AI can detect unit from context (e.g., "A4" → cm, "Letter" → inch)
- Rollback support included via previousState

## Related Features

- Frontend unit selector (feat-custom-size-unit-selector-2026-02-15.md)
- AI add side feature (fix-ai-add-side-2026-02-15.md)
- AI integration (ai-production-readiness-2026-02-14.md)
