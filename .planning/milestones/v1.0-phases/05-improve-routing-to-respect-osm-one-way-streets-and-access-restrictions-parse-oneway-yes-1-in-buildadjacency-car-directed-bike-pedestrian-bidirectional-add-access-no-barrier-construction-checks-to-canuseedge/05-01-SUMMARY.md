---
phase: 05-improve-routing-oneway-access
plan: "01"
subsystem: routing
tags: [typescript, osm, graph, oneway, adjacency, tdd]

requires:
  - phase: 02-routing-engine
    provides: AdjacencyEdge interface and buildAdjacency implementation

provides:
  - AdjacencyEdge interface with onewayReversed?: boolean field
  - buildAdjacency detects oneway=yes and oneway=-1 OSM tags, sets onewayReversed: true on the blocked edge
  - Test coverage for both oneway tag values and regression guard for non-oneway ways

affects: [05-02, canUseEdge enforcement, aStar traversal]

tech-stack:
  added: []
  patterns:
    - "Separate edge objects per direction — onewayReversed set on one does not affect the other"
    - "Optional boolean flag on edge marks blocked direction; canUseEdge reads it at traversal time"

key-files:
  created: []
  modified:
    - src/lib/router.ts
    - src/lib/graphBuilder.ts
    - src/__tests__/graphBuilder.test.ts

key-decisions:
  - "onewayReversed: true marks the blocked (reverse) edge, not the allowed edge — canUseEdge will check this flag in Plan 02"
  - "Graph remains fully bidirectional at build time — mode enforcement is exclusively in canUseEdge"
  - "oneway=-1 sets onewayReversed: true on edgeAB (A→B, the forward edge in node-sequence), not edgeBA"

patterns-established:
  - "TDD: RED commit with failing tests first, then GREEN commit with implementation"

requirements-completed: [ONEWAY-01, ONEWAY-02]

duration: 1min
completed: 2026-03-14
---

# Phase 05 Plan 01: Add onewayReversed to AdjacencyEdge and buildAdjacency Summary

**onewayReversed?: boolean added to AdjacencyEdge interface and buildAdjacency marks blocked-direction edges for oneway=yes/-1 OSM tags**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-14T11:40:26Z
- **Completed:** 2026-03-14T11:41:21Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added `onewayReversed?: boolean` to `AdjacencyEdge` interface in `router.ts`
- Updated `buildAdjacency` in `graphBuilder.ts` to detect `oneway=yes` and `oneway=-1` tags and set `onewayReversed: true` on the correct directed edge
- Added 3 new test cases (oneway=yes, oneway=-1, no-oneway regression guard); full suite 76/76 green

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing oneway tests** - `8f111ad` (test)
2. **Task 1 (GREEN): Add onewayReversed field and buildAdjacency detection** - `5fdd055` (feat)

_Note: TDD task has two commits — RED (failing tests) then GREEN (implementation)_

## Files Created/Modified

- `src/lib/router.ts` - Added `onewayReversed?: boolean` to `AdjacencyEdge` interface
- `src/lib/graphBuilder.ts` - Detects `oneway=yes`/`-1` tags, sets `onewayReversed: true` on correct directed edge with separate edge objects
- `src/__tests__/graphBuilder.test.ts` - Three new test cases in `buildAdjacency — oneway detection` describe block

## Decisions Made

- `onewayReversed: true` marks the **blocked** edge (B→A for `oneway=yes`, A→B for `oneway=-1`), not the allowed edge — this is the natural signal for `canUseEdge` to reject in Plan 02
- Graph remains fully bidirectional at build time — both edges still exist in the adjacency list; mode-aware enforcement deferred entirely to `canUseEdge`
- `edgeAB` and `edgeBA` are always separate object literals to ensure `onewayReversed` on one does not bleed onto the other

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Data contract established: `AdjacencyEdge.onewayReversed` is ready for Plan 02 to enforce one-way restrictions in `canUseEdge`
- Full test suite green (76 tests); no regressions in router, segmentSnap, animation, or other modules

---
*Phase: 05-improve-routing-oneway-access*
*Completed: 2026-03-14*

## Self-Check: PASSED

- FOUND: 05-01-SUMMARY.md
- FOUND: src/lib/router.ts
- FOUND: src/lib/graphBuilder.ts
- FOUND commit: 8f111ad (test RED)
- FOUND commit: 5fdd055 (feat GREEN)
