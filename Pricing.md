# Pricing Plan - Product Customization System

## Overview
Comprehensive pricing system supporting multiple charge types, bulk discounts, printing methods (DTG, gang sheets, screen printing), and real-time calculation.

---

## Phase 1: Foundation (Week 1-2)

### Database Schema
- [x] Create `ProductPricingConfig` table/collection
- [x] Add fields for global pricing settings
- [x] Add fields for text pricing configuration
- [x] Add fields for image/element pricing
- [x] Add fields for bulk discount tiers
- [x] Add fields for printing method configurations
- [x] Create database migrations
- [x] Add indexes for performance

### Backend API - Admin Endpoints
- [x] `POST /imcst_api/pricing/config/:productId` - Create pricing config
- [x] `GET /imcst_api/pricing/config/:productId` - Fetch pricing config
- [x] `PUT /imcst_api/pricing/config/:productId` - Update pricing config
- [x] `DELETE /imcst_api/pricing/config/:productId` - Delete pricing config
- [x] Add validation for pricing rules
- [x] Add error handling

### Backend API - Public Endpoints
- [x] `POST /imcst_public_api/pricing/calculate` - Calculate total price
- [x] Implement global fee calculation
- [x] Implement per-character text pricing
- [x] Implement per-field text pricing
- [x] Implement image upload fees
- [x] Return detailed price breakdown
- [ ] Add response caching for performance

### Admin UI - Pricing Configuration
- [x] Create "Pricing Configuration" section in Designer settings
- [x] Add toggle for global base fee
- [x] Add input for global fee amount
- [x] Add text pricing mode selector (free/per-field/per-character)
- [x] Add per-character price input
- [x] Add free characters allowance input
- [x] Add min/max charge inputs
- [x] Add image upload fee input
- [x] Add save/cancel buttons
- [x] Add form validation
- [ ] Show pricing preview

### Customer UI - Price Display
- [x] Create price calculator component
- [x] Show base product price
- [x] Show global customization fee
- [x] Show per-element charges breakdown
- [x] Show subtotal
- [x] Update price on element changes
- [x] Add loading states
- [x] Format currency properly

---

## Phase 2: Bulk Discounts & Printing Methods (Week 3-4)

### Bulk Discount System
- [x] Create bulk tier management UI
- [x] Add "Add Tier" button
- [x] Add tier configuration form (min/max quantity, discount %)
- [x] Implement tier validation (no overlaps)
- [x] Add tier reordering
- [x] Add tier deletion
- [x] Update calculation API to apply bulk discounts
- [x] Show bulk discount in price breakdown
- [x] Display savings amount to customer

### DTG Printing
- [x] Add DTG pricing configuration UI
- [x] Add base price input
- [x] Add size multiplier inputs (S/M/L/XL)
- [ ] Add color mode selector (full color/limited)
- [x] Implement DTG cost calculation
- [ ] Add DTG to printing method selector
- [x] Show DTG price in breakdown

### Gang Sheet Pricing
- [x] Add gang sheet configuration UI
- [x] Add base price input (Price per sheet)
- [x] Add setup fee input
- [x] Add designs per sheet input
- [x] Implement gang sheet calculator logic
- [x] Calculate designs per sheet
- [x] Calculate cost per design
- [ ] Add gang sheet to printing method selector
- [ ] Show gang sheet savings vs DTG

### Screen Printing
- [x] Add screen print configuration UI
- [x] Add setup fee per color input
- [x] Add price per print input
- [ ] Add minimum quantity input
- [ ] Implement color detection from design
- [x] Calculate total setup fees
- [x] Calculate per-unit cost
- [ ] Add screen print to printing method selector
- [ ] Show break-even quantity analysis

### Printing Method Selector (Customer UI)
- [ ] Create printing method comparison table (PENDED)
- [x] Show recommended method based on quantity (Backend)
- [x] Show price for each method (Backend API ready)
- [ ] Show production time estimates
- [ ] Allow customer to select preferred method (PENDED)
- [x] Update total price on method change (Backend API ready)
- [ ] Add method descriptions/tooltips

---

## Phase 3: Advanced Features (Week 5-6)

### Dynamic Pricing Rules
- [x] Create rule builder UI
- [x] Add condition selector (color count/element count/design area)
- [x] Add operator selector (>/</==/between)
- [x] Add value input
- [x] Add action selector (add fee/multiply/set price)
- [x] Add action value input
- [x] Implement rule evaluation engine
- [x] Apply rules in calculation API
- [x] Show rule-based charges in breakdown
- [ ] Add rule testing/preview

### Gang Sheet Optimizer
- [ ] Implement bin packing algorithm
- [ ] Create layout visualization
- [ ] Calculate optimal sheet usage
- [ ] Show waste percentage
- [ ] Allow manual layout adjustments
- [ ] Export layout for production
- [ ] Show cost savings from optimization

### Real-Time Price Updates
- [x] Implement debounced price calculation
- [ ] Add WebSocket support (optional)
- [x] Create `useLivePricing` hook
- [x] Update price on text changes
- [x] Update price on element add/remove
- [x] Update price on quantity change
- [x] Show loading indicator during calculation
- [x] Handle calculation errors gracefully

### Promo Code Support
- [x] Create promo code database table
- [x] Add promo code CRUD endpoints
- [x] Create promo code management UI
- [x] Add promo code input in customer UI
- [x] Validate promo codes
- [x] Apply promo code discounts
- [x] Show promo code savings
- [x] Track promo code usage

---

## Phase 4: Integration & Testing (Week 7)

### Shopify Integration
- [ ] Add pricing data to cart line items
- [ ] Pass price breakdown as custom properties
- [ ] Update product price in Shopify cart
- [ ] Handle currency conversion
- [ ] Test with different Shopify themes
- [ ] Verify checkout flow

### Testing
- [ ] Test simple text customization pricing
- [ ] Test per-character vs per-field modes
- [ ] Test bulk discount tiers
- [ ] Test DTG pricing with size multipliers
- [ ] Test gang sheet optimization
- [ ] Test screen print setup fees
- [ ] Test dynamic pricing rules
- [ ] Test promo codes
- [ ] Test edge cases (0 quantity, negative prices, etc.)
- [ ] Load testing for calculation API
- [ ] Cross-browser testing

### Documentation
- [ ] Document pricing configuration options
- [ ] Create admin user guide
- [ ] Document API endpoints
- [ ] Add inline help text in UI
- [ ] Create pricing examples/templates
- [ ] Document best practices

---

## Data Models

### ProductPricingConfig
```typescript
{
  productId: string,
  shopifyProductId: string,
  
  // Global
  globalPricing: {
    enabled: boolean,
    basePrice: number,
    currency: string
  },
  
  // Text
  textPricing: {
    mode: 'per_character' | 'per_field' | 'free',
    pricePerCharacter?: number,
    pricePerField?: number,
    minCharge?: number,
    maxCharge?: number,
    freeCharacters?: number
  },
  
  // Images
  imagePricing: {
    uploadFee: number,
    processingFee?: number,
    colorCount?: {
      enabled: boolean,
      pricePerColor: number
    }
  },
  
  // Bulk
  bulkPricing: {
    enabled: boolean,
    tiers: [
      {
        minQuantity: number,
        maxQuantity?: number,
        discountType: 'percentage' | 'fixed_amount',
        discountValue: number
      }
    ]
  },
  
  // Printing
  printingMethods: {
    dtg?: {
      basePrice: number,
      sizeMultipliers: { small: 1.0, medium: 1.2, large: 1.5, xlarge: 1.8 }
    },
    gangSheet?: {
      sheetSize: { width: number, height: number },
      pricePerSheet: number,
      setupFee: number
    },
    screenPrint?: {
      setupFeePerColor: number,
      pricePerPrint: number,
      minQuantity: number
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Calculation Flow

```
1. Base product price (from Shopify)
2. + Global customization fee (if enabled)
3. + Text charges (per character or per field)
4. + Image upload fees
5. + Other element fees
6. + Printing method fee (DTG/Gang/Screen)
7. = Subtotal per unit
8. × Quantity
9. - Bulk discount (if applicable)
10. - Promo code discount (if applicable)
= Final Total
```

---

## Success Metrics

### Phase 1
- [x] Pricing config can be saved and loaded
- [x] Basic price calculation works correctly
- [x] Price displays in customer UI

### Phase 2
- [ ] Bulk discounts apply correctly
- [ ] All 3 printing methods calculate properly
- [ ] Customers can compare printing methods

### Phase 3
- [ ] Dynamic rules work as expected
- [ ] Gang sheet optimizer reduces costs by 20%+
- [ ] Real-time updates respond within 200ms

### Phase 4
- [ ] Shopify cart shows correct prices
- [ ] All tests pass
- [ ] Documentation complete

---

## Notes

### Printing Method Comparison

| Method | Best For | Setup Cost | Per Unit | Colors | Timeline |
|--------|----------|------------|----------|--------|----------|
| DTG | 1-50 pcs | $0 | $8 | Unlimited | 1-2 days |
| Gang Sheet | 20-200 pcs | $10 | $5 | Unlimited | 3-5 days |
| Screen Print | 100+ pcs | $25/color | $3 | 1-4 | 5-7 days |

### Auto-Recommendation Logic
System recommends printing method based on:
- Order quantity
- Number of colors in design
- Customer budget
- Required timeline
