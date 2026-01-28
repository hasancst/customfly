# CUSTOMER DESIGNER - FRONTEND IMPLEMENTATION PLAN

## 📋 Project Overview
Implementasi 4 layout mode untuk customer product customization dengan integrasi Shopify checkout.

**Status:** 🟡 In Progress  
**Started:** 2026-01-27  
**Target Completion:** 2026-02-03 (7 hari)

---

## 🎯 4 Layout Modes

### 1. ✅ REDIRECT Mode (COMPLETED)
**Status:** ✅ Done
**Use Case:** Produk kompleks (kaos custom, poster, banner)

**Implementation:**
- ✅ Full designer page di `/designer`
- ✅ Public API endpoints
- ✅ Multi-layer support
- ✅ Text, image, shapes, clipart tools
- ✅ Zoom, rulers, safe area

**Remaining Tasks:**
- [x] Add "Add to Cart" button (replace "Save" in public mode)
- [x] Generate preview image (html2canvas)
- [x] Shopify cart integration

---

### 2. ✅ INLINE Mode (COMPLETED)
**Status:** ✅ Done
**Use Case:** Customization sederhana (nama, nomor, warna)

**Features:**
- Form customization di product page
- Live preview canvas
- Text input fields
- Color picker
- Font selector
- No page reload

**Files to Create:**
```
/frontend/src/components/storefront/InlineDesigner.tsx
/frontend/src/components/storefront/InlineForm.tsx
/frontend/src/components/storefront/InlinePreview.tsx
```

**Implementation Steps:**
1. [x] Create InlineDesigner component
2. [x] Create form inputs (text, color, font)
3. [x] Create live preview canvas
4. [x] Add to cart integration
5. [x] Mobile responsive design

---

### 3. ✅ MODAL Mode (COMPLETED)
**Status:** ✅ Done
**Use Case:** Balance antara fitur & UX (mug, tote bag, phone case)

**Features:**
- Popup modal designer
- Medium-sized canvas
- Essential tools only
- Quick customization
- Mobile-friendly

**Files to Create:**
```
/frontend/src/components/storefront/ModalDesigner.tsx
/frontend/src/components/storefront/ModalToolbar.tsx
/frontend/src/components/storefront/ModalCanvas.tsx
```

**Implementation Steps:**
1. [x] Create modal component with overlay
2. [x] Create simplified toolbar
3. [x] Create canvas component
4. [x] Add close/done actions
5. [x] Mobile optimization

---

### 4. ✅ WIZARD Mode (COMPLETED)
**Status:** ✅ Done
**Use Case:** Guided customization (gift items, wedding invitations)

**Features:**
- Step-by-step wizard
- Progress indicator
- Validation per step
- Back/Next navigation
- Beginner-friendly

**Files to Create:**
```
/frontend/src/components/storefront/WizardDesigner.tsx
/frontend/src/components/storefront/WizardStep.tsx
/frontend/src/components/storefront/WizardProgress.tsx
```

**Implementation Steps:**
1. [x] Create wizard container
2. [x] Create step components (template, text, color, review)
3. [x] Create progress indicator
4. [x] Add navigation (back/next)
5. [x] Add validation logic

---

## 🗄️ Database Schema Updates

### MerchantConfig (UPDATED)
```prisma
model MerchantConfig {
  // ... existing fields
  
  // NEW: Layout Configuration
  designerLayout    String   @default("redirect") // "redirect" | "inline" | "modal" | "wizard"
  
  // NEW: Layout-specific settings
  inlineSettings    Json?    // { position: "below-description", showPreview: true }
  modalSettings     Json?    // { width: "800px", height: "600px", theme: "light" }
  wizardSettings    Json?    // { steps: ["template", "text", "color", "review"] }
  
  // NEW: Feature toggles per layout
  enabledTools      Json?    // { text: true, image: true, shapes: false, clipart: true }
  
  // NEW: Button customization
  buttonText        String   @default("Design It")
  buttonStyle       Json?    // { color: "#000", bgColor: "#fff", position: "above-atc" }
}
```

**Status:** ✅ Completed
**Tasks:**
- [x] Update schema.prisma
- [x] Run `prisma db push`
- [x] Run `prisma generate`
- [x] Update backend types

---

### SavedDesign (UPDATED)
```prisma
model SavedDesign {
  // ... existing fields
  
  // NEW: Customer information
  customerId       String?  // Shopify customer ID
  customerEmail    String?  // Email customer
  
  // NEW: Order tracking
  orderId          String?  // Shopify order ID (renamed from shopifyOrderId)
  
  // NEW: Production files
  productionFileUrl String? // URL file produksi (PDF/PNG high-res)
}
```

**Status:** ✅ Completed
**Tasks:**
- [x] Update schema.prisma
- [x] Run migration
- [x] Update API endpoints

---

## 🛠️ Implementation Phases

### ✅ Phase 0: Foundation (COMPLETED)
**Duration:** 1 day  
**Status:** ✅ Done

- [x] Setup public API endpoints
- [x] Create public designer access
- [x] Fix "No shop provided" error
- [x] Implement public/admin mode detection

---

### ✅ Phase 1: Core Infrastructure (COMPLETED)
**Duration:** 2-3 days  
**Status:** ✅ Done

**Tasks:**
- [x] Update MerchantConfig schema with layout fields
- [x] Create Settings UI in Admin for layout selection (Integrated in Dashboard & Designer)
- [x] Create base components for each layout:
  - [x] RedirectDesigner
  - [x] InlineDesigner
  - [x] ModalDesigner
  - [x] WizardDesigner
- [x] Create layout detector for storefront

---

### ⏳ Phase 2: Storefront Integration
**Duration:** 2-3 days  
**Status:** � In Progress (30%)

**Tasks:**
- [x] Create Shopify App Embed/Block
- [x] Create JavaScript SDK for storefront injection
- [x] Implement Add to Cart for all layouts (PostMessage integration)
- [x] Generate preview images (html2canvas polish)
- [x] Handle variant selection

**Files to Create:**
```
/frontend/public/storefront-sdk.js
/frontend/src/storefront/sdk.ts
/frontend/src/storefront/cart-integration.ts
/frontend/src/storefront/preview-generator.ts
```

**SDK Usage Example:**
```javascript
window.IMCSTDesigner.init({
  shop: 'uploadfly-lab.myshopify.com',
  productId: '8203556585506',
  variantId: '44750077034530',
  layout: 'auto' // auto-detect from config
});
```

---

### ⏳ Phase 3: Checkout Integration
**Duration:** 1-2 days  
**Status:** 🔴 Not Started

**Tasks:**
- [x] Save design to database on "Add to Cart"
- [x] Add line item properties to Shopify cart
- [x] Setup Shopify order webhook
- [x] Create order processing flow
- [x] Generate production files (PDF/PNG)

**Line Item Properties Format:**
```json
{
  "properties": {
    "_custom_design_id": "design_123",
    "_custom_design_preview": "https://custom.duniasantri.com/previews/design_123.png",
    "_custom_design_name": "Kaos Custom Saya"
  }
}
```

**Backend Endpoints:**
```
POST /imcst_api/public/cart/add
POST /imcst_api/webhooks/orders/create
GET  /imcst_api/orders/:orderId/design
```

---

### ⏳ Phase 4: Admin Dashboard
**Duration:** 1-2 days  
**Status:** ✅ Completed

**Tasks:**
- [x] Create Orders page with custom designs
- [x] Create Design viewer/editor (Integrated in Designer)
- [x] Add download production files button (High-res export)
- [x] Implement bulk export (Sequential downloads)
- [x] Add order status tracking

**Files to Create:**
```
/frontend/src/pages/Orders.tsx
/frontend/src/components/OrderDesignViewer.tsx
/frontend/src/components/ProductionFileGenerator.tsx
```

---

## 📁 File Structure

```
/www/wwwroot/custom.local/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma (UPDATE)
│   └── server.js (UPDATE)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Designer.tsx (✅ DONE)
│   │   │   ├── Settings.tsx (UPDATE)
│   │   │   └── Orders.tsx (NEW)
│   │   │
│   │   ├── components/
│   │   │   ├── storefront/ (NEW FOLDER)
│   │   │   │   ├── InlineDesigner.tsx
│   │   │   │   ├── ModalDesigner.tsx
│   │   │   │   ├── WizardDesigner.tsx
│   │   │   │   ├── LayoutDetector.tsx
│   │   │   │   └── CartIntegration.tsx
│   │   │   │
│   │   │   └── admin/ (ORGANIZE EXISTING)
│   │   │       ├── OrderDesignViewer.tsx
│   │   │       └── ProductionFileGenerator.tsx
│   │   │
│   │   └── storefront/ (NEW FOLDER)
│   │       ├── sdk.ts
│   │       ├── cart-integration.ts
│   │       └── preview-generator.ts
│   │
│   └── public/
│       └── storefront-sdk.js (NEW - compiled from sdk.ts)
│
└── FRONT.md (THIS FILE)
```

---

## 🎨 UI/UX Specifications

### Settings Page - Layout Selector
```tsx
<Card>
  <CardHeader>
    <CardTitle>Customer Designer Layout</CardTitle>
    <CardDescription>Choose how customers will customize this product</CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup value={designerLayout} onValueChange={setDesignerLayout}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="redirect" id="redirect" />
        <Label htmlFor="redirect">
          <div className="font-medium">Redirect to Full Designer</div>
          <div className="text-sm text-gray-500">Best for complex customization</div>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="inline" id="inline" />
        <Label htmlFor="inline">
          <div className="font-medium">Inline on Product Page</div>
          <div className="text-sm text-gray-500">Simple text/color customization</div>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="modal" id="modal" />
        <Label htmlFor="modal">
          <div className="font-medium">Modal Popup</div>
          <div className="text-sm text-gray-500">Balanced features & UX</div>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="wizard" id="wizard" />
        <Label htmlFor="wizard">
          <div className="font-medium">Step-by-Step Wizard</div>
          <div className="text-sm text-gray-500">Guided customization</div>
        </Label>
      </div>
    </RadioGroup>
  </CardContent>
</Card>
```

---

## 🔌 Shopify Integration

### App Embed Installation
```liquid
<!-- Merchant adds this to their theme.liquid -->
{% if content_for_header contains 'imcst-designer' %}
  <script src="https://custom.duniasantri.com/storefront-sdk.js"></script>
{% endif %}
```

### Product Page Integration
```liquid
<!-- In product.liquid or product-template.liquid -->
<div id="imcst-designer-root" 
     data-product-id="{{ product.id }}"
     data-variant-id="{{ product.selected_or_first_available_variant.id }}"
     data-shop="{{ shop.permanent_domain }}">
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.IMCSTDesigner) {
      window.IMCSTDesigner.init({
        shop: '{{ shop.permanent_domain }}',
        productId: '{{ product.id }}',
        variantId: '{{ product.selected_or_first_available_variant.id }}'
      });
    }
  });
</script>
```

---

## 🧪 Testing Checklist

### Redirect Mode
- [ ] Designer loads correctly from storefront
- [ ] All tools work (text, image, shapes)
- [ ] Add to Cart saves design
- [ ] Preview image generates correctly
- [ ] Design appears in cart with properties
- [ ] Order webhook receives design data

### Inline Mode
- [ ] Form renders on product page
- [ ] Live preview updates in real-time
- [ ] Add to Cart includes customization
- [ ] Mobile responsive
- [ ] Works with different themes

### Modal Mode
- [ ] Modal opens on button click
- [ ] Designer tools work in modal
- [ ] Modal closes on "Done"
- [ ] Design saves correctly
- [ ] Mobile friendly

### Wizard Mode
- [ ] All steps render correctly
- [ ] Navigation works (back/next)
- [ ] Validation prevents skipping
- [ ] Progress indicator accurate
- [ ] Final review shows all choices

---

## 📊 Progress Tracking

### Overall Progress: 100%
```
[████████████████████] 100%
```

### Phase Breakdown:
- Phase 0: Foundation ████████████████████ 100%
- Phase 1: Core Infrastructure ████████████████████ 100%
- Phase 2: Storefront Integration ████████████████████ 100%
- Phase 3: Checkout Integration ████████████████████ 100%
- Phase 4: Admin Dashboard ████████████████████ 100%

---

## 🐛 Known Issues

1. **Designer.tsx lint warnings:**
   - `ShopifyVariant` unused import
   - `ShopifyOption` unused import
   - `POPULAR_GOOGLE_FONTS` unused constant
   - `Crop` unused import
   - `loadedFromDesign` unused variable
   
   **Status:** Low priority, will clean up in Phase 1

---

## 📝 Notes

- Semua layout mode akan share core canvas rendering logic
- Preview generation menggunakan `html2canvas` library
- Production files akan di-generate on-demand saat merchant download
- Customer bisa save draft design (optional, Phase 5)
- Design library untuk customer (optional, Phase 5)

---

## 🚀 Next Immediate Steps

1. [ ] Update `schema.prisma` dengan field layout baru
2. [ ] Run `prisma db push` dan `prisma generate`
3. [ ] Create Settings UI untuk layout selection
4. [ ] Start building InlineDesigner component
5. [ ] Create storefront SDK skeleton

---

**Last Updated:** 2026-01-27 23:26  
**Updated By:** AI Assistant  
**Next Review:** After Phase 1 completion
