---
created: 2026-03-14T12:16:30.000Z
title: Remove dead code — dead imports and orphaned exports
area: ui
files:
  - src/components/MapView.tsx:13
  - src/lib/mapHelpers.ts
  - src/lib/routeStats.ts
  - src/lib/animationUtils.ts
---

## Problem

Four pieces of dead code identified during v1.0 milestone audit (2026-03-14):

1. **Dead import** — `MapView.tsx:13` imports `updateMarkersLayer` from mapHelpers.ts but never calls it. The GeoJSON circle markers were intentionally replaced by draggable DOM markers in Phase 4; this import was left behind.

2. **Orphaned export** — `clearRouteLayers` in `mapHelpers.ts` is exported but never imported anywhere (not in production code, not in tests). Created as a utility but never wired up.

3. **Orphaned export** — `formatDistance` in `routeStats.ts` is only used in tests (`stats.test.ts`). Production code (`App.tsx:111`) computes `route.distance / 1000` inline instead of calling this helper.

4. **Orphaned export** — `slicePath` in `animationUtils.ts` is exported but unused in production. `useAnimation.ts` slices history directly with `history.slice(cursor, cursor + nodesPerFrame)` rather than calling `slicePath`.

None of these cause runtime errors, but they create noise and could confuse future contributors.

## Solution

- Remove `updateMarkersLayer` from the import statement in `MapView.tsx:13`
- Either remove `clearRouteLayers` from `mapHelpers.ts` exports, or wire it into the OSM-reload cleanup (see the `stage === 'idle'` todo)
- Remove `formatDistance` export or replace `App.tsx:111` inline math with the helper call for consistency
- Remove `slicePath` export or replace the inline slice in `useAnimation.ts` with the helper call

Simplest approach: delete all four unused exports/imports. Run `tsc --noEmit` and tests after to confirm no regressions.
