# Mockup Scaling Logic Fix - 2026-02-11

## Issue
The Mockup Scale slider (80%-100%) was not functioning. The scaling logic in `Canvas.tsx` was prioritizing the `baseImageProperties?.scale` value (which defaults to 1) over the `baseImageScale` slider value.

## Solution
Updated `Canvas.tsx` to prioritize the global `baseImageScale` if it is set (which it is by default, e.g. 80). If `baseImageScale` is missing/zero, it falls back to `baseImageProperties.scale` or 1.

### Changes
Old logic:
```ts
const effectiveScale = baseImageProperties?.scale ?? (baseImageScale / 100);
// scale(...) in transform also used this priority
```

New logic:
```ts
const effectiveScale = baseImageScale ? (baseImageScale / 100) : (baseImageProperties?.scale || 1);
// scale(...) updated to match
```

This ensures that when the user adjusts the slider in the sidebar, the mockup image actually scales up and down.
