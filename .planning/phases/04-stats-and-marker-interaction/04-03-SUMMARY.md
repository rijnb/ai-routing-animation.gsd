---
phase: 04-stats-and-marker-interaction
plan: "03"
subsystem: ui
tags: [maplibregl, draggable-markers, stats-panel, react, animation]

# Dependency graph
requires:
  - phase: 04-stats-and-marker-interaction plan 01
    provides: markerDrag.test.ts (failing test stubs)
  - phase: 04-stats-and-marker-interaction plan 02
    provides: StatsPanel component, useAnimation nodesExplored, routeStats utilities
  - phase: 03-search-animation
    provides: useAnimation hook, clearFrontierLayers, mapHelpers patterns
provides:
  - buildHandleMarkerDrag factory export from useRouter.ts
  - handleMarkerDrag callback in RouterState interface
  - Draggable maplibregl.Marker DOM overlays (green source, red destination) in MapView
  - StatsPanel rendered in App.tsx with live nodesExplored, totalNodes, distanceKm, travelTimeSeconds
  - handleMarkerDragWithCancel wrapper in App.tsx
affects: [future-phases, user-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildHandleMarkerDrag pure factory pattern: core logic extracted outside hook for unit testing without React context"
    - "Stable onMarkerDragRef ref: same stale-closure prevention pattern as onMapClickRef, updated via bare useEffect"
    - "Draggable marker lifecycle: create on snap set + null ref, setLngLat on snap update, remove on snap cleared"

key-files:
  created: []
  modified:
    - src/hooks/useRouter.ts
    - src/components/MapView.tsx
    - src/App.tsx

key-decisions:
  - "buildHandleMarkerDrag factory uses sourceSnap/destSnap as value params (not refs) to match test contract"
  - "handleMarkerDrag hook wrapper calls setRoute(null) inline in setSourceSnap/setDestSnap closures to clear stale route"
  - "dragend handler registered once at marker creation; setLngLat on subsequent snap updates does NOT re-register (per research)"

patterns-established:
  - "Marker lifecycle pattern: create when null + snap set, update setLngLat when exists + snap set, remove when snap null"
  - "Drag cancel wrapper: handleMarkerDragWithCancel mirrors handleMapClickWithCancel pattern in App.tsx"

requirements-completed: [MAP-04, STAT-01, STAT-02, STAT-03]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 4 Plan 03: Stats and Marker Interaction Integration Summary

**Draggable maplibregl DOM markers replacing GeoJSON circles, handleMarkerDrag wired through App.tsx, and StatsPanel showing live nodesExplored + distance + travel time after route completion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T10:19:21Z
- **Completed:** 2026-03-14T10:21:45Z
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- `buildHandleMarkerDrag` pure factory exported from `useRouter.ts` — 4 TDD tests GREEN
- MapView replaced `updateMarkersLayer` GeoJSON circle call with draggable `maplibregl.Marker` instances (green source, red destination)
- App.tsx wires `handleMarkerDragWithCancel` to MapView, `StatsPanel` rendered with live animation metrics
- 73 tests pass, TypeScript compiles clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add handleMarkerDrag to useRouter and turn markerDrag tests GREEN** - `ea50584` (feat)
2. **Task 2: MapView draggable markers + App.tsx wiring** - `59dce49` (feat)
3. **Task 3: Human verify** - awaiting checkpoint

## Files Created/Modified
- `src/hooks/useRouter.ts` - Added `buildHandleMarkerDrag` factory export, `handleMarkerDrag` useCallback, extended `RouterState` interface
- `src/components/MapView.tsx` - Added `onMarkerDrag` prop, stable ref pattern, draggable marker useEffects for source/dest, removed `updateMarkersLayer` call
- `src/App.tsx` - Added `handleMarkerDragWithCancel`, `StatsPanel` with derived stats, imports for `filterHistory`/`estimateTravelTime`/`StatsPanel`

## Decisions Made
- `buildHandleMarkerDrag` takes `sourceSnap`/`destSnap` as value params (not refs) — test contract is authoritative, simpler than plan's ref-based spec
- `handleMarkerDrag` hook wrapper embeds `setRoute(null)` call inside the `setSourceSnap`/`setDestSnap` closures passed to the factory, so route is cleared before recalculation
- dragend registered once at marker creation; `setLngLat` on subsequent snap updates does not re-register (avoids duplicate listeners per research notes)

## Deviations from Plan

**1. [Rule 1 - Bug] Simplified buildHandleMarkerDrag signature to match test contract**
- **Found during:** Task 1 (implementing buildHandleMarkerDrag)
- **Issue:** Plan spec had `sourceSnapRef`/`destSnapRef` (React refs) and separate `setRoute` param; test file uses `sourceSnap`/`destSnap` as plain values with no `setRoute`
- **Fix:** Used test contract as authoritative spec; `setRoute(null)` handled inside hook wrapper's `setSourceSnap`/`setDestSnap` closures
- **Files modified:** src/hooks/useRouter.ts
- **Verification:** All 4 markerDrag tests pass
- **Committed in:** ea50584 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - matched test contract over plan spec)
**Impact on plan:** No scope change; factory is simpler and all tests pass.

## Issues Encountered
None - both code tasks executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 4 requirements implemented and tested
- Human verification of drag interaction and StatsPanel needed to confirm MAP-04, STAT-01/02/03 requirements
- Application ready for browser testing: `npm run dev`, load .osm.gz, verify draggable markers and live stats

---
*Phase: 04-stats-and-marker-interaction*
*Completed: 2026-03-14*
