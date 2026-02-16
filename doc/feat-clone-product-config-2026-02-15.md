# Feature: Clone Product Configuration from URL

**Date**: 2026-02-15  
**Status**: 🚧 Planning  
**Priority**: 💡 Enhancement

## Overview

Fitur untuk menganalisis produk customizable dari website lain dan membuat konfigurasi serupa menggunakan element dan option yang sudah ada di sistem Customfly.

## Use Cases

### 1. Competitor Analysis
Merchant ingin melihat bagaimana kompetitor mengatur customization dan membuat versi serupa.

### 2. Migration from Other Apps
Merchant pindah dari Product Personalizer atau app lain ke Customfly, ingin clone konfigurasi existing.

### 3. Quick Setup
Merchant menemukan produk dengan customization yang bagus, ingin setup serupa tanpa konfigurasi manual.

## User Flow

### Step 1: Input URL
```
Admin → Products → Select Product → "Clone Configuration"
↓
Modal: "Enter product URL to clone"
Input: https://product-personalizer.myshopify.com/products/custom-pillow
Button: "Analyze"
```

### Step 2: Analysis
```
System analyzes:
- Product images
- Customization options
- Text fields
- Color pickers
- Image uploads
- Dropdowns
- Checkboxes
```

### Step 3: Mapping
```
Detected Options → Map to Customfly Elements

Example:
✓ "Add Text" → Text Tool
✓ "Choose Color" → Swatch Tool  
✓ "Upload Image" → Image Tool
✓ "Select Font" → Dropdown Tool (Font)
✓ "Add Monogram" → Monogram Tool
```

### Step 4: Preview
```
Show preview:
- Detected elements
- Mapped tools
- Suggested configuration
- Missing elements (if any)

User can:
- Edit mappings
- Add/remove elements
- Adjust positions
```

### Step 5: Apply
```
Generate MerchantConfig:
- printArea with detected elements
- Options mapped to existing assets
- Default values
- Validation rules

Apply to current product
```

## Technical Implementation

### Backend API

#### 1. Analyze URL Endpoint
```javascript
POST /imcst_api/clone/analyze
Body: { url: string }

Response: {
  success: boolean,
  data: {
    productTitle: string,
    productImage: string,
    detectedElements: [
      {
        type: 'text' | 'image' | 'color' | 'dropdown' | 'monogram',
        label: string,
        defaultValue: any,
        position: { x: number, y: number },
        properties: object
      }
    ],
    suggestions: {
      canvasSize: { width: number, height: number },
      baseImage: string,
      elements: CanvasElement[]
    }
  }
}
```

#### 2. Apply Configuration Endpoint
```javascript
POST /imcst_api/clone/apply
Body: {
  productId: string,
  elements: CanvasElement[],
  options: any
}

Response: {
  success: boolean,
  configId: string
}
```

### Frontend Component

```typescript
// CloneConfigModal.tsx
interface CloneConfigModalProps {
  productId: string;
  onClose: () => void;
  onSuccess: (config: any) => void;
}

Steps:
1. URL Input
2. Loading/Analysis
3. Mapping Review
4. Preview
5. Confirmation
```

### Analysis Logic

```javascript
// backend/services/cloneService.js

async function analyzeProductUrl(url) {
  // 1. Fetch HTML
  const html = await fetch(url);
  
  // 2. Parse with Cheerio/JSDOM
  const $ = cheerio.load(html);
  
  // 3. Detect customization elements
  const elements = detectElements($);
  
  // 4. Extract product info
  const productInfo = extractProductInfo($);
  
  // 5. Generate suggestions
  const suggestions = generateSuggestions(elements, productInfo);
  
  return {
    productInfo,
    detectedElements: elements,
    suggestions
  };
}

function detectElements($) {
  const elements = [];
  
  // Detect text inputs
  $('input[type="text"], textarea').each((i, el) => {
    const label = $(el).prev('label').text() || $(el).attr('placeholder');
    elements.push({
      type: 'text',
      label,
      defaultValue: $(el).val()
    });
  });
  
  // Detect color pickers
  $('input[type="color"], .color-picker').each((i, el) => {
    elements.push({
      type: 'color',
      label: $(el).attr('aria-label') || 'Color'
    });
  });
  
  // Detect file uploads
  $('input[type="file"]').each((i, el) => {
    elements.push({
      type: 'image',
      label: $(el).attr('aria-label') || 'Upload Image'
    });
  });
  
  // Detect dropdowns
  $('select').each((i, el) => {
    const label = $(el).prev('label').text();
    const options = [];
    $(el).find('option').each((j, opt) => {
      options.push($(opt).text());
    });
    elements.push({
      type: 'dropdown',
      label,
      options
    });
  });
  
  return elements;
}
```

### Element Mapping

```javascript
// Map detected elements to Customfly tools
function mapToCustomflyElements(detectedElements, existingAssets) {
  return detectedElements.map((detected, index) => {
    const baseElement = {
      id: `cloned-${index}`,
      x: 100 + (index * 50),
      y: 100 + (index * 50),
      width: 200,
      height: 50,
      rotation: 0,
      locked: false
    };
    
    switch (detected.type) {
      case 'text':
        return {
          ...baseElement,
          type: 'text',
          content: detected.defaultValue || 'Your Text',
          fontSize: 24,
          fontFamily: 'Arial',
          color: '#000000',
          tool: 'text'
        };
        
      case 'color':
        return {
          ...baseElement,
          type: 'swatch',
          selectedColor: detected.defaultValue || '#000000',
          tool: 'swatch',
          swatchAssetId: findMatchingAsset(existingAssets.colors, detected.label)
        };
        
      case 'image':
        return {
          ...baseElement,
          type: 'image',
          src: '',
          tool: 'image'
        };
        
      case 'dropdown':
        return {
          ...baseElement,
          type: 'dropdown',
          options: detected.options,
          selectedValue: detected.options[0],
          tool: 'dropdown'
        };
        
      case 'monogram':
        return {
          ...baseElement,
          type: 'monogram',
          letters: ['A', 'B', 'C'],
          tool: 'monogram',
          fontAssetId: findMatchingAsset(existingAssets.fonts, 'monogram')
        };
        
      default:
        return null;
    }
  }).filter(Boolean);
}
```

## UI Design

### Clone Button
```tsx
<Button 
  variant="outline" 
  onClick={() => setShowCloneModal(true)}
>
  <Copy className="w-4 h-4 mr-2" />
  Clone Configuration
</Button>
```

### Clone Modal
```tsx
<Dialog open={showCloneModal} onOpenChange={setShowCloneModal}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Clone Product Configuration</DialogTitle>
      <DialogDescription>
        Analyze a product from another website and create similar configuration
      </DialogDescription>
    </DialogHeader>
    
    {step === 'input' && (
      <div className="space-y-4">
        <Label>Product URL</Label>
        <Input 
          placeholder="https://example.com/products/custom-item"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={handleAnalyze}>
          Analyze Product
        </Button>
      </div>
    )}
    
    {step === 'analyzing' && (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        <p className="mt-4">Analyzing product configuration...</p>
      </div>
    )}
    
    {step === 'mapping' && (
      <div className="space-y-4">
        <h3>Detected Elements ({detectedElements.length})</h3>
        {detectedElements.map((element, i) => (
          <div key={i} className="border p-4 rounded">
            <div className="flex items-center justify-between">
              <div>
                <Badge>{element.type}</Badge>
                <span className="ml-2">{element.label}</span>
              </div>
              <Select 
                value={mappings[i]} 
                onValueChange={(v) => updateMapping(i, v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Tool</SelectItem>
                  <SelectItem value="image">Image Tool</SelectItem>
                  <SelectItem value="swatch">Swatch Tool</SelectItem>
                  <SelectItem value="monogram">Monogram Tool</SelectItem>
                  <SelectItem value="dropdown">Dropdown Tool</SelectItem>
                  <SelectItem value="skip">Skip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        <Button onClick={handleApply}>
          Apply Configuration
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>
```

## Limitations & Considerations

### 1. Legal & Ethical
- ⚠️ **Copyright**: Tidak boleh copy exact design/images
- ⚠️ **Terms of Service**: Beberapa website melarang scraping
- ✅ **Solution**: Hanya analyze structure, bukan copy content

### 2. Technical
- Website dengan JavaScript heavy (React/Vue) sulit di-scrape
- Customization yang complex mungkin tidak terdeteksi sempurna
- Perlu manual adjustment setelah clone

### 3. Privacy
- Tidak store data dari website lain
- Hanya analyze dan generate config
- User bertanggung jawab atas penggunaan

## Alternative Approach: AI-Powered Analysis

Gunakan AI (GPT-4 Vision atau Claude) untuk analyze screenshot:

```javascript
async function analyzeWithAI(screenshotUrl) {
  const prompt = `
    Analyze this product customization page and identify:
    1. What customization options are available?
    2. What type of inputs (text, color, image, dropdown)?
    3. Suggested layout and positioning
    
    Return JSON format with detected elements.
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: screenshotUrl } }
      ]
    }]
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

## Implementation Phases

### Phase 1: Basic URL Analysis (Week 1-2)
- [ ] Backend scraping service
- [ ] Element detection logic
- [ ] Basic mapping to Customfly tools
- [ ] Simple UI for URL input

### Phase 2: Smart Mapping (Week 3-4)
- [ ] AI-powered element detection
- [ ] Automatic asset matching
- [ ] Position estimation
- [ ] Preview before apply

### Phase 3: Advanced Features (Week 5-6)
- [ ] Screenshot analysis (AI Vision)
- [ ] Multi-page support
- [ ] Variant detection
- [ ] Template library

### Phase 4: Polish (Week 7-8)
- [ ] Error handling
- [ ] User feedback
- [ ] Documentation
- [ ] Video tutorials

## Success Metrics

- **Time Saved**: Setup time reduced from 30 min → 5 min
- **Accuracy**: 80%+ elements detected correctly
- **Adoption**: 50%+ merchants use clone feature
- **Satisfaction**: 4.5+ star rating

## Related Features

- Import/Export Configuration
- Template Marketplace
- AI Configuration Assistant
- Bulk Product Setup

## Notes

- Start with simple HTML scraping
- Add AI analysis later for better accuracy
- Focus on common patterns first
- Allow manual editing always
- Respect copyright and ToS

