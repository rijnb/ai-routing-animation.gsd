---
phase: 09-stats-hud-overlay
plan: 01
subsystem: ui
tags: [react, typescript, hud, overlay, stats, sci-fi]

requires:
  - phase: 08-custom-control-widgets
    provides: ControlPanel with fixed 300px width and bottom-right positioning established

provides:
  - StatsHud component: fixed-width 280px sci-fi instrument-readout overlay, top-left corner
  - 3-column DIST / TIME / NODE readout with HUD aesthetics (blue border, dark surface)
  - Route stats visible only when route !== null

affects:
  - Any future phase adding top-left UI elements must account for StatsHud at top:16px left:16px

tech-stack:
  added: []
  patterns:
    - "Fixed-width HUD overlay: use width + grid 1fr columns to prevent layout shift from dynamic values"
    - "Viewport-pinned elements: use position:fixed not position:absolute for map overlays"
    - "Corner assignment: SettingsPanel=top-right, ControlPanel=bottom-right, StatsHud=top-left"

key-files:
  created:
    - src/components/StatsHud.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "StatsHud placed top-left (not top-right) to avoid overlap with SettingsPanel gear button at top:12 right:12"
  - "Fixed 280px width with repeat(3,1fr) grid columns prevents layout shift as NODE values change during animation"
  - "StatsPanel.tsx left in place (not deleted) to preserve existing file for reference"

patterns-established:
  - "Corner assignment: SettingsPanel=top-right, ControlPanel=bottom-right, StatsHud=top-left — establishes diagonal separation"
  - "HUD instrument readout: label (10px uppercase #aabbff) above value (18px bold #e0e0f0) per column"

requirements-completed: [HUD-01, HUD-02, HUD-03]

duration: 15min
completed: 2026-03-15
---

# Phase 9 Plan 01: Stats HUD Overlay Summary

**Sci-fi 3-column route stats overlay (DIST/TIME/NODE) with blue-bordered dark HUD aesthetic, fixed top-left, invisible until route is active**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-15
- **Completed:** 2026-03-15
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Created StatsHud.tsx as a sci-fi instrument-readout overlay replacing StatsPanel in App.tsx
- Fixed 280px width with equal-width grid columns prevents layout shift as NODE counter updates during animation
- Repositioned from top-right to top-left to avoid SettingsPanel gear button conflict

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StatsHud sci-fi 3-column instrument readout** - `1667e1a` (feat)
2. **Task 2: Wire StatsHud into App.tsx replacing StatsPanel** - `7b15f98` (feat)
3. **Task 3: Fix layout stability and position conflict (user feedback)** - `928fd2b` (fix)

## Files Created/Modified
- `src/components/StatsHud.tsx` - Sci-fi HUD overlay: fixed top-left 280px, blue border, DIST/TIME/NODE 3-column grid
- `src/App.tsx` - Updated import from StatsPanel to StatsHud

## Decisions Made
- StatsHud moved to top-left corner — SettingsPanel gear button occupies `top:12 right:12` at the same z-index (500), making top-right unavailable without a significant offset calculation
- Fixed 280px width with `repeat(3,1fr)` columns ensures each column has a stable, predictable width regardless of the NODE counter changing from "0 / 0" to "12,345 / 45,678" during animation
- `gridTemplateColumns: 'repeat(3, auto)'` was changed to `repeat(3, 1fr)` — auto columns resize to content, which caused the instability

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed layout instability and position conflict after user visual review**
- **Found during:** Task 3 (visual verification — user reported two issues)
- **Issue 1:** StatsHud at `top:16px right:16px` overlapped SettingsPanel gear button at `top:12px right:12px`
- **Issue 2:** `gridTemplateColumns: repeat(3, auto)` caused width to change as NODE values grew during animation
- **Fix:** Moved to `left: '16px'`, added `width: '280px'`, changed grid to `repeat(3, 1fr)`, added `boxSizing: 'border-box'`
- **Files modified:** src/components/StatsHud.tsx
- **Verification:** TypeScript compiles clean (`npx tsc --noEmit` passes)
- **Committed in:** `928fd2b`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: layout instability + position overlap)
**Impact on plan:** Fix required for correct visual behavior. No scope creep.

## Issues Encountered
- None beyond the layout issues addressed in the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 9 complete — all HUD requirements (HUD-01, HUD-02, HUD-03) satisfied
- Corner assignment established: top-left=StatsHud, top-right=SettingsPanel, bottom-right=ControlPanel
- No blockers for future phases

---
*Phase: 09-stats-hud-overlay*
*Completed: 2026-03-15*
