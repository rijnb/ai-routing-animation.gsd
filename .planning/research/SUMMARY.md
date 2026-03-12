# Project Research Summary

**Project:** OSM Routing Animator
**Domain:** Browser-based pathfinding algorithm visualization on real map data
**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

This is a fully client-side, portfolio-grade visualization tool that animates A* pathfinding on real OpenStreetMap road networks loaded from local .osm.gz files. The recommended approach is a vanilla TypeScript + Vite SPA using MapLibre GL JS for map rendering, with all heavy computation (parsing, graph building, routing) offloaded to a Web Worker. There is no server component, no UI framework, and no pathfinding library — the A* implementation is intentional as the core educational value of the project.

The recommended architecture follows a strict pipeline: gzip decompression → streaming XML parsing → graph construction (intersection-only nodes, mode-aware weighted edges) → A* with full search history recorded → animation replay via GeoJSON source mutation on MapLibre layers. The key insight from feature research is that everything depends on the OSM parse-to-graph pipeline; this must be built and validated first before any animation work begins.

The dominant risks are architectural: parsing large OSM XML on the main thread causes browser freezes (must use a Web Worker from the start), and the MapLibre GeoJSON source animation pattern has a known memory leak when updates are not throttled. Additionally, coordinate order confusion (OSM uses lat/lon; GeoJSON and MapLibre use lon/lat) is the single most common integration bug in mapping projects and must be addressed at the parse boundary, not scattered throughout the codebase. These pitfalls are all preventable with upfront design decisions and are not costly to address if built correctly from phase one.

## Key Findings

### Recommended Stack

The stack is lean and deliberate: Vite (no webpack overhead), TypeScript with strict mode (graph and geo code benefits significantly from type safety), MapLibre GL JS v5 (project constraint, ships its own types), and fflate for gzip decompression (fastest in-memory decompressor, ~10kB vs pako's 45kB). No UI framework — MapLibre manages its own DOM, and React/Vue would add abstraction without benefit for a map-centric app.

The graph and A* algorithm are custom implementations, not libraries. This is correct: pathfinding libraries return only the final path, not the exploration history needed for animation. The animation layer uses MapLibre's built-in GeoJSON sources with incremental `updateData()` calls — the WebGL custom layer alternative is vastly more complex for no meaningful gain at this scale.

**Core technologies:**
- TypeScript ~5.7 + Vite ^6: language and build tooling — fast DX, vanilla-ts template, no framework overhead
- MapLibre GL JS ^5.20: map rendering — project constraint, WebGL-powered, built-in TypeScript types
- fflate ^0.8: gzip decompression — fastest in-memory decompressor, 10kB bundle, ships TypeScript types
- DOMParser (browser built-in): OSM XML parsing — zero bundle cost, sufficient for city-scale, allows random node access needed for way resolution
- Custom A* + graph: routing engine — full control over search history recording required for animation
- Web Worker: computation isolation — prevents UI freeze during multi-second parse and route operations

### Expected Features

All 4 research files align on the same MVP priority order. The dependency chain is unambiguous: everything gates on the OSM file upload and parse pipeline. Until the graph exists, no other feature can be built or tested.

**Must have (table stakes):**
- OSM .osm.gz file upload + in-browser decompress + XML parse
- Road network graph rendered as GeoJSON overlay on MapLibre base map
- Click-to-set start/end points with nearest-node snapping
- A* implementation recording full search history
- Animated search frontier expansion (node-by-node on the map)
- Simultaneous optimal path animation (red line growing in sync with frontier)
- Play/pause and animation speed controls
- Routing mode selector (car / bicycle / pedestrian) with mode-aware edge weights
- Reset without page reload

**Should have (portfolio differentiators):**
- Dual animation showing frontier and path simultaneously — visually distinctive vs all grid-based demos
- Stats panel (nodes explored, path distance km, elapsed time) — educational + "wow" factor
- Step-through mode (advance exactly one expansion per button press)
- Frontier vs closed-set color distinction (cyan = open set, faded blue = closed)
- Keyboard shortcuts (space = play/pause, R = reset)
- Progress indicator during file parsing (decompress → parse → build graph stages)
- Camera auto-fit to start/end bounding box

**Defer (v2+ or never):**
- Algorithm comparison (Dijkstra vs A* side-by-side) — scope-heavy
- Node/edge hover info with OSM tag details — nice but not core
- Multiple algorithm support (BFS, DFS, Greedy) — defeats this project's focus
- Mobile/touch optimization — desktop demo per project scope
- Turn-by-turn directions, route export, elevation profiles, live traffic

### Architecture Approach

The architecture has five clearly separated layers: UI controls (file input, map click, animation controls), a state machine gating valid transitions (idle → loading → graphReady → routing → animating → done), a Web Worker containing the full computation pipeline (parser → graph builder → A* router), a rendering layer (MapLibre instance + GeoJSON sources), and an animation layer that replays pre-computed search history at a controllable rate. The critical design decision is that the graph lives entirely in the worker — only coordinate arrays cross the worker boundary, never the graph object itself.

**Major components:**
1. **Web Worker (routing-worker.ts)** — owns all computation: decompresses XML, parses OSM, builds graph, runs A*, returns path + search history as coordinate arrays
2. **AnimationRenderer** — replays search history frame-by-frame, batches N steps per frame, mutates persistent GeoJSON objects, calls `setData()` throttled to ~30fps
3. **StateMachine (app-state.ts)** — enforces valid app lifecycle; gates route computation until graph is ready, gates animation until route is computed
4. **MapManager (map/)** — owns all MapLibre interactions: base tiles, GeoJSON sources for graph overlay and animation layers, click-to-node snapping
5. **GraphBuilder (graph/)** — converts OSM ways to adjacency list; detects intersections (nodes referenced by 2+ ways become graph vertices); stores highway type on edges so mode-specific costs can be computed at query time without graph rebuild

### Critical Pitfalls

1. **Main-thread XML parsing freeze** — a city OSM extract can be 50-500MB of XML; DOMParser on the main thread blocks for seconds. Always run parsing in a Web Worker with a progress indicator. Retrofitting a Web Worker around synchronous parsing is painful; design with it from day one.

2. **MapLibre GeoJSON memory leak** — calling `source.setData()` every `requestAnimationFrame` queues updates faster than MapLibre's worker can process them; memory grows until tab crashes. Throttle map source updates to ~30fps and batch multiple search steps per frame. Use `updateData()` for incremental feature additions instead of rebuilding full GeoJSON collections each frame.

3. **Coordinate order confusion** — OSM uses `lat, lon` order; GeoJSON and MapLibre require `lon, lat`. Points silently appear in the wrong location (often the ocean). Convert to lon/lat immediately at the parse boundary and define a typed `LngLat = [number, number]` throughout the codebase.

4. **Disconnected graph components** — real OSM data has dozens of isolated subgraphs (parking lots, service roads, construction). Snapping a click to a node in a disconnected component silently produces "no route found." Run connected-components analysis after graph build and restrict snapping to the largest component.

5. **Inadmissible A* heuristic** — if edge weights are travel time (distance / speed), the haversine heuristic must be divided by the maximum speed in the graph, otherwise it overestimates and A* returns suboptimal paths. Decide on distance vs time weights before writing the algorithm; distance weights are simpler and avoid this issue for a portfolio demo.

## Implications for Roadmap

Based on the feature dependency chain and architecture build order, five phases are suggested.

### Phase 1: Foundation and Data Pipeline

**Rationale:** Nothing else can be built until the graph exists. All 4 research files agree on this: the OSM parse-to-graph pipeline is the dependency root. This phase must also establish coordinate conventions and the Web Worker architecture — retrofitting both later is expensive.

**Delivers:** A working graph built from a real .osm.gz file, displayed as a road network overlay on the map, with the state machine wired up.

**Addresses features:**
- OSM .osm.gz file upload and in-browser decompression
- OSM XML parsing → graph construction (intersections, mode-aware edges, access tags, oneway handling)
- MapLibre base map with road network GeoJSON overlay
- State machine (idle → loading → graphReady)
- Progress indicator during parse stages

**Critical pitfalls to avoid:**
- Web Worker is required from the start (Pitfall 5: main-thread freeze)
- Coordinate order convention established at parse boundary (Pitfall 6: lat/lon confusion)
- Connected component analysis run immediately after graph build (Pitfall 2: disconnected components)
- Oneway and access tag logic centralized in `graph/weights.ts` (Pitfall 4: tag misinterpretation)

### Phase 2: Routing

**Rationale:** With a validated graph on screen, A* can be built and tested in isolation before animation is added. Separating routing from animation is essential — A* must record the full search history, and that contract must be correct before building the replay engine.

**Delivers:** A* running in the worker, returning path + ordered search history as coordinate arrays; click-to-set start/end with node snapping; routing mode selector.

**Addresses features:**
- A* implementation with search history recording
- Haversine heuristic (distance-weighted, admissible without speed correction)
- Click-to-nearest-node snapping (restricted to largest graph component)
- Routing mode selector (car / bicycle / pedestrian)
- State transitions: graphReady → routing → animating

**Critical pitfalls to avoid:**
- A* heuristic admissibility — use distance weights, not time weights, to keep haversine directly admissible (Pitfall 1)
- Priority queue must be a binary heap, not array sort (performance trap from PITFALLS.md)
- Pre-compute edge distances during graph build, use equirectangular approximation for heuristic (not full haversine in hot loop)

### Phase 3: Core Animation

**Rationale:** This is the product's reason to exist. With routing working, the animation engine replays the pre-computed search history. The dual animation (frontier + path simultaneously) is the primary differentiator and must be built with correct throttling from the start.

**Delivers:** Animated A* visualization — frontier expanding on map while optimal path grows simultaneously; play/pause; speed control.

**Addresses features:**
- Animated search frontier (batched GeoJSON source updates, ~30fps throttle)
- Simultaneous optimal path animation (red line growing in sync)
- Play/pause toggle
- Animation speed control (nodes-per-frame multiplier)
- Reset/clear animation state

**Critical pitfalls to avoid:**
- Throttle MapLibre source updates — never call setData every requestAnimationFrame (Pitfall 3: memory leak)
- Batch N steps per frame (default ~50 at 1x speed) — never animate one node per frame (Architecture anti-pattern 2)
- Keep persistent GeoJSON objects; push new features into existing array rather than rebuilding (Architecture anti-pattern 3)

### Phase 4: Polish

**Rationale:** With the core loop working, polish features add portfolio-grade quality. These are all low-risk additions that do not affect architecture.

**Delivers:** Stats panel, step-through mode, keyboard shortcuts, frontier vs closed-set color distinction, camera auto-fit.

**Addresses features:**
- Stats panel (nodes explored, path distance, elapsed time) — live-updating during animation
- Step-through mode (advance exactly 1 step per keypress/button)
- Keyboard shortcuts (space = play/pause, R = reset, arrow keys = step)
- Two-color frontier: cyan (open set) vs faded blue (closed/visited)
- Camera `fitBounds()` to start/end bounding box when points are set

### Phase 5: Hardening

**Rationale:** The "looks done but isn't" checklist from PITFALLS.md surfaces real-data failure modes that unit tests with small files will not catch. This phase addresses UX edge cases and performance with real city extracts.

**Delivers:** Graceful error handling, tested against real city data, confirmed memory stability during long animation runs.

**Addresses:**
- Graceful "no route found" with user-readable explanation (not just a console error)
- Handle both .osm and .osm.gz input (check magic bytes before decompression)
- Animation memory stability test (60-second run, flat memory profile)
- Routing mode visual distinction (dim roads unavailable to selected mode)
- Error states wired to UI (parse failure, worker crash)

### Phase Ordering Rationale

- Phases 1 → 2 → 3 are a strict dependency chain: graph must exist before routing, routing must exist before animation
- The Web Worker architecture must be established in Phase 1 — the PITFALLS research explicitly calls out that retrofitting a Worker around synchronous code is high-cost
- Phase 4 polish features are all independent of each other and can be reordered or dropped without affecting the core
- Phase 5 hardening is last because it requires real data and a running animation to test against — cannot be done earlier

### Research Flags

Phases with standard patterns (no additional research needed):
- **Phase 3 (Animation):** MapLibre GeoJSON animation is well-documented with official examples; the throttle pattern is established
- **Phase 4 (Polish):** All features use standard MapLibre and DOM APIs

Phases that may benefit from deeper research before implementation:
- **Phase 1 (Data Pipeline) — OSM tag parsing:** The oneway/access tag logic is documented on the OSM wiki but real-world data has country-specific exceptions. Start with the pragmatic subset documented in PITFALLS.md (Pitfall 4) and treat the tag table as a living document.
- **Phase 2 (Routing) — Node snapping spatial index:** Click-to-nearest-node requires a spatial index (QuadTree or k-d tree) for O(log n) lookup. The FEATURES.md notes this but no specific library is recommended. A simple flat array linear scan is acceptable for graphs up to ~30K nodes; beyond that, research a lightweight spatial index.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs and npm; versions confirmed current |
| Features | HIGH | Informed by multiple existing OSM/pathfinding visualizer implementations; dependencies are unambiguous |
| Architecture | HIGH | Patterns are well-established (Web Worker for compute, GeoJSON animation, state machine); pitfalls verified against MapLibre issue tracker |
| Pitfalls | HIGH | Critical pitfalls verified against OSM wiki, MapLibre GitHub issues, and known routing engine patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **Tile source selection:** STACK.md lists MapTiler free tier as simplest for portfolio, but requires an API key. An alternative (OpenFreeMap, demotiles.maplibre.org) should be selected during Phase 1 setup to avoid key management complexity during development.
- **SAX vs DOMParser for large files:** STACK.md recommends DOMParser for city-scale files (under ~50MB XML), but ARCHITECTURE.md and PITFALLS.md recommend a SAX-style parser for large files. For the stated use case (city-scale extracts), DOMParser in a Worker is acceptable as a starting point; if performance is unacceptable with real data in Phase 1, migrate to a streaming parser. This is a known trade-off, not an unknown.
- **Spatial index for node snapping:** No specific library recommended. Evaluate during Phase 2; implement linear scan first and profile with real data before adding a dependency.

## Sources

### Primary (HIGH confidence)
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) — GeoJSON source API, animation patterns, CustomLayerInterface
- [MapLibre GeoJSON memory leak issue #6154](https://github.com/maplibre/maplibre-gl-js/issues/6154) — animation throttle requirement confirmed
- [fflate GitHub](https://github.com/101arrowz/fflate) — performance benchmarks, API documentation
- [OSM Key:oneway wiki](https://wiki.openstreetmap.org/wiki/Key:oneway) — oneway tag rules, implied oneways, bicycle exceptions
- [OSM Access Restrictions for routing](https://wiki.openstreetmap.org/wiki/OSM_tags_for_routing/Access_restrictions) — highway type defaults by mode

### Secondary (MEDIUM confidence)
- [dominikschweigl OSM path visualizer](https://dominikschweigl.github.io/osm-path-visualizer/) — closest existing implementation; informed feature scope
- [Red Blob Games — Introduction to A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html) — search history recording pattern
- [OSM Help — Building a graph from OSM XML](https://help.openstreetmap.org/questions/38328/building-a-graph-out-of-osm-xml) — intersection detection and edge creation

### Tertiary (LOW confidence)
- [MapLibre large GeoJSON optimization guide](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/) — coordinate precision recommendations; may be version-specific
- [Building a Weighted Graph based on OSM Data for Routing (Technion)](https://socialhub.technion.ac.il/wp-content/uploads/2017/08/revise_version-final.pdf) — academic reference for OSM graph construction; older but foundational

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
