# Direct Product Designer Documentation

## Overview

The **Direct Product Designer** is a specialized mode of the product customizer designed to load directly on the product page without requiring user interaction (like clicking a "Customize" button or opening a modal). It provides a seamless, zero-layout-shift experience for customers to personalize products immediately.

## Key Features

*   **Automatic Initialization**: Loads product configuration and assets immediately upon component mount.
*   **Zero Layout Shift**: Designed to replace the standard product image gallery seamlessly.
*   **Independent State**: Uses an isolated instance of `useCanvasState` to prevent conflicts with other customizer instances (e.g., admin or modal).
*   **URL Synchronization**: Automatically syncs selected variants with the URL query parameters (`?variant=...`).
*   **Mobile-Optimized**: Features a responsive design with a collapsible bottom sheet for tools on mobile devices.
*   **Direct "Add to Cart"**: bypasses the standard form submission and adds the customized product directly to the Shopify cart via API.

## Architecture

### Component: `DirectProductDesigner.tsx`

Located in `frontend/src/pages/DirectProductDesigner.tsx`, this is the core component.

#### Props
*   `productId` (string): The Shopify product ID.
*   `shop` (string): The shop domain (e.g., `my-shop.myshopify.com`).

#### State Management
It utilizes the `useCanvasState` hook to manage:
*   **Pages**: Sides of the product (e.g., Front, Back).
*   **Elements**: Text, images, and other design elements on the canvas.
*   **History**: Undo/Redo functionality.
*   **Selection**: Currently selected element for editing.

#### Data Fetching
Data is fetched in parallel on mount:
1.  **Config**: `/imcst_public_api/public/config/:productId`
2.  **Assets**: `/imcst_api/public/assets` (Fonts, Colors)

### Integration: `main-public.tsx`

The entry point (`frontend/src/main-public.tsx`) determines which mode to render based on the `data-mode` attribute of the root element:

```tsx
if (mode === 'direct') {
    // Renders DirectProductDesigner
} else {
    // Renders Standard Layout (Modal/Button)
}
```

### Tools Integration

The designer integrates specific tools for customization:
*   **TextTool**: For adding and editing text, including monograms and curved text.
*   **ImageTool**: For uploading images and selecting from galleries.

## Usage

### 1. Shopify App Block Integration

Because Shopify enforces App Blocks for modern themes (OS 2.0), you should create two separate blocks in your App Extension:

#### **A. Block: Direct Customize Canvas**
*File: `blocks/direct-canvas.liquid`*
This block replaces the product image gallery.
```liquid
<div 
  class="customfly-canvas"
  data-product-id="{{ product.id }}"
  data-shop="{{ shop.permanent_domain }}"
  data-mode="inline" 
  style="width: 100%; aspect-ratio: 1/1; background: #fff;"
>
  {% comment %} Fallback for when JS is disabled {% endcomment %}
  <img src="{{ product.featured_image | img_url: 'large' }}" alt="{{ product.title }}" style="width: 100%; height: auto;">
</div>

{% schema %}
{
  "name": "Direct Canvas",
  "target": "section",
  "templates": ["product"],
  "settings": []
}
{% endschema %}
```

#### **B. Block: Direct Customize Area**
*File: `blocks/direct-area.liquid`*
This block displays the customization tools (Text/Image) and variant selectors. Place this in the Product Information section.
```liquid
<div class="customfly-area"></div>

{% schema %}
{
  "name": "Direct Options Area",
  "target": "section",
  "templates": ["product"],
  "settings": []
}
{% endschema %}
```

### 2. Implementation Logic
The designer automatically detects these blocks:
1.  **Detection**: The script looks for `.customfly-canvas`. If found, it initializes the `DirectProductDesigner`.
2.  **Splitting**: It then looks for `.customfly-area`. If that block exists, it "portals" the tools into it.
3.  **Fallback**: If `.customfly-area` is missing, the tools will appear inside the `.customfly-canvas` container (mobile/tablet optimized).

### 2. Handling Theme Images
If you want to keep your theme's image but hide it ONLY when the designer is active, you can use the helper class that the designer adds to the `<body>`:

```css
/* Hide theme's main image container when designer is active */
body.imcst-split-mode-active .your-theme-image-container-class {
    display: none !important;
}
```

### 3. URL Parameters
*   `variant`: Pre-selects a specific variant ID. Example: `?variant=123456789`
*   `utm_source`: Handled by standard analytics.

## Development

### Adding New Tools

To add a new tool (e.g., Shapes):
1.  Import the tool component in `DirectProductDesigner.tsx`.
2.  Add a button in the "Tools Grid" section to activate it.
3.  Render the tool in the "Active Tool Panel" (AnimatePresence) conditional block.

### Customizing the UI

The UI is built with Tailwind CSS. Key sections:
*   **Canvas Area**: The central `div` with `relative overflow-hidden`.
*   **Controls Panel**: The bottom `div` (fixed on mobile, relative sidebar on desktop).

## API Endpoints

*   **GET /config/:id**: Returns `{ config, product }`.
*   **GET /assets**: Returns list of fonts, colors, etc.
*   **POST /design**: Saves the JSON state of the design.
*   **POST /cart/add.js**: Shopify AJAX API to add item to cart.
