---
phase: 03-search-animation
plan: "03"
subsystem: ui

tags: [react, maplibre, animation, typescript]

requires:
  - phase: 03-search-animation/03-02
    provides: useAnimation hook, addFrontierLayers/updateFrontierLayers/clearFrontierLayers in mapHelpers

provides:
  - SpeedPanel component: bottom-center floating speed slider (0.5x–5x), visible when route exists
  - MapView with frontier layers initialized on load (z-ordered under route layer)
  - App.tsx fully wired: animation auto-starts on route, cancels on new click, clears on OSM reset

affects:
  - 04-polish

tech-stack:
  added: []
  patterns:
    - onMapReady callback pattern — MapView calls onMapReady(map) after load so App.tsx captures map ref
    - prevRouteRef guard — prevents re-triggering animation when route reference is same object
    - handleMapClickWithCancel wrapper — cancelAnimation + clearFrontierLayers before routing call

key-files:
  created:
    - src/components/SpeedPanel.tsx
  modified:
    - src/components/MapView.tsx
    - src/App.tsx

key-decisions:
  - "onMapReady callback pattern used to expose map instance from MapView to App.tsx without prop drilling"
  - "SpeedPanel positioned inside map container div (sibling to MapView) so it overlays correctly with position:absolute"
  - "handleMapClickWithCancel absorbs setLastClickPoint to avoid duplicate state update in onMapClick"
  - "Route line shows full path in red throughout animation — slicePath removed from animation frame; grow-from-zero caused invisible route at animation start"
  - "SpeedPanel z-index raised to 400 (above DropZone at 300) so slider is accessible when route is active"

patterns-established:
  - "Map instance sharing: MapView owns the map, exposes via onMapReady callback"
  - "Animation lifecycle: start on route change, cancel on click, cancel+clear on OSM reset"
  - "z-index hierarchy: DropZone (300) < SpeedPanel (400)"

requirements-completed: [ANIM-01, ANIM-02, ANIM-03]

duration: 25min
completed: 2026-03-13
---

# Phase 03 Plan 03: UI Integration Summary

**SpeedPanel + MapView frontier layers + App.tsx animation wiring verified end-to-end; red route line persists throughout A* search visualization with live speed control**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-13T13:11:02Z
- **Completed:** 2026-03-13T14:35:00Z
- **Tasks:** 3 (all complete including human verification)
- **Files modified:** 5

## Accomplishments

- Created SpeedPanel.tsx: bottom-center floating dark panel with range input (0.5x to 5x, 0.5 step)
- Updated MapView.tsx: added graph/onMapReady props, addFrontierLayers call before addRouteLayers (correct z-order)
- Updated App.tsx: useAnimation wired, mapRef via onMapReady, auto-start on route change, cancel on click, clear on OSM reset
- Fixed route line disappearing at animation start (removed proportional slicing, show full red path throughout)
- Fixed SpeedPanel hidden beneath DropZone (raised z-index from 10 to 400)
- Human verification approved after fixes

## Task Commits

1. **Task 1: Create SpeedPanel and update MapView with frontier layers** - `1b8d1fe` (feat)
2. **Task 2: Wire useAnimation and SpeedPanel into App.tsx** - `7e29d44` (feat)
3. **Task 3 fixes: Route line visibility and SpeedPanel z-index** - `d2f7ac3` (fix)

## Files Created/Modified

- `src/components/SpeedPanel.tsx` - Floating speed slider, visible when route != null; z-index 400
- `src/components/MapView.tsx` - Frontier layer init, onMapReady callback, graph/onMapReady props
- `src/hooks/useAnimation.ts` - Animation loop; removed slicePath, shows full route.path each frame
- `src/lib/mapHelpers.ts` - Route layer color changed to red (#e63012)
- `src/App.tsx` - useAnimation wired, SpeedPanel rendered, animation lifecycle managed

## Decisions Made

- onMapReady callback pattern chosen over ref forwarding for simplicity
- SpeedPanel positioned inside map container div as absolute sibling for correct overlay
- Route line shows full path in red throughout animation rather than growing proportionally — grow-from-zero caused the line to appear invisible at animation start (first frame slice near-empty for long paths)
- SpeedPanel z-index 400 establishes clear hierarchy above DropZone (300)

## Deviations from Plan

### Auto-fixed Issues (triggered by user verification feedback)

**1. [Rule 1 - Bug] Route line disappears at animation start**
- **Found during:** Task 3 (human verification)
- **Issue:** `slicePath(route.path, 0, total)` returned empty/near-empty array on first frames, erasing the route line immediately when animation started
- **Fix:** Removed proportional path slicing from animation frame; `updateRouteLayer(map, route.path)` called every frame showing full path. Changed route layer color to red (#e63012) per user requirement.
- **Files modified:** `src/hooks/useAnimation.ts`, `src/lib/mapHelpers.ts`
- **Verification:** TypeScript compiles clean; 59 tests pass
- **Committed in:** `d2f7ac3`

**2. [Rule 1 - Bug] SpeedPanel hidden beneath DropZone buttons**
- **Found during:** Task 3 (human verification)
- **Issue:** SpeedPanel z-index 10 vs DropZone z-index 300 — slider covered when both visible
- **Fix:** Raised SpeedPanel z-index to 400
- **Files modified:** `src/components/SpeedPanel.tsx`
- **Verification:** Slider visually above DropZone buttons
- **Committed in:** `d2f7ac3`

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs found during human verification)
**Impact on plan:** Route display change alters animation aesthetic (full red path vs. growing yellow) but improves legibility and matches user expectation. No scope creep.

## Issues Encountered

None beyond the two bugs addressed above.

## Next Phase Readiness

- Phase 3 animation fully working and human-verified
- All three ANIM requirements (ANIM-01, ANIM-02, ANIM-03) completed
- Ready for Phase 4 polish work

## Self-Check: PASSED

All created files verified present. All task commits verified in git history.

---
*Phase: 03-search-animation*
*Completed: 2026-03-13*
