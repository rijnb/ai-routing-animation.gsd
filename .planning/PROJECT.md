# OSM Routing Animator

## What This Is

A TypeScript browser application for visualizing graph-based pathfinding on real map data. Users upload a gzipped OSM file, click two points on the rendered map, select a routing mode (car, bicycle, or pedestrian), and watch A* search the road network — the search frontier expands node-by-node while the optimal path (pre-calculated) is always shown in red. One-way streets, access restrictions, barriers, and construction zones are fully respected per transport mode.

## Core Value

A visually impressive, interactive A* pathfinding animation on real OpenStreetMap data with mode-aware routing — a portfolio-grade algorithm visualization demo.

## Requirements

### Validated

- ✓ User can upload a gzipped OSM file (.osm.gz) and see the road network rendered on screen — v1.0
- ✓ User can click two points on the map to set source and destination — v1.0
- ✓ User can select routing mode: car, bicycle, or pedestrian — v1.0
- ✓ User sees the A* search frontier animate node-by-node across the graph — v1.0
- ✓ The optimal path (pre-calculated) is always shown in red as the search grows toward it — v1.0 (full path shown from frame 0, intentional for visibility)
- ✓ Different routing modes produce visibly different routes (road type and access constraints) — v1.0
- ✓ Animation speed is controllable (pause, step, fast-forward) — v1.0

### Active

- [ ] Unified dark-themed floating control panel (drop zone, mode selector, speed slider, animation controls)
- [ ] Futuristic stats HUD overlay (distance, travel time, nodes explored — technical readout style)
- [ ] Custom-styled mode selector (car/bicycle/pedestrian icon toggle)
- [ ] Custom-styled speed slider and animation controls (play/pause/step as media player)
- [ ] Consistent dark/techy visual theme across all UI elements

### Out of Scope

- Server-side routing or tile servers — fully client-side, no backend
- Real-time traffic or dynamic map data — static OSM snapshot only
- Turn-by-turn directions or navigation UI — visual demo, not GPS
- Mobile app or touch-first UI — desktop browser demo
- Multi-stop routing — single source-to-destination only

## Context

- Shipped v1.0 with ~3,900 lines TypeScript/TSX. Tech stack: Vite 8, React 19, TypeScript, MapLibre GL JS, Vitest, fflate (in-browser gzip).
- OSM parsing runs in a Web Worker to keep UI responsive on large files.
- A* pre-calculates the full path, then replays the search frontier animation synchronized with the growing red path line.
- 152 tests passing covering routing logic, animation utilities, and stats calculations.
- Known tech debt: several visual/interactive behaviors (snap indicator, overlay fade-in, animation experience) require browser confirmation only; dead import (`updateMarkersLayer`) and orphaned export (`formatDistance`) remain in codebase.

## Constraints

- **Tech**: TypeScript throughout — no JavaScript, no backend, pure browser runtime
- **Rendering**: MapLibre GL JS for tile-based map rendering — OSM road network and animation overlaid on top
- **Input**: Gzipped OSM XML (.osm.gz) — must decompress and parse in-browser
- **Scope**: Portfolio demo — correctness of routing > exhaustive edge case handling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pre-calculate path before animating | "The optimal path should always be highlighted in red as it grows" — requires knowing the path upfront | ✓ Good — full red path shown from frame 0 (intentional deviation from proportional growth) |
| Gzipped OSM input only | User specified .osm.gz — need in-browser decompression (DecompressionStream API) | ✓ Good — fflate used instead, works reliably |
| Client-side only | Portfolio demo context — no backend needed, simpler deployment | ✓ Good — no deployment complexity |
| MapLibre GL JS for rendering | User specified — tile-based renderer, OSM routing graph and animation overlaid as custom layers | ✓ Good — performant with large datasets |
| OSM parsing in Web Worker | Large city extracts have hundreds of thousands of nodes — must not freeze UI | ✓ Good — UI stays responsive |
| Union-find for disconnected component detection | Catch unreachable source/destination early before A* runs | ✓ Good — fast pre-check |
| Frame-skip mechanism for slow animation | Linear nodesPerFrame formula bottlenecked at 1 node/frame; frame-skip allows sub-1 effective rate | ✓ Good — 10x slower min speed achieved |
| Guard animation start on route.found | A* returns found=false with full searchHistory; was triggering silent exhaustive animation | ✓ Good — fixed, shows error toast immediately |

## Current Milestone: v1.1 UI Overhaul

**Goal:** Redesign the UI into a polished dark/techy portfolio piece — unified control panel, futuristic stats HUD, and consistent visual theme.

**Target features:**
- Unified floating control panel (drop zone + mode selector + speed + playback controls)
- Futuristic stats HUD (distance, time, nodes — styled as technical data readout)
- Dark/techy visual theme and consistent component styling

---
*Last updated: 2026-03-15 after v1.1 milestone start*
