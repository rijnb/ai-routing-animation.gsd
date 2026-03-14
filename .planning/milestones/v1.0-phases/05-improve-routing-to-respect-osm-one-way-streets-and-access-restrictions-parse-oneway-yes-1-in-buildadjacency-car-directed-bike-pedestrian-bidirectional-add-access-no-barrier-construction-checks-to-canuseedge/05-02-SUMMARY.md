---
phase: 05-improve-routing-oneway-access
plan: "02"
subsystem: routing
tags: [router, canUseEdge, oneway, barriers, construction, access, osm, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: AdjacencyEdge with onewayReversed flag set by buildAdjacency
provides:
  - canUseEdge accepting full AdjacencyEdge object with oneway direction enforcement
  - Construction blocking (highway=construction, construction=yes) for all modes
  - Barrier blocking with mode-specific rules (bollard/gate/lift_gate/cycle_barrier block car; wall/fence/hedge block all; kissing_gate blocks car+bike)
  - Contraflow bike lane support via oneway:bicycle=no tag
  - Updated aStar call site passing full edge to canUseEdge
  - Fixed segmentSnap.ts call site for new signature
affects:
  - Any code calling canUseEdge (now requires AdjacencyEdge, not plain tags)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - canUseEdge accepts full AdjacencyEdge — enforcement layer reads onewayReversed from edge object built by buildAdjacency
    - Barrier sets pattern: blocksAll, blocksCar, blocksCarAndBike as local const sets for readable dispatch
    - segmentSnap wraps way.tags in minimal AdjacencyEdge inline literal for canUseEdge compatibility

key-files:
  created: []
  modified:
    - src/lib/router.ts
    - src/__tests__/router.test.ts
    - src/lib/segmentSnap.ts

key-decisions:
  - "canUseEdge accepts AdjacencyEdge (not tags) — full edge object enables onewayReversed check without extra parameter"
  - "cycle_barrier in blocksCar set (not blocksAll) — bikes can pass cycle barriers, only cars blocked"
  - "kissing_gate in blocksCarAndBike set — pedestrians only barrier"
  - "segmentSnap.ts snaps at way level without onewayReversed — inline minimal edge { to:'', weight:0, tags } passed, not onewayReversed"

patterns-established:
  - "Barrier dispatch pattern: blocksAll/blocksCar/blocksCarAndBike local const sets for clean multi-mode blocking logic"
  - "edge() fixture helper in tests: const edge = (tags, onewayReversed?) => ({ to:'', weight:0, tags, onewayReversed }) — minimal AdjacencyEdge for unit tests"

requirements-completed: [ONEWAY-03, ONEWAY-04, BARRIER-01, CONSTRUCTION-01]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 05 Plan 02: canUseEdge Enforcement Layer Summary

**canUseEdge updated to accept AdjacencyEdge with oneway direction, construction, and barrier blocking — full 98-test suite green**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-14T11:43:13Z
- **Completed:** 2026-03-14T11:44:41Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Updated `canUseEdge` signature from `(tags, mode)` to `(edge: AdjacencyEdge, mode)` — enforcement layer now reads `onewayReversed` directly from edge
- Added construction blocking (highway=construction or construction=yes) that blocks all routing modes
- Added barrier type dispatch: wall/fence/hedge block all; bollard/gate/lift_gate/cycle_barrier block car only; kissing_gate blocks car and bicycle but allows pedestrian
- Added oneway direction enforcement: car blocked on `onewayReversed=true`; bike blocked unless `oneway:bicycle=no` (contraflow); pedestrian always passes
- Updated aStar call site and segmentSnap.ts call site for new signature
- Added 24 new tests; full suite 98/98 green with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Update canUseEdge signature, add new checks, fix aStar call site, update tests** - `c096818` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD task — tests written and confirmed RED before implementation, then GREEN._

## Files Created/Modified

- `src/lib/router.ts` - canUseEdge signature changed, new construction/barrier/oneway checks added, aStar call site updated
- `src/__tests__/router.test.ts` - All existing calls migrated to edge() fixture helper, 24 new test cases added
- `src/lib/segmentSnap.ts` - Call site updated to pass minimal AdjacencyEdge inline literal

## Decisions Made

- canUseEdge accepts the full `AdjacencyEdge` object so `onewayReversed` is readable without an extra parameter
- `cycle_barrier` placed in `blocksCar` (bikes can pass cycle barriers — that is their purpose)
- `kissing_gate` placed in `blocksCarAndBike` (pedestrian-only barriers by design)
- `segmentSnap.ts` passes `{ to: '', weight: 0, tags: way.tags }` inline — `onewayReversed` not applicable at way-level snap filtering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed segmentSnap.ts call site broken by signature change**
- **Found during:** Task 1 (full test suite verification after router.ts update)
- **Issue:** `segmentSnap.ts` called `canUseEdge(way.tags, mode)` — passing tags directly, which now fails TypeScript type check and throws at runtime
- **Fix:** Updated call to `canUseEdge({ to: '', weight: 0, tags: way.tags }, mode)` — minimal edge object, no onewayReversed needed for way-level access filtering
- **Files modified:** src/lib/segmentSnap.ts
- **Verification:** Full test suite 98/98 green including segmentSnap tests
- **Committed in:** c096818 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking call site)
**Impact on plan:** Necessary fix — segmentSnap imported canUseEdge and was broken by the signature change. No scope creep.

## Issues Encountered

None — implementation matched plan spec exactly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 05 complete: oneway streets and access restrictions fully enforced in routing
- `canUseEdge` is the single enforcement layer — `buildAdjacency` sets `onewayReversed`, `canUseEdge` acts on it
- All routing modes correctly respect oneway, construction, and barrier constraints

---
*Phase: 05-improve-routing-oneway-access*
*Completed: 2026-03-14*
