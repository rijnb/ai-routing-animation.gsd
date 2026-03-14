---
phase: 03-search-animation
plan: 01
subsystem: testing
tags: [vitest, typescript, animation, pure-functions, tdd]

# Dependency graph
requires:
  - phase: 02-routing-engine
    provides: Virtual node pattern (__vs__/__ve__) used in filterHistory

provides:
  - filterHistory: pure function filtering virtual node IDs from searchHistory arrays
  - slicePath: proportional path slicing with ceil rounding and cursor/total clamping
  - computeNodesPerFrame: speed multiplier to frame node count conversion

affects: [03-02, rAF hook implementation, MapLibre animation integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD RED-GREEN for pure animation logic before rAF/MapLibre integration]

key-files:
  created:
    - src/lib/animationUtils.ts
    - src/__tests__/animation.test.ts
  modified: []

key-decisions:
  - "Pure animation logic extracted as standalone functions with no imports — enables unit testing without rAF/WebGL/jsdom limitations"
  - "slicePath uses ceil (not floor) for fractional path slicing — ensures at least 1 coordinate visible at non-zero progress"
  - "computeNodesPerFrame floors at 1 via max(1, ...) — prevents 0 nodes/frame at very low speed multipliers"

patterns-established:
  - "Pure-function extraction pattern: extract testable logic from stateful rAF hooks before implementing the hook"
  - "Virtual node filter pattern: filterHistory is the canonical way to strip __vs__/__ve__ before coordinate lookup"

requirements-completed: [ANIM-01, ANIM-02, ANIM-03]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 3 Plan 01: Animation Pure-Logic Utilities Summary

**Three pure TypeScript functions (filterHistory, slicePath, computeNodesPerFrame) TDD'd GREEN — verified building blocks for Plan 02 rAF hook**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-13T13:06:09Z
- **Completed:** 2026-03-13T13:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- filterHistory strips __vs__ and __ve__ virtual node IDs from searchHistory arrays before coordinate lookup
- slicePath returns proportional path slice using ceil rounding, cursor/total fraction clamped to [0,1]
- computeNodesPerFrame converts speed multiplier to frame node count with floor at 1
- 17 new tests all GREEN, full suite 59/59 passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RED tests for animation utilities** - `dfb3a0a` (test)
2. **Task 2: Implement animationUtils.ts (GREEN)** - `77e5b5e` (feat)

## Files Created/Modified

- `src/lib/animationUtils.ts` - Three exported pure functions: filterHistory, slicePath, computeNodesPerFrame
- `src/__tests__/animation.test.ts` - 17 unit tests covering all behavior cases from plan spec

## Decisions Made

- No imports needed in animationUtils.ts — pure TypeScript with no dependencies, maximally portable
- slicePath handles total=0 edge case by returning [] (avoids division by zero)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- animationUtils.ts is ready for import in Plan 02 (useAnimationLoop hook)
- filterHistory, slicePath, computeNodesPerFrame are the verified building blocks the rAF loop will call per-frame
- No blockers

---
*Phase: 03-search-animation*
*Completed: 2026-03-13*
