# Color Masking Update & Regression Analysis - 2026-02-10

## Overview
This document outlines the fixes applied to the Base Image (Mockup) Color Masking system and analyzes potential regressions. The goal was to resolve issues where the color overlay was not correctly filling the transparent areas ("holes") of the mockup image or was bleeding outside the intended bounds.

## Changes Implemented

### 1. Robust CSS Masking Logic
**Issue:** The previous implementation relied partially on a container `background-color` approach which caused alignment issues and bleeding at the edges. It also struggled to consistently target either the opaque or transparent areas.

**Fix:**
- Switched completely to an **Overlay Div** strategy within `Canvas.tsx`.
- Removed the `background-color` from the parent container.
- Implemented **Dual Mode Masking** using CSS `mask-image` and `mask-composite`:
    - **Opaque Mode (Tinting):** Uses standard masking to color only the opaque pixels of the image.
      ```css
      mask-image: url(image.png);
      mask-composite: source-over; (add)
      ```
    - **Transparent Mode (Hole Filling):** Uses inverted masking to color only the transparent pixels.
      ```css
      mask-image: linear-gradient(black, black), url(image.png);
      mask-composite: destination-out; (subtract)
      ```
- Added `Math.round()` to mask dimensions/positions to prevent sub-pixel gaps.

### 2. Default Behavior Update
**Request:** "Hide the toggle but set transparent area as default."

**Changes:**
- **Default Mode:** `baseImageColorMode` now defaults to `'transparent'` instead of `'opaque'` in `GlobalSettingsDesigner.tsx`, `DesignerCore.tsx`, and `Canvas.tsx`.
- **UI Changes:** The "Target Transparent Area" toggle in `Summary.tsx` has been hidden (commented out).
- **Effect:** When a user selects a "Mockup Color", it *automatically* fills the transparent holes of the mockup image by default.

## Verification of Fix
- **Alignment:** The color overlay now perfectly matches the image boundaries due to sharing exact dimension logic.
- **Precision:** `translateZ(0)` was added to force hardware acceleration, improving mask rendering sharpness.
- **Public View:** `DirectProductDesigner.tsx` was updated to pass the correct color mode and scale settings to the public component.

## Regression Analysis & Risks

### 1. Loss of "Tinting" Capability (UI Only)
**Risk:** High (for specific use cases).
- **Description:** By hiding the toggle and defaulting to `'transparent'`, users can no longer easily switch to "Opaque Mode" (Tinting).
- **Impact:** If a user wanted to change the color of the *shirt itself* (assuming the shirt is opaque white in the PNG), they can no longer do this via the UI. They can only color the *background* (if transparent).
- **Mitigation:** The code still supports `'opaque'` mode. If this feature is needed back, we simply uncomment the toggle in `Summary.tsx`.

### 2. Browser Compatibility
**Risk:** Low.
- **Description:** We rely heavily on `mask-image` and `mask-composite`.
- **Impact:** Modern browsers (Chrome, Edge, Safari, Firefox) support this well. Older browsers might simply show a solid block or nothing.
- **Mitigation:** We included standard (`mask-*`) and Webkit (`WebkitMask-*`) prefixes. Safari specifically requires `WebkitMaskComposite: destination-out` which is handled.

### 3. Performance
**Risk:** Low/Medium.
- **Description:** CSS Masking is more GPU-intensive than simple background colors.
- **Impact:** On very low-end devices with large, high-res mockups, there might be slight rendering lag during zooming/panning.
- **Mitigation:** Added `transform: translateZ(0)` triggers hardware acceleration to offload this to the GPU.

### 4. Default State Confusion
**Risk:** Low.
- **Description:** Existing saved designs might have `baseImageColorMode` undefined.
- **Impact:** The code defaults undefined to `'transparent'` (in most places) or `'opaque'` (in older saves).
- **Mitigation:** React state initialization in `DesignerCore` and `GlobalSettings` now explicitly defaults to `'transparent'`, so new sessions will work as expected. Old saved sessions might need a re-save to pick up the new default if they relied on the old behavior.
