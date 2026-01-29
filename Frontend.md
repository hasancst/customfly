# Frontend Architecture & Shopify Integration

## 📋 Daftar Isi
- [Overview](#overview)
- [Arsitektur Saat Ini](#arsitektur-saat-ini)
- [Arsitektur Target](#arsitektur-target)
- [Gap Analysis](#gap-analysis)
- [Implementation Plan](#implementation-plan)
- [Task Breakdown](#task-breakdown)
- [Verification](#verification)

---

## Overview

### Tujuan
Memisahkan frontend menjadi dua aplikasi terpisah:
1. **Admin App**: Untuk merchant (Shopify embedded app dengan Polaris)
2. **Public App**: Untuk customer di storefront (custom layout, tanpa Polaris)

### Manfaat
- ✅ **Performance**: Bundle size lebih kecil untuk public app
- ✅ **Maintainability**: Kode lebih terorganisir dan mudah di-maintain
- ✅ **User Experience**: UI yang optimal untuk setiap use case
- ✅ **Scalability**: Mudah untuk add features tanpa affect app lain

---

## Arsitektur Saat Ini

### File Structure
```
frontend/
├── index.html                    # Entry point (Admin only)
├── src/
│   ├── main.tsx                  # Render App.tsx
│   ├── App.tsx                   # Admin app (Polaris + App Bridge)
│   ├── pages/
│   │   ├── PublicApp.tsx         # Public app (sudah ada tapi no entry)
│   │   ├── Designer.tsx          # Admin designer
│   │   ├── AdminDashboard.tsx
│   │   ├── Pricing.tsx
│   │   └── ...
│   └── components/
│       ├── public/               # Public components
│       │   ├── EmbeddedView.tsx
│       │   ├── ModalView.tsx
│       │   ├── WizardView.tsx
│       │   └── PriceDisplay.tsx
│       └── ...
```

### Masalah
❌ `PublicApp.tsx` tidak punya entry point sendiri  
❌ Build hanya menghasilkan satu bundle (admin + public)  
❌ Public app masih load Polaris dependencies (tidak efisien)  
❌ Tidak ada layout separation antara admin dan public  

---

## Arsitektur Target

### Build Output
```
dist/
├── index.html                    # Admin app entry
├── public.html                   # Public app entry
├── assets/
│   ├── admin-[hash].js          # Admin bundle (dengan Polaris)
│   ├── public-[hash].js         # Public bundle (tanpa Polaris)
│   ├── admin-chunks/            # Admin code splits
│   └── public-chunks/           # Public code splits
```

### Routing Structure

#### Admin App (Shopify Embedded)
```
https://custom.duniasantri.com/?shop=store.myshopify.com&host=xxx

Routes:
  /dashboard              → Product management
  /pricing                → Pricing configuration
  /assets                 → Asset library
  /settings               → Shop settings
  /designer/:productId    → Product designer (admin)
```

#### Public App (Storefront)
```
https://custom.duniasantri.com/public.html?shop=store.myshopify.com&productId=xxx

Routes:
  /public/designer/embedded/:productId   → Inline designer
  /public/designer/modal/:productId      → Modal designer
  /public/designer/wizard/:productId     → Wizard flow
```

---

## Gap Analysis

### ✅ Yang Sudah Ada

#### 1. Public Components
- `EmbeddedView.tsx` - Designer inline di product page
- `ModalView.tsx` - Full-screen modal designer
- `WizardView.tsx` - Step-by-step customization
- `PriceDisplay.tsx` - Real-time pricing display

#### 2. Public API (Backend)
- ✅ `POST /imcst_public_api/pricing/calculate` - Hitung harga
- ✅ `GET /imcst_public_api/shop/currency/:shop` - Ambil currency

#### 3. Admin Features
- ✅ Product configuration
- ✅ Pricing management
- ✅ Asset management
- ✅ Global settings

---

### ❌ Yang Masih Kurang

#### 1. Frontend Build & Entry Points
- [ ] `public.html` - Public app entry point
- [ ] `main-public.tsx` - Public app initialization
- [ ] Vite multi-entry build configuration
- [ ] Layout separation (PublicLayout vs Polaris Frame)

#### 2. Public API Endpoints (Backend)
- [ ] `GET /imcst_public_api/config/:shop/:productId` - Product config
- [ ] `GET /imcst_public_api/design/:shop/:productId` - Design template
- [ ] `POST /imcst_public_api/upload` - Upload design image
- [ ] CORS configuration untuk Shopify domains

#### 3. Shopify Integration
- [ ] App Embed extension (`extensions/app-embed/`)
- [ ] Script loading logic untuk storefront
- [ ] Add to Cart workflow
- [ ] Custom properties integration (`_Design`, `_CustomizationData`)

#### 4. State Management
- [ ] Context API untuk public app
- [ ] Shared state antara components
- [ ] Cart integration state

---

## Implementation Plan

### Phase 1: Frontend Separation & Build (Week 1)

#### 1.1 Entry Points
**Files to Create:**
- `frontend/public.html`
- `frontend/src/main-public.tsx`

**Files to Modify:**
- `frontend/vite.config.ts` - Add multi-entry build

**Expected Output:**
```bash
npm run build
# Output:
# dist/index.html (admin)
# dist/public.html (public)
# dist/assets/admin-*.js
# dist/assets/public-*.js
```

#### 1.2 Layout Components
**Files to Create:**
- `frontend/src/components/layouts/PublicLayout.tsx`
- `frontend/src/components/layouts/PublicHeader.tsx`
- `frontend/src/components/layouts/PublicFooter.tsx`

**Design:**
```
┌─────────────────────────────────────┐
│  [LOGO]  Product Name    [CART: 0] │ ← PublicHeader
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┬─────────────────┐│
│  │              │  Tools Panel    ││
│  │   Canvas     │  - Text         ││
│  │   Area       │  - Image        ││
│  │              │  - Shapes       ││
│  │              ├─────────────────┤│
│  │              │  Price Display  ││
│  └──────────────┴─────────────────┘│
│                                     │
│  [Continue Shopping]  [Add to Cart]│
└─────────────────────────────────────┘
```

#### 1.3 Update PublicApp
**Files to Modify:**
- `frontend/src/pages/PublicApp.tsx` - Wrap dengan PublicLayout

**Changes:**
```typescript
// Before: No layout
<EmbeddedView productId={id} shop={shop} />

// After: With layout
<PublicLayout showHeader={false}>
  <EmbeddedView productId={id} shop={shop} />
</PublicLayout>
```

---

### Phase 2: Public API Completion (Week 1-2)

#### 2.1 Backend Dependencies
**Install:**
```bash
cd backend
npm install cors
```

#### 2.2 Public Endpoints
**Files to Modify:**
- `backend/server.js`

**Endpoints to Add:**
```javascript
// 1. Product Configuration
GET /imcst_public_api/config/:shop/:productId
Response: {
  safeArea: { width, height },
  allowedTools: ['text', 'image', 'shape'],
  maxElements: 50,
  pricing: { ... }
}

// 2. Design Template
GET /imcst_public_api/design/:shop/:productId
Response: {
  template: {
    id, elements, canvasSettings
  }
}

// 3. Image Upload
POST /imcst_public_api/upload
Body: { shop, productId, imageDataURL }
Response: { publicUrl }
```

#### 2.3 Database Schema
**Files to Modify:**
- `backend/prisma/schema.prisma`

**Model to Add:**
```prisma
model DesignUpload {
  id        String   @id @default(cuid())
  shop      String
  productId String
  filename  String
  url       String
  size      Int
  createdAt DateTime @default(now())
  
  @@index([shop, productId])
}
```

**Migration:**
```bash
npx prisma db push
```

---

### Phase 3: Shopify Integration (Week 2-3)

#### 3.1 App Embed Extension
**Files to Create:**
- `extensions/app-embed/blocks/designer.liquid`

**Content:**
```liquid
{% schema %}
{
  "name": "Product Designer",
  "target": "body",
  "settings": [
    {
      "type": "select",
      "id": "mode",
      "label": "Designer Mode",
      "options": [
        { "value": "embedded", "label": "Embedded" },
        { "value": "modal", "label": "Modal" },
        { "value": "wizard", "label": "Wizard" }
      ],
      "default": "modal"
    }
  ]
}
{% endschema %}

<script>
  window.IMCST_CONFIG = {
    mode: {{ block.settings.mode | json }},
    shop: {{ shop.permanent_domain | json }},
    productId: {{ product.id | json }},
    backendUrl: 'https://custom.duniasantri.com'
  };
</script>
<script src="https://custom.duniasantri.com/assets/public-[hash].js"></script>
<div id="imcst-designer-root"></div>
```

#### 3.2 Add to Cart Workflow
**Files to Create:**
- `frontend/src/components/public/AddToCartButton.tsx`

**Workflow:**
```typescript
1. Convert canvas to image (html2canvas)
2. Upload to backend → get publicUrl
3. Add to Shopify Cart with properties:
   {
     _Design: publicUrl,
     _CustomizationData: JSON.stringify(elements)
   }
4. Redirect to /cart
```

---

## Task Breakdown

### Phase 1: Frontend Separation (11 tasks)

#### 1.1 Entry Points & Build (4 tasks)
- [ ] Create `frontend/public.html` <!-- id: 101 -->
- [ ] Create `frontend/src/main-public.tsx` <!-- id: 102 -->
- [ ] Update `frontend/vite.config.ts` untuk multi-entry build <!-- id: 103 -->
- [ ] Test build: `npm run build` dan verify output <!-- id: 104 -->

#### 1.2 Layout Components (3 tasks)
- [ ] Create `PublicLayout.tsx` <!-- id: 105 -->
- [ ] Create `PublicHeader.tsx` <!-- id: 106 -->
- [ ] Create `PublicFooter.tsx` <!-- id: 107 -->

#### 1.3 Update PublicApp (2 tasks)
- [ ] Modify `PublicApp.tsx` untuk use PublicLayout <!-- id: 108 -->
- [ ] Test all modes: embedded, modal, wizard <!-- id: 109 -->

#### 1.4 Verification (2 tasks)
- [ ] Check bundle sizes (public < admin) <!-- id: 110 -->
- [ ] Test dev server untuk both apps <!-- id: 111 -->

---

### Phase 2: Public API (13 tasks)

#### 2.1 Dependencies (2 tasks)
- [ ] Install `cors` package di backend <!-- id: 112 -->
- [ ] Add CORS config ke `server.js` <!-- id: 113 -->

#### 2.2 Endpoints (4 tasks)
- [ ] Implement `GET /imcst_public_api/config/:shop/:productId` <!-- id: 114 -->
- [ ] Implement `GET /imcst_public_api/design/:shop/:productId` <!-- id: 115 -->
- [ ] Implement `POST /imcst_public_api/upload` <!-- id: 116 -->
- [ ] Add static file serving `/uploads` <!-- id: 117 -->

#### 2.3 Database (2 tasks)
- [ ] Add `DesignUpload` model ke schema.prisma <!-- id: 118 -->
- [ ] Run `npx prisma db push` <!-- id: 119 -->

#### 2.4 Verification (5 tasks)
- [ ] Test config endpoint dengan curl <!-- id: 120 -->
- [ ] Test design endpoint <!-- id: 121 -->
- [ ] Test upload endpoint dengan sample image <!-- id: 122 -->
- [ ] Verify CORS dari browser console <!-- id: 123 -->
- [ ] Check uploaded files accessible <!-- id: 124 -->

---

### Phase 3: Shopify Integration (8 tasks)

#### 3.1 App Embed (3 tasks)
- [ ] Create `extensions/app-embed/` structure <!-- id: 125 -->
- [ ] Implement `designer.liquid` block <!-- id: 126 -->
- [ ] Deploy extension ke Shopify Partner <!-- id: 127 -->

#### 3.2 Add to Cart (3 tasks)
- [ ] Create `AddToCartButton.tsx` component <!-- id: 128 -->
- [ ] Implement canvas-to-image conversion <!-- id: 129 -->
- [ ] Integrate dengan Shopify Cart API <!-- id: 130 -->

#### 3.3 Testing (2 tasks)
- [ ] Test full flow di development store <!-- id: 131 -->
- [ ] Verify order details include design URL <!-- id: 132 -->

---

## Verification

### Phase 1 Checklist
```bash
# 1. Build Test
cd frontend
npm run build

# Expected files:
# ✓ dist/index.html
# ✓ dist/public.html
# ✓ dist/assets/admin-*.js
# ✓ dist/assets/public-*.js

# 2. Bundle Size
ls -lh dist/assets/
# Public bundle should be < 50% of admin bundle

# 3. Dev Server
npm run dev
# Visit: http://localhost:5173/public.html
```

### Phase 2 Checklist
```bash
# 1. Test Config Endpoint
curl "http://localhost:3011/imcst_public_api/config/test.myshopify.com/12345"

# 2. Test Upload
curl -X POST http://localhost:3011/imcst_public_api/upload \
  -H "Content-Type: application/json" \
  -d '{"shop":"test.myshopify.com","productId":"123","imageDataURL":"data:image/png;base64,..."}'

# 3. CORS Test (Browser Console)
fetch('https://custom.duniasantri.com/imcst_public_api/config/store.myshopify.com/123')
  .then(r => r.json())
  .then(console.log)
```

### Phase 3 Checklist
- [ ] App Embed visible di Theme Editor
- [ ] Designer loads di product page
- [ ] Add to Cart creates line item dengan design URL
- [ ] Order di Shopify Admin shows design image

---

## Technical Notes

### Bundle Optimization
- **Code Splitting**: Vite otomatis split vendor chunks
- **Tree Shaking**: Remove unused Polaris dari public bundle
- **Lazy Loading**: Load heavy components on demand

### Security
- **CORS**: Whitelist Shopify domains only
- **File Upload**: Validate size, type, sanitize filenames
- **Rate Limiting**: Add untuk upload endpoint (future)

### Performance
- **CDN**: Serve uploaded images via CDN (future)
- **Image Optimization**: Compress uploads (future)
- **Caching**: Add cache headers untuk static assets

---

## Success Metrics

### Phase 1
- ✅ Two separate HTML entry points
- ✅ Two separate JS bundles
- ✅ Public bundle < 50% admin bundle
- ✅ Public layout tanpa Polaris

### Phase 2
- ✅ All 3 public endpoints working
- ✅ CORS allows Shopify stores
- ✅ Upload saves files correctly
- ✅ Public URLs accessible

### Phase 3
- ✅ App Embed deployed
- ✅ Full Add to Cart flow works
- ✅ Orders include design data
- ✅ Production ready

---

## Next Steps

1. **Review & Approve** this plan
2. **Start Phase 1** - Frontend separation
3. **Complete Phase 2** - Public API
4. **Deploy Phase 3** - Shopify integration
5. **Monitor & Optimize** - Performance tuning
