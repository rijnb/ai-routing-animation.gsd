---
phase: 04-stats-and-marker-interaction
plan: 01
subsystem: testing
tags: [vitest, tdd, red-phase, routeStats, markerDrag, pure-functions]

# Dependency graph
requires:
  - phase: 03-search-animation
    provides: animationUtils.ts, useRouter.ts, segmentSnap.ts — foundational modules under test
provides:
  - RED test stubs for routeStats pure functions (formatDistance, estimateTravelTime, formatTime)
  - RED test stubs for buildHandleMarkerDrag factory (drag callback pipeline)
affects:
  - 04-02 (must create routeStats.ts to go GREEN on stats.test.ts)
  - 04-03 (must export buildHandleMarkerDrag from useRouter.ts to go GREEN on markerDrag.test.ts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD Wave 0: test stubs created before implementation, imports cause RED via missing module"
    - "buildHandleMarkerDrag factory pattern: pure testable function extracted from useRouter hook internals"

key-files:
  created:
    - src/__tests__/stats.test.ts
    - src/__tests__/markerDrag.test.ts
  modified: []

key-decisions:
  - "buildHandleMarkerDrag factory export pattern chosen over mocking hook internals — enables unit testing without React context"
  - "formatTime(0) = '0 min' edge case added beyond plan spec — improves coverage without scope creep"

patterns-established:
  - "Pattern: Wave 0 TDD — test files import from modules that do not exist yet; import error = RED = contract defined"
  - "Pattern: vi.mock('../lib/segmentSnap') controls snapToNearestSegment return for drag tests"

requirements-completed: [STAT-01, STAT-02, STAT-03, MAP-04]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 04 Plan 01: Stats and Marker Interaction — RED Test Stubs Summary

**TDD Wave 0: 13 failing test cases establishing API contracts for routeStats pure functions and buildHandleMarkerDrag drag callback factory**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T10:12:26Z
- **Completed:** 2026-03-14T10:13:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created stats.test.ts with 9 test cases covering formatDistance, estimateTravelTime (3 modes), and formatTime — RED due to missing routeStats module
- Created markerDrag.test.ts with 4 test cases covering the drag callback pipeline contract — RED due to missing buildHandleMarkerDrag export
- All 59 previously-passing tests remain GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Create stats.test.ts RED stubs** - `4cac721` (test)
2. **Task 2: Create markerDrag.test.ts RED stubs** - `4c773bd` (test)

_Note: TDD Wave 0 — both commits are RED (failing) by design_

## Files Created/Modified

- `src/__tests__/stats.test.ts` - 9 pure-function tests for routeStats module (STAT-01, STAT-02, STAT-03)
- `src/__tests__/markerDrag.test.ts` - 4 tests for buildHandleMarkerDrag drag pipeline (MAP-04)

## Decisions Made

- **buildHandleMarkerDrag factory pattern:** Rather than mocking hook internals, tests import a `buildHandleMarkerDrag` factory function from useRouter.ts. Plan 03 must export this. Rationale: pure function factory is directly testable without React hooks machinery.
- **formatTime(0) = "0 min" added:** Plan listed 3 formatTime cases; added zero-second edge case for robustness. Stays within STAT-01 scope.

## Deviations from Plan

None — plan executed exactly as written. The extra formatTime(0) test case is within the plan's permitted scope (STAT-01 formatTime coverage).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (routeStats.ts implementation) can go GREEN on all 9 stats tests immediately
- Plan 03 (handleMarkerDrag in useRouter.ts) must export `buildHandleMarkerDrag` factory with signature:
  `buildHandleMarkerDrag(deps: { graph, mode, sourceSnap, destSnap, triggerRoute, setSourceSnap, setDestSnap }) => (which, lngLat) => void`
- All previous phase tests remain GREEN — no regressions

---
*Phase: 04-stats-and-marker-interaction*
*Completed: 2026-03-14*
