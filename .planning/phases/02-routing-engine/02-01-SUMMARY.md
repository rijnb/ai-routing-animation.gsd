---
phase: 02-routing-engine
plan: 01
subsystem: testing
tags: [vitest, tdd, router, segmentSnap, modeSelector, a-star, osm-access]

requires:
  - phase: 01-data-pipeline-and-map-foundation
    provides: OsmGraph, OsmWay types; graphBuilder.ts; vitest configured with jsdom; @testing-library/react installed

provides:
  - src/lib/router.ts stub with RoutingMode, AdjacencyEdge, AdjacencyList, RouteResult types and canUseEdge/aStar stubs
  - src/lib/segmentSnap.ts stub with SnapResult interface and snapToNearestSegment stub
  - src/components/ModeSelector.tsx stub rendering three mode buttons
  - src/__tests__/router.test.ts with RED tests for ROUT-01 and ROUT-03
  - src/__tests__/segmentSnap.test.ts with RED tests for MAP-01 and MAP-02
  - src/__tests__/modeSelector.test.tsx with RED tests for ROUT-02
  - src/__tests__/graphBuilder.test.ts extended with RED PIPE-03 component detection tests
  - Locked public API surface for Plans 02-02 through 02-04 to implement against

affects: [02-02-graph-and-routing, 02-03-segment-snap, 02-04-ui-wiring]

tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD stubs: create module with correct exported types + no-op function bodies before writing tests"
    - "React import required in test files even with react-jsx transform (tsconfig excludes __tests__ from app config)"

key-files:
  created:
    - src/lib/router.ts
    - src/lib/segmentSnap.ts
    - src/components/ModeSelector.tsx
    - src/__tests__/router.test.ts
    - src/__tests__/segmentSnap.test.ts
    - src/__tests__/modeSelector.test.tsx
  modified:
    - src/__tests__/graphBuilder.test.ts

key-decisions:
  - "React import required in .tsx test files: tsconfig.app.json excludes __tests__, so vitest does not get the react-jsx transform from app tsconfig; explicit import React resolves the runtime error"

patterns-established:
  - "Stub exports: use void param to suppress noUnusedParameters TS error in stubs"
  - "Wave 0 TDD: test file imports module (must exist), tests fail on assertion not on missing module"

requirements-completed: [MAP-01, MAP-02, ROUT-01, ROUT-02, ROUT-03, PIPE-03]

duration: 4min
completed: 2026-03-13
---

# Phase 2 Plan 01: Wave 0 TDD Stubs Summary

**Six stub files (3 modules + 3 tests) locking the A\*, segmentSnap, and ModeSelector API surface for Phase 2 implementation plans**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-13T11:16:40Z
- **Completed:** 2026-03-13T11:20:19Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created `router.ts` stub exporting RoutingMode, AdjacencyEdge, AdjacencyList, RouteResult types and canUseEdge/aStar stubs (always return false/empty)
- Created `segmentSnap.ts` stub exporting SnapResult interface and snapToNearestSegment returning null
- Created `ModeSelector.tsx` stub rendering three buttons (car/bicycle/pedestrian) with aria-pressed but no click handler
- All three test files import their modules without compile errors; 16 tests fail RED with assertion failures
- Extended graphBuilder.test.ts with PIPE-03 buildAdjacency tests (fail until Plan 02-02 adds the function)
- All 12 existing Phase 1 tests remain GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Create router.ts stub and router.test.ts (RED)** - `1e6e35a` (test)
2. **Task 2: Create segmentSnap.ts stub, modeSelector stub, and their test files (RED)** - `2c4b114` (test)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks — both are RED phase commits_

## Files Created/Modified

- `src/lib/router.ts` — RoutingMode/AdjacencyList/RouteResult types; canUseEdge and aStar stubs
- `src/lib/segmentSnap.ts` — SnapResult interface; snapToNearestSegment stub returning null
- `src/components/ModeSelector.tsx` — ModeSelector component stub; renders buttons, no click logic
- `src/__tests__/router.test.ts` — 17 tests for canUseEdge (OSM access matrix) and aStar (3-node triangle graph, disconnected graph)
- `src/__tests__/segmentSnap.test.ts` — 5 tests for segment snapping (near road, interpolated point, out-of-range, mode filter, node IDs)
- `src/__tests__/modeSelector.test.tsx` — 4 tests for mode button rendering, click handlers, aria-pressed
- `src/__tests__/graphBuilder.test.ts` — extended with 4 PIPE-03 tests for buildAdjacency component detection

## Decisions Made

- React must be explicitly imported in `.tsx` test files: `tsconfig.app.json` excludes `src/__tests__/` from app compilation, so vitest does not get the `react-jsx` automatic import transform. Adding `import React from 'react'` resolves the ReferenceError at test runtime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added explicit React import to ModeSelector.tsx and modeSelector.test.tsx**

- **Found during:** Task 2 (modeSelector test execution)
- **Issue:** Tests failed with `ReferenceError: React is not defined` — not an assertion failure. The `tsconfig.app.json` excludes `src/__tests__/`, so vitest runs without the react-jsx transform that auto-imports React.
- **Fix:** Added `import React from 'react'` to both `ModeSelector.tsx` and `modeSelector.test.tsx`
- **Files modified:** `src/components/ModeSelector.tsx`, `src/__tests__/modeSelector.test.tsx`
- **Verification:** Re-ran tests — React error resolved; tests now fail on assertion failures (correct RED state)
- **Committed in:** `2c4b114` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for correct RED test state. No scope creep.

## Issues Encountered

- `buildAdjacency` in graphBuilder.test.ts fails at runtime as `buildAdjacency is not a function` (not a compile error, because named import of `undefined` is valid TypeScript when the export doesn't exist yet). This is the expected Wave 0 behavior — tests go GREEN when Plan 02-02 adds the function.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six Wave 0 files exist and the API surface is locked
- Plans 02-02 (graph + A*), 02-03 (segment snap), 02-04 (UI wiring) can now implement against these contracts
- All new tests are RED with assertion failures — ready for implementation plans to turn them GREEN
- 12 existing Phase 1 tests remain GREEN (regression baseline intact)

## Self-Check: PASSED

All files exist on disk. All commits verified in git log.

- FOUND: src/lib/router.ts
- FOUND: src/lib/segmentSnap.ts
- FOUND: src/components/ModeSelector.tsx
- FOUND: src/__tests__/router.test.ts
- FOUND: src/__tests__/segmentSnap.test.ts
- FOUND: src/__tests__/modeSelector.test.tsx
- FOUND: src/__tests__/graphBuilder.test.ts
- FOUND: .planning/phases/02-routing-engine/02-01-SUMMARY.md
- Commit 1e6e35a: test(02-01): add failing tests for router
- Commit 2c4b114: test(02-01): add failing tests for segmentSnap, modeSelector, graphBuilder

---
*Phase: 02-routing-engine*
*Completed: 2026-03-13*
