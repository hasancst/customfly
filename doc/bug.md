# Bug Fixes & Resolved Issues

This document tracks the bugs and technical issues that have been resolved during the development and refinement of the Product Designer application.

## 🔴 Critical System Issues

### 1. Admin Dashboard Authentication Failure
- **Symptom:** Admin API routes (`/imcst_api/*`) returned HTML redirects or 500 errors instead of JSON data.
- **Root Cause:** Shopify's default `validateAuthenticatedSession` middleware was redirecting failed auth attempts to login pages, and the frontend wasn't consistently sending Session Tokens.
- **Resolution:**
    - Implemented custom JWT validation middleware in `server.js`.
    - Updated frontend `useAuthenticatedFetch` to correctly retrieve and attach Bearer tokens.

### 2. Storefront CORS Blocking
- **Symptom:** Static assets (CSS/JS) failed to load on the Shopify storefront with "Blocked by CORS policy" errors.
- **Root Cause:** The Express server wasn't setting `Access-Control-Allow-Origin` headers for static files served via `express.static`.
- **Resolution:** Added a middleware to inject CORS headers specifically for the `/assets` directory.

### 3. Public Designer "No Host Provided"
- **Symptom:** Clicking "Design It" on the storefront redirected to an error page complaining about missing App Bridge host parameters.
- **Root Cause:** The public designer was trying to initialize Shopify App Bridge which requires a host parameter, but public users don't have one.
- **Resolution:**
    - Created a dedicated public route (`/imcst_public_api/public/*`) that bypasses Shopify App Bridge initialization.
    - Updated `server.js` to serve `public.html` which is optimized for non-authenticated users.

### 4. Asset Loading 400 Errors
- **Symptom:** The storefront loader failed to fetch the main JS bundle, returning `400 Bad Request`.
- **Root Cause:** Providing outdated asset filenames/hashes that were cached by Cloudflare/Shopify CDN.
- **Resolution:** Implemented dynamic cache-busting by appending `?v={timestamp}` to all asset URLs in the storefront loader.

## 🟠 Functional & Logic Bugs

### 5. "Add to Cart" Missing Variant ID
- **Symptom:** Adding a product to cart resulted in a `400 Bad Request` from the Shopify Cart API.
- **Root Cause:** The designer was sending a generic or undefined Variant ID because it wasn't fetching live product variants.
- **Resolution:**
    - Enhanced `DesignerOpenCore` to fetch valid Shopify Variant IDs.
    - Added a Variant Selection Top Bar to let users explicitly choose a variant (Size/Color) before adding to cart.

### 6. Image Addition Redundancy
- **Symptom:** Selecting a new image or uploading a file always created a new layer, leaving the old placeholder or previous image behind.
- **Root Cause:** `ImageTool.tsx` lacked logic to check for a currently selected element.
- **Resolution:** Refactored `handleAddFromGallery` and `processFile` to detect if an image element is selected and **replace** its source instead of adding a new one.

## 🟡 UI/UX Polishing

### 7. Redundant Zoom Controls
- **Symptom:** Designing area had duplicate zoom controls (floating on canvas AND in side panel) and disjointed percentage displays.
- **Resolution:**
    - Removed floating zoom overlay.
    - Centralized zoom controls to the bottom bar.
    - Restored the percentage indicator between the `(+)` and `(-)` buttons.

### 8. Missing "Reset Design" for Customers
- **Symptom:** Customers had no way to clear the canvas and start over.
- **Resolution:** Made the "Reset Design" button conditionally visible in Public Mode (previously Admin only).

### 9. Missing Base Image Controls (Admin)
- **Symptom:** The Base Image settings (color overlay, mask toggle) disappeared from the Admin panel.
- **Root Cause:** Accidentally removed during the Phase 7 UI cleanup/refactor of `Summary.tsx`.
- **Resolution:** Restored the "Base Image" section in the Summary panel, ensuring it is visible only in Admin mode (`!isPublicMode`).

### 10. Data Synchronization Lag (Admin vs Storefront)
- **Symptom:** Design/Config changes saved in Admin weren't appearing in the Storefront for up to 5 minutes.
- **Root Cause:** The public API utilized a `NodeCache` with a 5-minute TTL.
- **Resolution:** Added explicit cache invalidation logic in `server.js`. Product-specific cache is cleared on config save, and the entire cache is flushed for global design updates.

### 11. Missing Safe Area Clipping for Customers
- **Symptom:** The "Edit Zone Radius" (rounding) worked in Admin but didn't affect the final design view for customers.
- **Root Cause:** `showSafeArea` was hardcoded to `false` in `DesignerOpenCore.tsx`, disabling the clipping path entirely.
- **Resolution:**
    - Restored `showSafeArea` from the configuration state.
    - Modified `Canvas.tsx` to conditionally hide the visual overlay (blue guides/handles) while keeping the clipping (rounding) logic active for public users.
