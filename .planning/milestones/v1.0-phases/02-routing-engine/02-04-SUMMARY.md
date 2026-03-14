---
phase: 02-routing-engine
plan: 04
subsystem: ui
tags: [maplibre, react, routing, geojson, hooks]

# Dependency graph
requires:
  - phase: 02-routing-engine/02-03
    provides: useRouter hook, ModeSelector, osmWorker route protocol
  - phase: 02-routing-engine/02-01
    provides: A* router, segmentSnap, graphBuilder
provides:
  - MapLibre route/marker/snap-indicator layers in MapView
  - Full App.tsx wiring: useOsmLoader + useRouter + ModeSelector + toast
  - Interactive click-to-route UI with visual feedback
affects: [03-animation, any phase using MapView or routing state]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stable ref pattern for event listener callbacks: useRef + unconditional useEffect to always update ref value, so long-lived listeners (map.on) call the latest handler"
    - "Routing state centralized in useRouter; App.tsx only wires together hooks and passes props down"
    - "MapView keeps loadedRef to gate routing prop effects until map style has loaded"

key-files:
  created: []
  modified:
    - src/lib/mapHelpers.ts
    - src/components/MapView.tsx
    - src/App.tsx
    - src/hooks/useOsmLoader.ts

key-decisions:
  - "Stable ref pattern (onMapClickRef) in MapView to avoid stale closure bug: map.on('click') is registered once at mount; graph becomes available only after OSM load, making handleMapClick change reference; without ref, handler silently no-ops"
  - "updateSnapIndicatorLayer uses sourceSnap only (not destSnap) for snap indicator — indicator shows the most recent snap"

patterns-established:
  - "Stable ref pattern: when a long-lived event listener (map.on, addEventListener) must call a prop or callback that changes over time, store it in a ref updated via unconditional useEffect"

requirements-completed: [MAP-01, MAP-02, ROUT-01, ROUT-02]

# Metrics
duration: 60min
completed: 2026-03-13
---

# Phase 2 Plan 04: Map Integration and End-to-End Routing Summary

**MapLibre route/marker/snap-indicator layers wired into MapView with full App.tsx integration — users click to place snapping markers and see A*-computed red route lines with mode switching**

## Performance

- **Duration:** ~60 min (including bug investigation and fix)
- **Started:** 2026-03-13T10:30:00Z
- **Completed:** 2026-03-13T11:43:00Z
- **Tasks:** 3 (2 auto + 1 human-verify with bug fix)
- **Files modified:** 4

## Accomplishments

- Added `addRouteLayers`, `updateRouteLayer`, `updateMarkersLayer`, `updateSnapIndicatorLayer`, `clearRouteLayers` to `mapHelpers.ts`
- Extended `MapView.tsx` with routing props and MapLibre layer management; fixed stale closure bug in click handler
- Wired `App.tsx` to connect `useOsmLoader` + `useRouter` + `ModeSelector` + error toasts + auto-reset on new OSM load
- Updated `useOsmLoader.ts` to expose `graph`, `componentMap`, and `workerRef` from worker's done message
- Phase 2 routing feature verified working end-to-end in browser

## Task Commits

1. **Task 1: Add route layer helpers and extend MapView** - `96641c9` (feat)
2. **Task 2: Wire App.tsx with useRouter, ModeSelector, toast** - `c4d7e0e` (feat)
3. **Bug fix: stale closure in onMapClick** - `894a24d` (fix)

## Files Created/Modified

- `src/lib/mapHelpers.ts` — added 5 new exported functions for route/marker/snap-indicator layers
- `src/components/MapView.tsx` — added routing props, addRouteLayers on load, routing useEffect, click handler with stable ref fix
- `src/App.tsx` — full wiring: useRouter, lastClickPoint state, routing error toast, ModeSelector, crosshair cursor, reset on load
- `src/hooks/useOsmLoader.ts` — expose graph, componentMap, workerRef from done message

## Decisions Made

- Stable ref pattern for `onMapClick` in MapView: map.on('click') is registered once at mount but `handleMapClick` in useRouter captures `graph` — which is null at mount and changes when OSM data loads. Without the ref, every click silently no-ops because the stale closure sees `graph === null`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale closure causing map clicks to silently no-op**
- **Found during:** Task 3 human verification (user reported clicking map showed grabbing cursor but no marker)
- **Issue:** `map.on('click')` registered at mount captured `onMapClick` from initial render when `graph` was null. After OSM loaded and `graph` became available, `handleMapClick` returned early (`if (!graph) return`) — but the listener still called the original stale `onMapClick` wrapping the original `handleMapClick`.
- **Fix:** Added `onMapClickRef` + unconditional `useEffect` to always sync ref to latest prop. Click listener calls `onMapClickRef.current?.()` instead of captured prop.
- **Files modified:** `src/components/MapView.tsx`
- **Verification:** All 42 tests pass; fix resolves root cause of stale closure
- **Committed in:** `894a24d`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix — without it no routing interaction was possible. No scope creep.

## Issues Encountered

- Map click handler stale closure: common React/MapLibre integration pitfall when combining `useEffect` with a dependency array that excludes a prop (to prevent map re-creation) while that prop changes later. The stable ref pattern is the correct solution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 routing feature fully working: click to snap markers, A* route line, mode switching, toast feedback, new-load reset
- Phase 3 (animation) can build on `route.searchHistory` from `RouteResult` — A* search history is already captured in the worker and returned
- No blockers

---
*Phase: 02-routing-engine*
*Completed: 2026-03-13*
