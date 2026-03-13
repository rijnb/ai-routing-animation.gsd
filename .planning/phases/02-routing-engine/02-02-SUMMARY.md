---
phase: 02-routing-engine
plan: "02"
subsystem: routing
tags: [typescript, astar, pathfinding, osm, graph, union-find, haversine]

# Dependency graph
requires:
  - phase: 02-routing-engine/02-01
    provides: Type stubs for router.ts, graphBuilder.ts, segmentSnap.ts and RED test files
provides:
  - haversineMeters([lon,lat],[lon,lat]) distance function in router.ts
  - canUseEdge(tags, mode) OSM access matrix with tag overrides
  - aStar(adjacency, startId, goalId, nodes, mode) full A* with searchHistory
  - buildAdjacency(ways, nodes) returning adjacency, componentMap, sameComponent
  - snapToNearestSegment(clickPoint, graph, mode, maxDistanceMeters) returning SnapResult | null
affects:
  - 02-03 (worker bridge consumes aStar, buildAdjacency, snapToNearestSegment)
  - 02-04 (animation layer consumes searchHistory from RouteResult)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Union-find with path compression for connected component detection
    - Flat-Earth projection with cosine-corrected longitude for segment snapping
    - OSM highway access matrix + tag override pattern for mode-aware routing

key-files:
  created: []
  modified:
    - src/lib/router.ts
    - src/lib/graphBuilder.ts
    - src/lib/segmentSnap.ts

key-decisions:
  - "buildAdjacency accepts (ways, nodes) as two separate args — test contract differs from plan spec (OsmGraph object); test file is authoritative"
  - "buildAdjacency returns sameComponent function alongside adjacency and componentMap — convenience wrapper over union-find"
  - "haversineMeters placed in router.ts as single source; graphBuilder and segmentSnap import from there"
  - "segmentSnap uses flat-Earth cosine-corrected projection (not spherical) — accurate enough for city-scale, avoids trig overhead"

patterns-established:
  - "OSM access matrix: check highway defaults first, then apply tag overrides (access, foot, bicycle, motor_vehicle)"
  - "A* searchHistory: push node ID on pop from open set (not on discovery), each ID appears once"
  - "Coordinate convention: [lon, lat] throughout (GeoJSON order), matches nodes Map values"

requirements-completed: [MAP-01, MAP-02, ROUT-01, ROUT-03, PIPE-03]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 2 Plan 02: Algorithm Implementation Summary

**A* pathfinding with haversine heuristic, OSM mode-aware access matrix, union-find component detection, and flat-Earth segment snapping — all three algorithm modules GREEN (30/30 tests)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-13T12:22:36Z
- **Completed:** 2026-03-13T12:24:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented `haversineMeters`, `canUseEdge`, and `aStar` in `router.ts` — full A* with mode filtering and search history recording
- Implemented `buildAdjacency` in `graphBuilder.ts` — union-find component detection, bidirectional edge list, convenience `sameComponent` function
- Implemented `snapToNearestSegment` in `segmentSnap.ts` — flat-Earth projection onto segments, mode-filtered, distance-bounded, returns `SnapResult | null`

## Task Commits

Each task was committed atomically:

1. **Task 1: graphBuilder.buildAdjacency with union-find component detection** - `b3958da` (feat)
2. **Task 2: canUseEdge + aStar in router.ts and snapToNearestSegment in segmentSnap.ts** - `a2d8362` (feat)

## Files Created/Modified

- `src/lib/router.ts` — haversineMeters, canUseEdge (OSM access matrix), aStar (full A* implementation)
- `src/lib/graphBuilder.ts` — ComponentMap type, UnionFind class, buildAdjacency function
- `src/lib/segmentSnap.ts` — projectPointOnSegment helper, snapToNearestSegment implementation

## Decisions Made

- `buildAdjacency` accepts `(ways, nodes)` as two separate args — the test file is authoritative; plan spec said `OsmGraph` object but tests call with two args
- `buildAdjacency` returns `sameComponent` convenience function — tests expect it in the return object
- `haversineMeters` placed in `router.ts` as the single source of truth; both `graphBuilder.ts` and `segmentSnap.ts` import from there
- Flat-Earth cosine-corrected projection used in segment snap — accurate for city-scale, matches RESEARCH.md guidance

## Deviations from Plan

None — plan executed exactly as written (minor adaptation: `buildAdjacency` return signature adapted to match actual test expectations which differ slightly from plan spec, but this is correct behavior since tests are authoritative).

## Issues Encountered

- Pre-existing failures in `modeSelector.test.tsx` (2 tests) — unrelated to this plan, documented as out of scope per deviation rules scope boundary. These tests were failing before plan 02-02 execution.

## Next Phase Readiness

- All algorithm modules fully implemented and tested (30/30 GREEN)
- `AdjacencyList`, `RoutingMode`, `RouteResult`, `SnapResult`, `ComponentMap` types stable for Plans 03 and 04
- Plan 03 (worker bridge) can now import and wire `buildAdjacency`, `aStar`, `snapToNearestSegment`

---
*Phase: 02-routing-engine*
*Completed: 2026-03-13*
