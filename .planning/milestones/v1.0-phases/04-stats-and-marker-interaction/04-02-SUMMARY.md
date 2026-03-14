---
phase: 04-stats-and-marker-interaction
plan: "02"
subsystem: ui
tags: [react, typescript, vitest, stats, animation]

# Dependency graph
requires:
  - phase: 04-01
    provides: RED test stubs for stats.test.ts and markerDrag.test.ts
  - phase: 03-search-animation
    provides: useAnimation hook, animationUtils, SpeedPanel style reference

provides:
  - Pure stats utilities (estimateTravelTime, formatDistance, formatTime, MODE_SPEEDS_KMH) in routeStats.ts
  - nodesExplored state exposed from useAnimation rAF loop
  - StatsPanel component ready for wiring into App.tsx (Plan 04-03)

affects:
  - 04-03 (App.tsx wiring of StatsPanel and nodesExplored)
  - 04-04 (marker drag wiring)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Integer arithmetic for travel time (multiply before divide to avoid float drift)
    - rAF counter pattern: setNodesExplored(cursor) per frame, resets on startAnimation

key-files:
  created:
    - src/lib/routeStats.ts
    - src/components/StatsPanel.tsx
  modified:
    - src/hooks/useAnimation.ts

key-decisions:
  - "estimateTravelTime uses integer arithmetic (distanceMeters * 3600) / (speedKmh * 1000) then Math.round — avoids floating-point drift that caused 15000/bicycle to return 3599.999..."
  - "StatsPanel receives distanceKm (already in km) and formats inline — avoids double-import of routeStats; only formatTime imported"
  - "nodesExplored resets to 0 only on startAnimation, not on cancelAnimation — holds final count after animation completes"

patterns-established:
  - "Stats panel positioning: top: 16px, right: 16px at zIndex 400 (non-conflicting with SpeedPanel bottom-center, ModeSelector bottom-left)"
  - "Hook state for live counters: useState in hook body, updated each rAF frame via setNodesExplored(cursor)"

requirements-completed: [STAT-01, STAT-02, STAT-03]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 04 Plan 02: Stats Utilities and StatsPanel Summary

**Pure travel-time/distance utilities in routeStats.ts, nodesExplored counter wired into useAnimation rAF loop, and StatsPanel overlay component — all 10 stats tests GREEN**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T10:15:29Z
- **Completed:** 2026-03-14T10:17:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/lib/routeStats.ts` with `estimateTravelTime`, `formatDistance`, `formatTime`, `MODE_SPEEDS_KMH` — all 10 stats.test.ts tests GREEN
- Extended `useAnimation` hook to expose `nodesExplored: number` that resets to 0 at animation start and increments each rAF frame
- Created `StatsPanel.tsx` overlay component (top-right, zIndex 400) showing nodes/distance/est.time, renders null when `visible=false`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create routeStats.ts and turn stats tests GREEN** - `822afd6` (feat)
2. **Task 2: Add nodesExplored to useAnimation and create StatsPanel** - `ead02c9` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/routeStats.ts` - Pure stats utilities: estimateTravelTime, formatDistance, formatTime, MODE_SPEEDS_KMH
- `src/hooks/useAnimation.ts` - Added nodesExplored useState, setNodesExplored(0) reset, setNodesExplored(cursor) per frame
- `src/components/StatsPanel.tsx` - Overlay panel component with nodes/distance/time display

## Decisions Made

- Used integer arithmetic for estimateTravelTime: `Math.round((distanceMeters * 3600) / (speedKmh * 1000))` — naive division via m/s speed produced floating-point drift (3599.999...) causing test failure
- StatsPanel receives `distanceKm: number | null` (already converted to km) and formats inline with `.toFixed(2) + ' km'` — imports only `formatTime` from routeStats
- `nodesExplored` does not reset in `cancelAnimation` — holds final explored count after animation finishes, resets only on next `startAnimation` call

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed floating-point precision in estimateTravelTime**
- **Found during:** Task 1 (Create routeStats.ts)
- **Issue:** `15000 / (15 * 1000 / 3600)` returned `3599.9999999999995` instead of `3600`, causing test failure
- **Fix:** Rewrote as `Math.round((distanceMeters * 3600) / (speedKmh * 1000))` — multiply before divide, then round
- **Files modified:** src/lib/routeStats.ts
- **Verification:** `npx vitest run src/__tests__/stats.test.ts` — all 10 tests pass
- **Committed in:** `822afd6` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — floating-point precision)
**Impact on plan:** Required for correctness of integer-boundary test cases. No scope creep.

## Issues Encountered

- Pre-existing RED tests in `markerDrag.test.ts` (4 failures) — intentionally staged for Plan 04-03, not caused by this plan's changes. Confirmed by file header comment: "RED until Plan 03 exports it".

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `StatsPanel` component ready to be wired into App.tsx (Plan 04-03)
- `nodesExplored` available from `useAnimation()` return object for display
- Plan 04-03 needs: `buildHandleMarkerDrag` export from useRouter.ts (markerDrag.test.ts RED tests)

---
*Phase: 04-stats-and-marker-interaction*
*Completed: 2026-03-14*

## Self-Check: PASSED

- routeStats.ts: FOUND
- StatsPanel.tsx: FOUND
- 04-02-SUMMARY.md: FOUND
- commit 822afd6: FOUND
- commit ead02c9: FOUND
