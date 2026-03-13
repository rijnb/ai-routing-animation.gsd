---
phase: 02-routing-engine
verified: 2026-03-13T12:50:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Place source marker and verify visual snap to road"
    expected: "Green circle marker appears ON the road segment (not at raw click point). Dashed orange line connects raw click point to snapped marker position."
    why_human: "MapLibre layer rendering and pixel-level position on road cannot be verified programmatically."
  - test: "Place destination marker and verify route line renders"
    expected: "Red destination marker appears ON a road. Bold red route line (width 5, color #e63012) appears connecting source to destination."
    why_human: "Visual correctness of A* path rendered on map requires browser inspection."
  - test: "Change routing mode and verify route updates"
    expected: "Switching between Car / Bicycle / Pedestrian in the bottom-right panel produces a visibly different route on the same source/destination pair (especially when motorways are involved)."
    why_human: "Requires visual comparison of rendered route paths across mode changes."
  - test: "Click >200m from any road and verify toast"
    expected: "'No road within 200m' toast appears at top of screen. No marker is placed."
    why_human: "Toast visibility and correct absence of marker requires browser interaction."
  - test: "New OSM file load resets routing state"
    expected: "After loading a new .osm.gz (or reloading same bundled map), all markers, route line, and mode selector reset to initial state."
    why_human: "State reset correctness requires triggering a second file load in browser."
---

# Phase 2: Routing Engine Verification Report

**Phase Goal:** Implement a complete routing engine that snaps clicks to the road graph, computes A* routes filtered by transport mode, and renders the route + markers on the map.
**Verified:** 2026-03-13T12:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can click the map to place a source marker that snaps to nearest road segment (within 200m) suitable for selected routing mode, at interpolated point on segment | VERIFIED (automated) + NEEDS HUMAN (visual) | `snapToNearestSegment` fully implemented and tested (5 tests GREEN); wired in `useRouter.handleMapClick`; rendered via `updateMarkersLayer` + `updateSnapIndicatorLayer` in MapView |
| 2 | User can click again to place a destination marker with same snap behavior | VERIFIED (automated) + NEEDS HUMAN (visual) | Same pipeline — cyclic click counter in `useRouter` alternates source/dest; destSnap passed to `MapView` |
| 3 | User can select car, bicycle, or pedestrian mode and three modes produce visibly different routes | VERIFIED (automated) + NEEDS HUMAN (visual) | `canUseEdge` OSM access matrix fully implemented (17 tests GREEN); `ModeSelector` wired to `setMode` in `App.tsx`; mode change triggers auto re-route in `useRouter.setMode` |
| 4 | If source and destination are in disconnected components, user sees a clear warning (not silent failure) | VERIFIED | Connectivity check in `useRouter.triggerRoute`: `componentMap[src.segmentNodeA] !== componentMap[dst.segmentNodeA]` sets `routeError`; App.tsx mirrors to toast with 4s auto-dismiss; worker also enforces with `route-error` message |
| 5 | Route computation completes with full A* search history recorded, starting/ending at interpolated segment points | VERIFIED | `aStar` records `searchHistory` on each node pop (17 tests GREEN); virtual node pattern in `osmWorker.handleRoute` injects `VIRTUAL_START`/`VIRTUAL_END` at snapped coords; path prepend/append with `sourceCoord`/`destCoord` |

**Score:** 5/5 truths verified (4 need additional human visual confirmation for rendered output)

---

### Required Artifacts

| Artifact | Purpose | Exists | Substantive | Wired | Status |
|----------|---------|--------|-------------|-------|--------|
| `src/lib/router.ts` | `RoutingMode`, `canUseEdge`, `aStar`, `haversineMeters` | YES | 177 lines, full A* with OSM access matrix | Imported by `graphBuilder.ts`, `segmentSnap.ts`, `osmWorker.ts`, `useRouter.ts` | VERIFIED |
| `src/lib/segmentSnap.ts` | `snapToNearestSegment` with mode filter and interpolation | YES | 106 lines, full flat-Earth projection | Imported by `useRouter.ts`, `osmWorker.ts` | VERIFIED |
| `src/lib/graphBuilder.ts` | `buildAdjacency` with union-find component detection | YES | 133 lines, full UnionFind + bidirectional edges | Imported by `osmWorker.ts` (called at load time) | VERIFIED |
| `src/workers/osmWorker.ts` | Typed `load`/`route` message protocol; virtual-node A* | YES | 155 lines, both handlers implemented | Used by `useOsmLoader.ts` (workerRef shared to `useRouter`) | VERIFIED |
| `src/hooks/useRouter.ts` | Click cycle, snap, connectivity check, worker dispatch | YES | 160 lines, full RouterState implementation | Used by `App.tsx` via `useRouter(workerRef, graph, componentMap)` | VERIFIED |
| `src/components/ModeSelector.tsx` | Three icon+label toggle buttons with `aria-pressed` | YES | 81 lines, three buttons with click handlers | Used by `App.tsx` when `geojson` non-null | VERIFIED |
| `src/lib/mapHelpers.ts` | `addRouteLayers`, `updateRouteLayer`, `updateMarkersLayer`, `updateSnapIndicatorLayer`, `clearRouteLayers` | YES | 210 lines, 5 new functions added to existing 3 | All imported and called by `MapView.tsx` | VERIFIED |
| `src/components/MapView.tsx` | Route/snap/marker layer management + click handler | YES | 96 lines, `addRouteLayers` on load, routing useEffect, stable-ref click handler | Used by `App.tsx` with all routing props | VERIFIED |
| `src/App.tsx` | Full wiring: useOsmLoader + useRouter + ModeSelector + toasts | YES | 111 lines, all hooks wired | Top-level component | VERIFIED |
| `src/hooks/useOsmLoader.ts` | Returns `graph`, `componentMap`, `workerRef` from done message | YES | 83 lines, `addEventListener` pattern, all three new fields returned | Used by `App.tsx` | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/__tests__/router.test.ts` | `src/lib/router.ts` | named import | VERIFIED | `import.*from.*router` confirmed in test file |
| `src/__tests__/segmentSnap.test.ts` | `src/lib/segmentSnap.ts` | named import | VERIFIED | `import.*from.*segmentSnap` confirmed |
| `src/lib/graphBuilder.ts` | `src/lib/router.ts` | imports `AdjacencyList`, `AdjacencyEdge`, `haversineMeters` | VERIFIED | Line 3-4: `import type { AdjacencyList, AdjacencyEdge }` + `import { haversineMeters }` |
| `src/lib/segmentSnap.ts` | `src/lib/router.ts` | imports `canUseEdge`, `haversineMeters`, `RoutingMode` | VERIFIED | Lines 10-11: `import { haversineMeters, canUseEdge } from './router'` |
| `src/hooks/useRouter.ts` | `src/workers/osmWorker.ts` | `postMessage({ type: 'route', ... })` | VERIFIED | Line 77: `workerRef.current?.postMessage({ type: 'route', source: ..., destination: ..., mode: ... })` |
| `src/hooks/useRouter.ts` | `src/lib/segmentSnap.ts` | `snapToNearestSegment` called on main thread | VERIFIED | Line 91: `snapToNearestSegment(lngLat, graph, modeRef.current, 200)` |
| `src/components/ModeSelector.tsx` | `src/hooks/useRouter.ts` | `mode` and `onModeChange` props | VERIFIED | `App.tsx` line 96-99: `<ModeSelector mode={mode} onModeChange={setMode} visible={true} />` |
| `src/App.tsx` | `src/hooks/useRouter.ts` | `useRouter(workerRef, graph, componentMap)` | VERIFIED | Line 25: `useRouter(workerRef, graph, componentMap)` |
| `src/components/MapView.tsx` | `src/lib/mapHelpers.ts` | `addRouteLayers` on load; `updateRouteLayer`/`updateMarkersLayer` on data change | VERIFIED | Lines 9-13: imports confirmed; line 56: `addRouteLayers(map)` in load handler; lines 85-87: called in routing useEffect |
| `src/App.tsx` | `src/components/ModeSelector.tsx` | `mode` and `onModeChange` from `useRouter` | VERIFIED | Lines 94-100: `{geojson && <ModeSelector mode={mode} onModeChange={setMode} visible={true} />}` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAP-01 | 02-01, 02-02, 02-03, 02-04 | Click to set source point — snaps to nearest road segment within 200m at interpolated point | SATISFIED | `snapToNearestSegment` fully implemented (5 tests); wired through `useRouter.handleMapClick` → `MapView` marker layer |
| MAP-02 | 02-01, 02-02, 02-03, 02-04 | Click to set destination point — same snap behavior | SATISFIED | Same `snapToNearestSegment` pipeline; destination click is odd `clickCount` in `useRouter` |
| ROUT-01 | 02-01, 02-02, 02-03, 02-04 | A* with full search history; route starts/ends at interpolated segment points | SATISFIED | `aStar` records `searchHistory` on pop (17 tests); virtual node pattern in `osmWorker.handleRoute` ensures interpolated endpoints |
| ROUT-02 | 02-01, 02-03, 02-04 | User can select routing mode: car, bicycle, pedestrian | SATISFIED | `ModeSelector` renders three buttons with `onModeChange`; mode change triggers auto re-route in `useRouter.setMode` |
| ROUT-03 | 02-01, 02-02 | Routing modes apply different speeds and OSM access restrictions | SATISFIED | `canUseEdge` enforces OSM access matrix (motorway car-only, footway pedestrian-only, cycleway bicycle-only, tag overrides); 17 tests cover all cases |
| PIPE-03 | 02-01, 02-02, 02-03 | Graph builder detects disconnected components; warns user if source/dest cannot be connected | SATISFIED | `buildAdjacency` with union-find (8 tests in graphBuilder.test.ts); connectivity check in `useRouter.triggerRoute` sets `routeError`; App.tsx shows toast |

**All 6 required requirements: SATISFIED.**

No orphaned requirements: REQUIREMENTS.md traceability table maps exactly MAP-01, MAP-02, ROUT-01, ROUT-02, ROUT-03, PIPE-03 to Phase 2 — all claimed and implemented.

---

### Test Suite Results

**Total: 42/42 tests GREEN across 7 test files.**

| Test File | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| `router.test.ts` | 17 | ALL GREEN | `canUseEdge` OSM access matrix + `aStar` path/history/disconnect |
| `segmentSnap.test.ts` | 5 | ALL GREEN | Snap to road, interpolated point, out-of-range null, mode filter, node IDs |
| `graphBuilder.test.ts` | 8 | ALL GREEN | Includes 4 PIPE-03 component detection tests (buildAdjacency, sameComponent) |
| `modeSelector.test.tsx` | 4 | ALL GREEN | Three buttons render, click handlers call `onModeChange`, `aria-pressed` |
| `osmParser.test.ts` | 4 | ALL GREEN | Phase 1 regression — no regressions |
| `dropZone.test.ts` | 2 | ALL GREEN | Phase 1 regression — no regressions |
| `osmPipeline.test.ts` | 2 | ALL GREEN | Phase 1 regression — no regressions |

**Production build:** `npm run build` exits 0. TypeScript `tsc --noEmit` exits 0 (no type errors).

---

### Anti-Patterns Found

None. No TODO/FIXME/PLACEHOLDER comments, no stub `return null` / `return {}` in implemented functions, no empty handlers, no console.log-only implementations found across all 9 phase 2 files.

---

### Human Verification Required

The following items require a running browser to confirm the visual integration layer works correctly. Automated checks (unit tests, TypeScript, build) all pass, but MapLibre rendering cannot be verified programmatically.

**Run `npm run dev` and open http://localhost:5173.**

#### 1. Source Marker Snaps Visually to Road

**Test:** Load a bundled map (e.g., Leiden). Click near a road segment.
**Expected:** A green circle marker appears ON the road (at the interpolated snap point, not at raw click position). A dashed orange line connects the raw click point to the snapped marker.
**Why human:** MapLibre pixel rendering position cannot be verified programmatically.

#### 2. Route Line Renders After Two Clicks

**Test:** After placing a source marker, click a second point near another road.
**Expected:** A red destination marker appears ON a road. A bold red line (width 5) connecting source to destination appears on the map.
**Why human:** Visual verification of A* path rendered as MapLibre layer.

#### 3. Mode Selector Produces Different Routes

**Test:** With both markers placed, click each mode button (Car, Bicycle, Pedestrian) in the bottom-right panel.
**Expected:** Switching modes produces a visibly different route, particularly when motorways or footways are present in the loaded area.
**Why human:** Requires visual comparison of rendered paths across mode changes.

#### 4. Error Toast on Out-of-Range Click

**Test:** Click on water, a park, or clearly >200m from any road.
**Expected:** "No road within 200m" toast appears. No marker is placed.
**Why human:** Toast visibility and correct marker absence require browser interaction.

#### 5. New OSM Load Resets State

**Test:** With markers and route visible, load the same bundled map again (or a different one).
**Expected:** All markers disappear, route line clears, mode selector resets to Car.
**Why human:** State reset sequence requires triggering a second file load in browser.

---

### Implementation Quality Notes

- **Virtual node pattern in worker:** `osmWorker.handleRoute` correctly creates a shallow copy of `adjacency` before adding `__vs__`/`__ve__` virtual nodes, uses spread when appending back-edges to avoid mutating original arrays. No shared state corruption.
- **Stale closure fix:** `MapView.tsx` uses `onMapClickRef` pattern (unconditional `useEffect` to sync ref to latest prop) so `map.on('click')` registered at mount always calls the current `handleMapClick` even after `graph` becomes available.
- **Worker multiplexing:** Both `useOsmLoader` and `useRouter` attach via `addEventListener('message', ...)` — no handler replacement conflicts.
- **Connectivity check:** Done on main thread before dispatching to worker using `componentMap`; worker also checks for `!adjacency || !osmGraph` guard. Double-safe.
- **Search history:** Recorded on pop (not discovery), each node ID appears exactly once — correct for Phase 3 animation replay.

---

_Verified: 2026-03-13T12:50:00Z_
_Verifier: Claude (gsd-verifier)_
