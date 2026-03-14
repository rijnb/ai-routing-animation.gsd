---
created: 2026-03-14T12:15:38.242Z
title: Fix stage idle dead condition on OSM reload
area: ui
files:
  - src/App.tsx:74
  - src/hooks/useOsmLoader.ts
---

## Problem

`App.tsx` line 74 has a dead cleanup effect for OSM reload:

```ts
useEffect(() => {
  if (stage === 'idle') {          // ← 'idle' is never emitted
    cancelAnimation()
    if (mapRef.current) clearFrontierLayers(mapRef.current)
  }
}, [stage, cancelAnimation])
```

`useOsmLoader` resets `stage` to `''` (empty string) on completion/error, never to `'idle'`. This effect body therefore never executes.

**Consequence:** When a user loads a second OSM file after having run an animation, the frontier/visited-node layers from the previous session are not cleared and any in-flight animation frame is not cancelled via this path. Ghost frontier layers persist on the map until the next map click or marker drag.

Found during v1.0 milestone audit (2026-03-14).

## Solution

Change the condition from `stage === 'idle'` to `stage === ''` and guard against firing on initial mount (e.g., use a `hasLoadedOnce` ref or move the cleanup into the existing `geojson` change effect at App.tsx:82-89 which already calls `resetRouting()`).

Simplest fix:
```ts
// In the geojson change effect (App.tsx ~82), add:
cancelAnimation()
if (mapRef.current) clearFrontierLayers(mapRef.current)
```

Then remove the stale `stage === 'idle'` effect entirely.
