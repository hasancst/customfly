# Store Templates Feature - Planning Document

## Implementation Summary (2026-02-17)

### ✅ What's Been Implemented

1. **Database Schema** - DesignTemplate model created with fields:
   - id, shop, name, description
   - paperSize, unit, customPaperDimensions
   - pages (design data), thumbnail, tags
   - createdAt, updatedAt

2. **Backend API** - Complete CRUD endpoints:
   - GET /imcst_api/templates - List all templates
   - GET /imcst_api/templates/:id - Get template details
   - POST /imcst_api/templates - Create template
   - PUT /imcst_api/templates/:id - Update template
   - DELETE /imcst_api/templates/:id - Delete template
   - POST /imcst_api/templates/:id/duplicate - Duplicate template
   - POST /imcst_api/templates/:id/apply-to-product - Apply to product

3. **Designer Integration** - Existing Designer now supports:
   - "Save on this product" (saveType: 'product') - Saves to SavedDesign
   - "Save on store" (saveType: 'global') - Saves to DesignTemplate
   - Templates automatically appear in Store Templates page

4. **Frontend Pages**:
   - Store Templates page (/templates) - List, view, edit, delete templates
   - Navigation menu item added below "Products"
   - Template designer uses existing Designer component

### 🎯 How It Works

**Creating a Template:**
1. Go to Products → Select any product → Open Designer
2. Design your template
3. Click Save → Select "Store Template"
4. Template saved to DesignTemplate table
5. Appears in Store Templates page

**Using a Template:**
1. Go to Store Templates page
2. Click template to edit/view
3. Opens in Designer
4. Can be applied to products (Phase 4 - not yet implemented)

### 📋 Next Steps (Phase 4)

- Add "Load Template" button in product designer
- Create modal to select from available templates
- Implement template loading into product canvas
- Add apply template to multiple products feature

---

## Overview
Memisahkan template designs dari products menjadi area tersendiri yang disebut "Store Templates". Template ini bisa dibuat, diberi nama, dan di-load ke product lain untuk digunakan ulang.

## Current State
- Saat ini template design tercampur dengan product designs
- Tidak ada cara untuk membuat template yang bisa digunakan ulang
- Setiap product harus di-design dari awal

## Proposed Solution

### 1. New Menu: "Store Templates"
**Location**: Di bawah menu "Products" di sidebar admin

**Purpose**: 
- Area khusus untuk membuat dan manage design templates
- Template bisa digunakan di berbagai products
- Memudahkan konsistensi design across products

### 2. Store Templates Page Features

#### A. Template List View
- **Table/Grid Display** dengan columns:
  - Template Name (editable)
  - Preview Thumbnail
  - Canvas Size (e.g., "1000x1000 px")
  - Elements Count (e.g., "5 elements")
  - Created Date
  - Last Modified
  - Actions (Edit, Duplicate, Delete, Apply to Product)

#### B. Create New Template
- **Button**: "Create New Template"
- **Flow**:
  1. Click button → Open designer (sama seperti product designer)
  2. Design template dengan canvas kosong
  3. Save dengan nama template
  4. Template tersimpan di Store Templates list

#### C. Edit Template
- Click template → Open designer
- Edit design
- Save changes
- Template updated

#### D. Apply Template to Product
- **From Template List**:
  - Click "Apply to Product" button
  - Modal muncul dengan list products
  - Select product(s) to apply template
  - Confirm → Template di-copy ke product(s)

- **From Product Designer**:
  - Button "Load Template" di product designer
  - Modal muncul dengan list templates
  - Select template
  - Confirm → Template elements di-load ke product canvas

### 3. Database Schema Changes

#### New Table: `DesignTemplate`
```prisma
model DesignTemplate {
  id          String   @id @default(uuid())
  shop        String
  name        String   // Template name (user-defined)
  description String?  // Optional description
  
  // Canvas Settings
  paperSize   String   @default("Custom")
  unit        String   @default("px")
  customPaperDimensions Json? // {width, height}
  
  // Design Data
  pages       Json     // Same structure as Design.pages
  
  // Metadata
  thumbnail   String?  // Preview image URL
  tags        String[] // For categorization
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([shop])
  @@index([shop, name])
}
```

#### Relationship with Products
- Templates are **independent** from products
- When applied, template data is **copied** to product config
- Changes to template don't affect products that already use it
- Products can be updated to use latest template version manually

### 4. API Endpoints

#### Template Management
```
GET    /api/templates                    - List all templates
GET    /api/templates/:id                - Get template details
POST   /api/templates                    - Create new template
PUT    /api/templates/:id                - Update template
DELETE /api/templates/:id                - Delete template
POST   /api/templates/:id/duplicate      - Duplicate template
```

#### Template Application
```
POST   /api/templates/:id/apply-to-product
       Body: { productId: string }
       - Apply template to specific product

POST   /api/templates/:id/apply-to-products
       Body: { productIds: string[] }
       - Apply template to multiple products
```

### 5. UI Components

#### A. StoreTemplates.tsx (Main Page)
- Template list/grid view
- Search and filter
- Create/Edit/Delete actions
- Apply to product modal

#### B. TemplateDesigner.tsx
- Reuse existing DesignerCore component
- Modified for template mode (no product-specific features)
- Save as template instead of product config

#### C. TemplateSelector.tsx (Modal)
- Used in product designer
- Shows template list with previews
- Select and load template

#### D. ApplyTemplateModal.tsx
- Shows product list
- Multi-select products
- Apply template to selected products

### 6. User Workflows

#### Workflow 1: Create Template
1. Go to "Store Templates" page
2. Click "Create New Template"
3. Designer opens with blank canvas
4. Design template (add text, images, shapes, etc.)
5. Click "Save Template"
6. Enter template name and description
7. Template saved and appears in list

#### Workflow 2: Apply Template to New Product
1. Go to "Products" page
2. Select product to customize
3. Product designer opens
4. Click "Load Template" button
5. Template selector modal opens
6. Select template from list
7. Template elements loaded to canvas
8. Customize if needed
9. Save product config

#### Workflow 3: Apply Template to Existing Products
1. Go to "Store Templates" page
2. Find template to apply
3. Click "Apply to Product" button
4. Product selector modal opens
5. Select one or multiple products
6. Click "Apply"
7. Confirmation: "Template applied to X products"

#### Workflow 4: Update Template
1. Go to "Store Templates" page
2. Click template to edit
3. Designer opens with template
4. Make changes
5. Save template
6. Option: "Apply updates to products using this template?"
   - If yes: Show product list, select which to update
   - If no: Just save template

### 7. Implementation Phases

#### Phase 1: Database & Backend ✅ COMPLETED
- [x] Create DesignTemplate model in Prisma schema
- [x] Run migration
- [x] Create API endpoints for CRUD operations
- [x] Create API endpoints for template application
- [x] Integrate with existing Designer save flow (saveType: 'global')

#### Phase 2: Frontend - Template Management ✅ COMPLETED
- [x] Create StoreTemplates page
- [x] Add menu item to sidebar
- [x] Implement template list view
- [x] Implement create/edit/delete actions
- [x] Add template preview thumbnails
- [x] Integrate with existing Designer (using saveType: 'global')

#### Phase 3: Frontend - Template Designer ✅ COMPLETED
- [x] Use existing Designer with saveType: 'global'
- [x] Templates saved to DesignTemplate table
- [x] Templates appear in Store Templates page
- [x] Templates can be loaded in product designer

#### Phase 4: Frontend - Template Application (NEXT)
- [ ] Add "Load Template" button to product designer
- [ ] Create TemplateSelector modal
- [ ] Implement load template into product
- [ ] Add confirmation and success messages

#### Phase 5: Testing & Polish
- [ ] Test all workflows
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications
- [ ] Documentation

### 8. Technical Considerations

#### A. Template Compatibility
- **Canvas Size Mismatch**: 
  - If template canvas size ≠ product canvas size
  - Option 1: Scale elements proportionally
  - Option 2: Show warning, let user decide
  - Option 3: Center template on product canvas

#### B. Asset References
- Templates may reference assets (fonts, colors, shapes)
- Ensure assets are available when template is applied
- Option: Copy asset references with template

#### C. Performance
- Generate thumbnails asynchronously
- Cache template list
- Lazy load template previews

#### D. Permissions
- Templates are shop-specific
- Only shop owner can create/edit/delete templates
- Consider: Template sharing between shops (future feature)

### 9. Future Enhancements

#### Phase 2 Features (Future)
- [ ] Template categories/tags
- [ ] Template marketplace (share templates)
- [ ] Template versioning
- [ ] Bulk apply templates
- [ ] Template analytics (usage tracking)
- [ ] Import/Export templates
- [ ] Template preview in different canvas sizes

### 10. Success Metrics

- Number of templates created per shop
- Number of times templates are applied
- Time saved in product setup
- User satisfaction with template feature

## Questions to Clarify

1. **Template Naming**: Should template names be unique per shop?
2. **Template Updates**: When template is updated, should it auto-update products?
3. **Canvas Size**: Should templates enforce specific canvas sizes?
4. **Asset Handling**: Should templates include asset data or just references?
5. **Permissions**: Should there be different permission levels for templates?

## Next Steps

1. Review and approve this plan
2. Clarify questions above
3. Start Phase 1 implementation
4. Create detailed technical specs for each phase

---

**Document Version**: 1.0  
**Created**: 2026-02-17  
**Status**: Planning - Awaiting Approval
