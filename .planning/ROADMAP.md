# Roadmap: OSM Routing Animator

## Overview

This roadmap delivers a browser-based A* pathfinding visualizer on real OpenStreetMap data in four phases following the strict dependency chain: the graph must exist before routing can work, routing must produce search history before animation can replay it, and stats and drag interaction refine the complete experience. Every phase delivers a coherent, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Pipeline and Map Foundation** - Upload .osm.gz, parse in Web Worker, render road network on MapLibre base map (completed 2026-03-12)
- [ ] **Phase 2: Routing Engine** - Click-to-set source/destination with segment snapping, A* with mode-aware search history, disconnected component handling
- [ ] **Phase 3: Search Animation** - Animated frontier expansion and simultaneous path growth with speed control
- [ ] **Phase 4: Stats and Marker Interaction** - Live stats panel, drag-to-reposition markers with route recalculation

## Phase Details

### Phase 1: Data Pipeline and Map Foundation
**Goal**: Users can load a real OSM file and see the road network rendered on an interactive map
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-04, MAP-03
**Success Criteria** (what must be TRUE):
  1. User can select a .osm.gz file (via file picker or drag-and-drop) and see a progress indication while it loads
  2. The browser UI remains responsive (no freeze) while the file is being decompressed and parsed
  3. The parsed road network appears as a visible overlay on top of MapLibre base map tiles
  4. User can pan and zoom the map freely, including while the road overlay is displayed
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Vite + React + TypeScript project with Vitest test infrastructure and Wave 0 failing test stubs
- [ ] 01-02-PLAN.md — Implement OSM parsing pipeline: osmParser, graphBuilder, osmWorker, useOsmLoader hook (all tests GREEN)
- [ ] 01-03-PLAN.md — Build all UI components (MapView, ApiKeyModal, SettingsPanel, DropZone, LoadingOverlay) and wire the complete application

### Phase 2: Routing Engine
**Goal**: Users can click two points on the map, select a routing mode, and get a computed route with full search history ready for animation
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, ROUT-01, ROUT-02, ROUT-03, PIPE-03
**Success Criteria** (what must be TRUE):
  1. User can click the map to place a source marker that snaps to the nearest road segment (within 200m) suitable for the selected routing mode, at the interpolated point on that segment
  2. User can click the map to place a destination marker with the same segment-snapping behavior
  3. User can select car, bicycle, or pedestrian mode and the three modes produce visibly different routes on the same source/destination pair
  4. If source and destination are in disconnected graph components, the user sees a clear warning (not a silent failure)
  5. Route computation completes with full A* search history recorded, starting and ending at interpolated segment points (not just graph nodes)
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Wave 0 TDD stubs: router.ts, segmentSnap.ts, ModeSelector.tsx type contracts + RED test files
- [ ] 02-02-PLAN.md — Core algorithms GREEN: graphBuilder adjacency+union-find, A* with history, segment snapping
- [ ] 02-03-PLAN.md — Worker + hook layer: osmWorker route handler, useRouter hook, ModeSelector complete
- [ ] 02-04-PLAN.md — Map integration + App wiring: route/marker/snap layers, full App.tsx wiring, human verify

### Phase 3: Search Animation
**Goal**: Users watch the A* search frontier expand across the map while the optimal path grows in yellow — the core visual experience
**Depends on**: Phase 2
**Requirements**: ANIM-01, ANIM-02, ANIM-03
**Success Criteria** (what must be TRUE):
  1. The search frontier expands node-by-node on the map with visited and frontier nodes visually distinct from each other
  2. The optimal path grows as a yellow line simultaneously with the frontier expansion, always visible
  3. User can adjust animation speed via a slider — from slow (individual node steps visible) to fast (rapid sweep)
  4. Animation runs smoothly without browser tab memory growth or frame drops (GeoJSON updates throttled to ~30fps)
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — TDD: pure animation utilities (filterHistory, slicePath, computeNodesPerFrame) RED then GREEN
- [ ] 03-02-PLAN.md — MapLibre frontier circle layers + useAnimation rAF hook + route color yellow
- [ ] 03-03-PLAN.md — SpeedPanel component, MapView/App.tsx wiring, human verify

### Phase 4: Stats and Marker Interaction
**Goal**: Users get quantitative feedback on the route and can refine source/destination by dragging markers
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. A live counter shows the number of nodes explored, updating in real time during animation
  2. After the route is found, path distance in km is displayed
  3. Estimated travel time is displayed, derived from the selected routing mode's speed assumptions
  4. User can drag the source or destination marker to a new position, and a full route recalculation and animation restart occurs automatically
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline and Map Foundation | 3/3 | Complete   | 2026-03-13 |
| 2. Routing Engine | 3/4 | In Progress|  |
| 3. Search Animation | 0/3 | Not started | - |
| 4. Stats and Marker Interaction | 0/2 | Not started | - |
