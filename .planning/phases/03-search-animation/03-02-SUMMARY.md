---
phase: 03-search-animation
plan: 02
subsystem: ui
tags: [maplibre, react, animation, rAF, geojson, circle-layers]

# Dependency graph
requires:
  - phase: 03-search-animation-01
    provides: animationUtils.ts with filterHistory, slicePath, computeNodesPerFrame

provides:
  - mapHelpers.ts with addFrontierLayers, updateFrontierLayers, clearFrontierLayers
  - useAnimation hook with startAnimation, cancelAnimation, speed/setSpeed
  - Yellow (#ffcc00) route line color replacing red (#e63012)

affects:
  - 03-search-animation-03 (MapView wiring plan — consumes all new exports)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - speedRef pattern: useRef keeps in sync with useState via useEffect so rAF closures read live value
    - Accumulated visited array: visited coords accumulate across frames; frontier shows only current batch
    - Caller-controlled cleanup: cancelAnimation does not clear frontier layers — caller decides

key-files:
  created:
    - src/hooks/useAnimation.ts
  modified:
    - src/lib/mapHelpers.ts

key-decisions:
  - "cancelAnimation does not call clearFrontierLayers — caller (MapView/App) decides when to clear on route reset"
  - "Frontier batch shows only current frame nodes; visited accumulates all history coords for density effect"
  - "Route color changed from #e63012 to #ffcc00 so red is reserved exclusively for frontier nodes"

patterns-established:
  - "speedRef pattern: const [speed, setSpeed] + const speedRef = useRef; useEffect(() => { speedRef.current = speed }, [speed])"
  - "GeoJSON circle layers follow same EMPTY_FC initialisation pattern as route/marker layers"

requirements-completed:
  - ANIM-01
  - ANIM-02
  - ANIM-03

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 3 Plan 02: Search Animation Engine Summary

**MapLibre circle layers for visited/frontier nodes plus rAF animation hook driving the search-history playback with live speed control via speedRef pattern**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-13T13:08:26Z
- **Completed:** 2026-03-13T13:09:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added three frontier layer helpers to mapHelpers.ts: addFrontierLayers, updateFrontierLayers, clearFrontierLayers
- Changed route line color from red (#e63012) to yellow (#ffcc00), freeing red for frontier circle markers
- Implemented useAnimation hook with rAF loop, accumulated visited coords, speed slider via speedRef pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Add frontier layer helpers and fix route color** - `5854db0` (feat)
2. **Task 2: Implement useAnimation rAF hook** - `6cfe86e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/mapHelpers.ts` - Added addFrontierLayers, updateFrontierLayers, clearFrontierLayers; changed route color to #ffcc00
- `src/hooks/useAnimation.ts` - rAF animation loop hook with speed state, speedRef, startAnimation, cancelAnimation

## Decisions Made
- cancelAnimation intentionally does NOT call clearFrontierLayers — the caller (MapView wiring in Plan 03) controls when to wipe frontier state on route reset
- Frontier batch shows only the nodes from the current rAF frame; visited array accumulates all history nodes, producing a growing density cloud
- Route color #e63012 → #ffcc00 so visual color vocabulary is unambiguous: red = frontier (hot search front), cyan = visited, yellow = found path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- mapHelpers.ts now exports the full frontier layer API (add/update/clear)
- useAnimation hook is complete and ready to be wired into MapView.tsx and App.tsx in Plan 03
- TypeScript compiles cleanly; all 59 tests remain GREEN

---
*Phase: 03-search-animation*
*Completed: 2026-03-13*
