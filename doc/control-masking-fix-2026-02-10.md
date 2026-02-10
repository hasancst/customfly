# Control Masking Fix - 2026-02-10

## Issue Description
When a Base Image was used as a mask (e.g. "punch through" effect), the interactive controls (resize handles, rotate icon, delete icon, duplicate icon) were also being masked/hidden if they fell outside the transparent area of the mask. This made it difficult or impossible for users to interact with elements that were near the edges or partially clipped.

## Solution Implemented
We implemented a **Dual-Layer Rendering Strategy** in `Canvas.tsx`.

### 1. Layer 1: Masked View Layer (Bottom)
- Renders the actual visible content of the elements.
- The `maskStyle` (e.g. the shirt hole mask) is applied to this container.
- `pointer-events: none` is set to ensure interactions pass through to the layer above.
- Elements are rendered with `renderMode="view"`, which hides all handles and controls.

### 2. Layer 2: Interactive Layer (Top)
- Renders the interactive controls and hit-testing areas.
- **NO mask** is applied to this container, ensuring controls are always fully visible regardless of the mask.
- Elements are rendered with `renderMode="interactive"`:
    - The content (text/image) is rendered with `opacity: 0`. This makes it invisible but preserves the layout for hit-testing and positioning handles.
    - The controls (borders, icons) are rendered normally and are fully interactive.
- `pointer-events: auto` ensures this layer captures clicks and drags.

## Code Changes
- **`DraggableElement.tsx`**: Added `renderMode` prop ('standard', 'view', 'interactive'). logic to handle opacity and pointer events based on mode.
- **`Canvas.tsx`**: Refactored the rendering loop to conditionally render the two layers when masking is active. If masking is disabled, it reverts to standard single-layer rendering.

## Testing Scope
- Verify that elements are visually clipped by the mask (e.g. inside the shirt).
- Verify that selection borders and icons (delete, rotate) appear **OVER** the mask (e.g. extending outside the shirt) and are fully clickable.
- Verify dragging an element still works smoothly and updates the visual (masked) layer instantly.
