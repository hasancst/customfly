# How to Create Color Palette

**Date**: 2026-02-23  
**Issue**: "No color palettes available" in Mockup Color section

## Problem

When opening a product in designer, the Mockup Color section shows "No color palettes available" because no color assets exist for the shop yet.

## Solution

You need to create at least one color palette first. There are 2 ways:

### Method 1: Using AI Chat (Recommended)

1. Open any page in Customfly admin (Dashboard, Assets, etc.)
2. Click the AI Chat button (bottom right)
3. Send a message like:
   ```
   Create a color palette called "Product Colors" with red, blue, green, yellow, and black
   ```
4. AI will suggest a CREATE_COLOR_PALETTE action
5. Click "Setujui & Jalankan" to execute
6. Color palette will be created and available immediately

**More Examples**:
```
"Create a color palette for t-shirts with white, black, navy, red, and gray"
"Add a color group called 'Pastel Colors' with soft pink, baby blue, mint green, and lavender"
"Make a palette named 'Brand Colors' with #FF5733, #33FF57, #3357FF"
```

### Method 2: Manual Creation (Coming Soon)

Manual color palette creation UI is planned but not yet implemented. For now, use AI Chat method.

## After Creating Color Palette

1. Go to **Settings** → **Designer Settings** (or Global Settings)
2. In the **Assets** section, you'll see dropdowns for:
   - Color Palette
   - Font Group
   - Gallery
   - Options
   - Shapes
3. Select your newly created color palette from the dropdown
4. Click **Save**
5. Now when you open any product designer, the color palette will be available in Mockup Color section

## Assigning Color Palette to Specific Product

If you want different color palettes for different products:

1. Open the product in Designer
2. Click **Summary** tab (right sidebar)
3. Scroll to **Mockup Color** section
4. Toggle it ON
5. Select palette from dropdown
6. Colors will appear below
7. Click any color to apply to mockup

## Verifying Color Palette

To check if color palette was created:

1. Go to **Assets** menu
2. You should see your color palette listed
3. Click on it to view/edit colors

## Troubleshooting

### "No color palettes available" still shows after creating

**Cause**: Color palette created but not assigned to global settings

**Solution**:
1. Go to Settings → Designer Settings
2. Assign the color palette in Assets section
3. Save settings
4. Refresh designer page

### AI creates wrong action type

**Cause**: Prompt is too vague

**Solution**: Use specific prompts:
- ✅ "Create a color palette asset with red, blue, green"
- ✅ "Add a new color group called 'Brand Colors'"
- ❌ "Add colors" (too vague)

## Related Documentation

- `doc/ai-asset-management-ready-2026-02-15.md` - AI asset management guide
- `doc/feat-ai-asset-settings-management-2026-02-15.md` - Detailed AI actions
- `doc/fix-mockup-color-frontend-implementation-2026-02-13.md` - Mockup color feature

---

**Quick Start**:
1. Open AI Chat
2. Say: "Create a color palette called 'My Colors' with red, blue, green, yellow, black, and white"
3. Execute the action
4. Go to Settings → assign the palette
5. Done! Color palette now available in all products
