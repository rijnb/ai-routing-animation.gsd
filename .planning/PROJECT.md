# OSM Routing Animator

## What This Is

A TypeScript browser application for visualizing graph-based pathfinding on real map data. Users upload a gzipped OSM file, click two points on the rendered map, select a routing mode (car, bicycle, or pedestrian), and watch A* search the road network — the search frontier expands node-by-node while the optimal path (pre-calculated) grows highlighted in red simultaneously.

## Core Value

A visually impressive, interactive A* pathfinding animation on real OpenStreetMap data with mode-aware routing — a portfolio-grade algorithm visualization demo.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can upload a gzipped OSM file (.osm.gz) and see the road network rendered on screen
- [ ] User can click two points on the map to set source and destination
- [ ] User can select routing mode: car, bicycle, or pedestrian
- [ ] User sees the A* search frontier animate node-by-node across the graph
- [ ] The optimal path (pre-calculated) is always shown in red as the search grows toward it
- [ ] Different routing modes produce visibly different routes (road type and access constraints)
- [ ] Animation speed is controllable (pause, step, fast-forward)

### Out of Scope

- Server-side routing or tile servers — fully client-side, no backend
- Real-time traffic or dynamic map data — static OSM snapshot only
- Turn-by-turn directions or navigation UI — visual demo, not GPS
- Mobile app or touch-first UI — desktop browser demo
- Multi-stop routing — single source-to-destination only

## Context

- This is a portfolio/demo project — visual impressiveness and algorithmic correctness matter more than production robustness
- OSM data: nodes (lat/lon), ways (sequences of node references with tags), relations — the graph is built from ways tagged as roads/paths
- Routing modes differ by which OSM way tags are traversable and what speed weights apply (e.g., `highway=motorway` for cars only, `bicycle=yes/no`, `foot=yes/no`)
- A* pre-calculates the full path, then replays the search frontier animation synchronized with the growing red path
- Map rendering must handle potentially large OSM datasets (small city extracts can have hundreds of thousands of nodes)

## Constraints

- **Tech**: TypeScript throughout — no JavaScript, no backend, pure browser runtime
- **Rendering**: MapLibre GL JS for tile-based map rendering — OSM road network and animation overlaid on top
- **Input**: Gzipped OSM XML (.osm.gz) — must decompress and parse in-browser
- **Scope**: Portfolio demo — correctness of routing > exhaustive edge case handling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pre-calculate path before animating | "The optimal path should always be highlighted in red as it grows" — requires knowing the path upfront | — Pending |
| Gzipped OSM input only | User specified .osm.gz — need in-browser decompression (DecompressionStream API) | — Pending |
| Client-side only | Portfolio demo context — no backend needed, simpler deployment | — Pending |
| MapLibre GL JS for rendering | User specified — tile-based renderer, OSM routing graph and animation overlaid as custom layers | — Pending |

---
*Last updated: 2026-03-12 after initialization*
