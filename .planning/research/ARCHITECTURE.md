# Architecture

**Project:** AI Routing Animation — browser-based A* pathfinding visualiser on real OpenStreetMap data.
**Stack:** TypeScript, React 19, Vite 8, MapLibre GL JS 5, fflate, Vitest
**Status:** v1.0 complete (152 passing tests, ~3,900 lines of TypeScript/TSX)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React UI Layer                          │
│  App.tsx (root, state wiring)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ DropZone │ │MapView   │ │ModeSelect│ │StatsPanel +      │  │
│  │          │ │(MapLibre)│ │SpeedPanel│ │LoadingOverlay +  │  │
│  └──────────┘ └──────────┘ └──────────┘ │ApiKeyModal +     │  │
│                                          │SettingsPanel     │  │
│                                          └──────────────────┘  │
├────────────────────────────────────────────────────────────────-┤
│                     React Hooks (stateful logic)                │
│  useOsmLoader   useRouter   useAnimation                        │
├─────────────────────────────────────────────────────────────────┤
│                     Core Library (pure functions)               │
│  osmParser  graphBuilder  router  segmentSnap                   │
│  mapHelpers  animationUtils  osmLoader  routeStats  apiKeyStore │
├─────────────────────────────────────────────────────────────────┤
│                     Web Worker                                  │
│  osmWorker.ts  (parse → build → route, runs off main thread)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── main.tsx                     # React entry point
├── App.tsx                      # Root component — wires hooks to UI, owns mapRef
│
├── components/
│   ├── ApiKeyModal.tsx           # First-run modal — collects TomTom API key
│   ├── DropZone.tsx              # Drag-and-drop / file browse + bundled-map buttons
│   ├── LoadingOverlay.tsx        # Full-screen semi-transparent progress overlay
│   ├── MapView.tsx               # MapLibre GL JS wrapper; manages map lifecycle and layers
│   ├── ModeSelector.tsx          # Car / Bicycle / Pedestrian toggle buttons
│   ├── SettingsPanel.tsx         # Gear-icon settings dropdown (clear API key)
│   ├── SpeedPanel.tsx            # Animation speed slider (0.5x – 5x)
│   └── StatsPanel.tsx            # Live stats: nodes explored, distance, estimated time
│
├── hooks/
│   ├── useAnimation.ts           # requestAnimationFrame loop; drives frontier + route layers
│   ├── useOsmLoader.ts           # Worker lifecycle, load-file dispatch, progress/done state
│   └── useRouter.ts              # Click-to-route, mode changes, marker drag, worker messages
│
├── lib/
│   ├── animationUtils.ts         # filterHistory, computeFrameParams (speed → nodes/frame)
│   ├── apiKeyStore.ts            # localStorage read/write/clear for TomTom API key
│   ├── graphBuilder.ts           # OSM ways → GeoJSON + adjacency list + UnionFind components
│   ├── mapHelpers.ts             # All MapLibre source/layer helpers (add, update, clear)
│   ├── osmLoader.ts              # File → ArrayBuffer → postMessage to worker
│   ├── osmParser.ts              # Regex-based OSM XML parser (runs in worker scope)
│   ├── router.ts                 # A* engine, canUseEdge access matrix, haversineMeters
│   ├── routeStats.ts             # estimateTravelTime, formatDistance, formatTime
│   └── segmentSnap.ts            # Project click point onto nearest accessible road segment
│
└── workers/
    └── osmWorker.ts              # Web Worker: load → decompress → parse → build → route
```

---

## Module Responsibilities

### `src/workers/osmWorker.ts`

The only Web Worker. Maintains two persistent module-level variables across messages:

- `osmGraph: OsmGraph | null` — the parsed OSM graph (nodes, ways, barrierNodes)
- `adjacency: AdjacencyList | null` — the built routing graph

Handles two message types:

| Message in | What it does | Messages out |
|---|---|---|
| `ArrayBuffer` (legacy) or `{ type: 'load', buffer }` | gunzipSync → parse → buildRoadGeoJson → buildAdjacency | `progress` (×3), `done` |
| `{ type: 'route', source, destination, mode }` | snapToNearestSegment ×2 → inject virtual nodes → aStar | `route-done` or `route-error` |

**Virtual node pattern for segment snapping:** When routing, the worker creates two virtual node IDs (`__vs__` for start, `__ve__` for end). It injects them into a shallow-copied adjacency list so A* starts/ends at the snapped point rather than the nearest graph node. The `__vs__` and `__ve__` entries are filtered out of `searchHistory` before animation (see `filterHistory`).

### `src/lib/osmParser.ts`

Parses an OSM XML string using regex (not DOMParser — DOMParser is unavailable in Web Workers).

**Key outputs** (`OsmGraph`):
- `nodes: Map<string, [lon, lat]>` — all OSM nodes, GeoJSON coordinate order
- `ways: OsmWay[]` — road-classified ways only, with `id`, `nodeRefs[]`, `tags`
- `barrierNodes: Map<string, string>` — nodes with a `barrier` tag (e.g. `bollard`, `gate`)

Road filter: only `highway` values in a fixed `ROAD_TYPES` set are kept.

### `src/lib/graphBuilder.ts`

Two exported functions:

**`buildRoadGeoJson(ways, nodes)`** — converts ways to a `FeatureCollection<LineString>` for the road overlay layer. Each feature carries `properties.highway`.

**`buildAdjacency(ways, nodes, barrierNodes?)`** — builds a bidirectional weighted adjacency list:
- Edge weight = haversine distance in metres between consecutive way nodes
- One-way enforcement: `oneway=yes` sets `onewayReversed: true` on the reverse edge; `oneway=-1` sets it on the forward edge
- Barrier propagation: if node B has a barrier tag, the A→B edge carries `barrier: <value>` in its tags; and vice versa for B→A
- Also runs **UnionFind** (path-compressed disjoint-set) over all connected nodes, returning a `ComponentMap` (`nodeId → root representative`) for fast disconnectivity detection in the router hook

### `src/lib/router.ts`

Three exports used widely across the codebase:

**`haversineMeters(a, b)`** — full haversine formula, earth radius 6371km. Used for both edge weights and the A* heuristic.

**`canUseEdge(edge, mode)`** — returns `false` if the edge is inaccessible for the given mode. Checks in order:
1. `highway=construction` or `construction=yes` → block all
2. Highway type access matrix (`HIGHWAY_ACCESS`) — e.g. motorway blocks bicycle/pedestrian
3. `access=no`, `access=private/destination/permit/customers` (car only), mode-specific tag overrides (`foot=no`, `bicycle=no`, `motor_vehicle=no`, `motorcar=no`, `vehicle=no`)
4. Barrier type matrix (wall/fence block all; bollard/gate/pole/etc block cars; kissing_gate/stile/turnstile block cars and bikes)
5. `onewayReversed` — blocks cars; blocks bikes unless `oneway:bicycle=no`; pedestrians are always allowed

**`aStar(adjacency, startId, goalId, nodes, mode)`** — standard A* with haversine heuristic. Returns `RouteResult`:
- `path: [number, number][]` — lon/lat coordinates of optimal path (empty if no route)
- `searchHistory: string[]` — node IDs in exploration order (used to drive animation)
- `distance: number` — total metres
- `found: boolean`

The open set is a plain `Set<string>` iterated linearly to find minimum fScore (adequate for city-scale graphs).

### `src/lib/segmentSnap.ts`

**`snapToNearestSegment(clickPoint, graph, mode, maxDistanceMeters)`** — iterates all way segments accessible for `mode`, projects `clickPoint` onto each segment using flat-earth cosine-corrected projection, returns the nearest projected point within `maxDistanceMeters` as a `SnapResult`:
- `snappedPoint: [lon, lat]` — the projected point on the road
- `segmentNodeA`, `segmentNodeB` — the OSM node IDs bounding the segment
- `t` — parameter in [0, 1] along the segment
- `distanceMeters` — distance from click to snap

Used both in the worker (for virtual node injection) and on the main thread (in `useRouter` for immediate UI snap feedback before sending to worker).

### `src/lib/mapHelpers.ts`

All MapLibre source/layer management. No routing or parsing logic.

**Layers added at map load (in z-order bottom to top):**

| Source/Layer ID | Type | Purpose |
|---|---|---|
| `roads` / `roads-layer` | GeoJSON LineString | Road network overlay (colour-coded by highway type) |
| `visited-nodes` / `visited-nodes-layer` | GeoJSON LineString | Explored road segments (cyan, animation) |
| `frontier-nodes` / `frontier-nodes-layer` | GeoJSON Point | Current frontier nodes (red circles, animation) |
| `snap-indicator` / `snap-indicator-layer` | GeoJSON LineString | Dashed orange line: raw click → snapped point |
| `markers` / `markers-layer` | GeoJSON Point | Source (green) and destination (red) circle markers |
| `route` / `route-layer` | GeoJSON LineString | Optimal A* path (bold red, always visible during animation) |

Key helpers: `addRoadLayer`, `updateRoadData`, `fitRoadBounds`, `addFrontierLayers`, `addRouteLayers`, `updateFrontierLayers`, `updateRouteLayer`, `updateMarkersLayer`, `updateSnapIndicatorLayer`, `clearFrontierLayers`, `clearFrontierDots`.

`clearFrontierDots` (called on natural animation end) removes only the red frontier-node dots while keeping the cyan visited-edge overlay. `clearFrontierLayers` (called on map click or new file) clears both.

### `src/lib/animationUtils.ts`

**`filterHistory(searchHistory)`** — strips `__vs__` and `__ve__` virtual node IDs from search history before animation.

**`computeFrameParams(multiplier)`** — maps speed slider value (0.5–5.0) to:
- `nodesPerFrame` — how many history entries to advance per active RAF tick (`max(1, round(7 * multiplier))`)
- `frameSkip` — only advance every Nth RAF tick; 1 for multiplier ≥ 1.0, scales to 10 at multiplier = 0.5 for dramatically slower playback at the slow end

### `src/lib/routeStats.ts`

`estimateTravelTime(distanceMeters, mode)` — divides distance by mode speed (car=50 km/h, bike=15 km/h, pedestrian=5 km/h). `formatDistance` and `formatTime` for display strings.

### `src/lib/apiKeyStore.ts`

Thin wrapper around `localStorage` for the TomTom API key (`key: 'tomtom_api_key'`). Three functions: `getApiKey`, `saveApiKey`, `clearApiKey`.

### `src/lib/osmLoader.ts`

Single function `handleFile(file, worker)` — reads a `File` as an `ArrayBuffer` and transfers it to the worker via `postMessage` with the transferable buffer (zero-copy).

---

## React Hooks

### `useOsmLoader`

Creates the Worker once on mount (cleaned up on unmount). Exposes:
- `loadFile(file)` — calls `osmLoader.handleFile`, resets all state
- `stage`, `percent` — loading progress for `LoadingOverlay`
- `geojson` — road GeoJSON passed to `MapView`
- `graph` — full `OsmGraph` kept on main thread for snapping and animation edge-map building
- `componentMap` — union-find result for disconnectivity detection
- `workerRef` — shared with `useRouter` so both hooks can attach listeners to the same Worker

### `useRouter`

Manages click-to-route state machine and worker communication:
- Maintains `clickCountRef` (mod 2): even clicks set source, odd clicks set destination
- Calls `snapToNearestSegment` on the main thread for immediate snap-point UI feedback
- Checks `componentMap` for connectivity before sending route request to worker
- Subscribes to `route-done` and `route-error` messages via `addEventListener` (not `onmessage`, so `useOsmLoader` listener is not displaced)
- `setMode` auto-re-routes if both endpoints exist
- `handleMarkerDrag` delegates to pure `buildHandleMarkerDrag` factory (exported for unit testing)
- `resetRouting` called by `App.tsx` on new file load

### `useAnimation`

Drives the `requestAnimationFrame` loop. On `startAnimation(map, route, graph)`:
1. Calls `filterHistory` to strip virtual nodes
2. Pre-builds a `nodeEdges` edge map from `graph.ways` for O(1) neighbour lookup per frame
3. Each frame: advances `cursor` by `nodesPerFrame` (skipping frames when `frameSkip > 1`), accumulates `visitedEdges` and `visitedSet`, extracts `frontierCoords` for the current batch, calls `updateFrontierLayers` and `updateRouteLayer`
4. On animation end: calls `clearFrontierDots` to remove red dots while keeping cyan road overlay

`cancelAnimation` cancels any pending RAF and is called by `App.tsx` before every new map click and on new file load.

---

## Component Responsibilities

| Component | Responsibility |
|---|---|
| `App.tsx` | Root; wires `useOsmLoader`, `useRouter`, `useAnimation`; holds `mapRef`; auto-starts animation on route change; clears state on new file |
| `MapView` | MapLibre lifecycle; initialises all sources/layers on `load`; reactive `useEffect` blocks for geojson, route, snap indicator, and draggable source/destination markers |
| `DropZone` | Drag-and-drop, file browse, and bundled-map fetch buttons (`/maps/leiden.osm.gz`, `/maps/amsterdam.osm.gz`) |
| `ModeSelector` | Car/Bicycle/Pedestrian toggle; `aria-pressed` accessibility |
| `SpeedPanel` | Range input 0.5–5.0 step 0.5; visible only when route exists |
| `StatsPanel` | Live nodes-explored / total, distance, estimated travel time; top-right overlay |
| `LoadingOverlay` | Animated progress bar; `opacity: 0; pointer-events: none` when not visible (CSS fade) |
| `ApiKeyModal` | First-run gate; stores key in localStorage; shown when `getApiKey()` returns null |
| `SettingsPanel` | Gear button; shows masked API key; "Clear key" resets to ApiKeyModal |

---

## Data Flow

### File Load Pipeline

```
User drops/selects .osm.gz
    ↓
DropZone.onFile → App.loadFile → osmLoader.handleFile
    ↓ (ArrayBuffer transferred to worker)
osmWorker: gunzipSync (fflate) → TextDecoder → parseOsmXml
    ↓
osmWorker: buildRoadGeoJson + buildAdjacency (with UnionFind)
    ↓ postMessage({ type: 'done', geojson, componentMap, graph })
useOsmLoader: setGeojson / setGraph / setComponentMap
    ↓
MapView: updateRoadData + fitRoadBounds
App: cancelAnimation + clearFrontierLayers + resetRouting
```

### Routing Pipeline

```
User clicks map
    ↓
MapView.onClick → App.handleMapClickWithCancel
    → cancelAnimation + clearFrontierLayers
    → useRouter.handleMapClick
        → snapToNearestSegment (main thread, for immediate marker display)
        → componentMap connectivity check
        → workerRef.postMessage({ type: 'route', source, destination, mode })
    ↓
osmWorker.handleRoute:
    snapToNearestSegment (worker, for virtual node injection)
    → inject VIRTUAL_START / VIRTUAL_END into shallow-copied adjacency
    → aStar(virtualAdjacency, '__vs__', '__ve__', extendedNodes, mode)
    → replace virtual coords with actual snapped points in path
    → postMessage({ type: 'route-done', path, searchHistory, distance, found })
    ↓
useRouter: setRoute → App useEffect detects route change
    → useAnimation.startAnimation(map, route, graph)
```

### Animation Frame Loop

```
startAnimation:
    filterHistory (strip __vs__, __ve__)
    build nodeEdges map from graph.ways
    ↓ requestAnimationFrame loop
Each frame:
    computeFrameParams(speedRef.current)
    frame-skip check
    slice history[cursor … cursor+nodesPerFrame]
    accumulate visitedEdges (edges between two visited nodes, deduped)
    extract frontierCoords (current batch only)
    updateFrontierLayers(map, visitedEdges, frontierCoords)
    updateRouteLayer(map, route.path)   ← full path always visible
    setNodesExplored(cursor)
    ↓ on completion:
    clearFrontierDots (remove red dots, keep cyan road overlay)
```

### Worker Message Protocol

```
Main → Worker:
  ArrayBuffer                                  (legacy load: raw .osm.gz bytes)
  { type: 'load', buffer: ArrayBuffer }        (explicit load)
  { type: 'route', source, destination, mode } (route request)

Worker → Main:
  { type: 'progress', stage: string, pct: number }
  { type: 'done', geojson, componentMap, graph }
  { type: 'route-done', path, searchHistory, distance, found }
  { type: 'route-error', message: string }
  { type: 'error', message: string }
```

---

## Key Architectural Decisions

### Regex XML Parser in Worker

`osmParser.ts` uses regex (not `DOMParser`) because `DOMParser` is unavailable in Web Worker scope. The parser handles both self-closing (`<node ... />`) and block (`<node ...><tag .../></node>`) node forms. It emits `barrierNodes` as a side product of the node parse pass.

### Graph Stays in Worker; Results are Coordinate Arrays

The `OsmGraph` object is sent back to the main thread in the `done` message for two reasons: (1) `useAnimation` needs `graph.ways` and `graph.nodes` to build the per-frame edge map, and (2) `useRouter` needs `graph` for main-thread snap. However the `AdjacencyList` stays in the worker and is never transferred.

### Segment Snapping Runs Twice

`snapToNearestSegment` is called on the main thread (in `useRouter.handleMapClick`) to provide immediate visual feedback (marker placement, snap indicator line) before the route result arrives. It is also called inside the worker (`handleRoute`) to inject virtual nodes. Both calls use the same logic from `segmentSnap.ts`.

### Virtual Nodes for Mid-Segment Start/End

Rather than snapping to the nearest graph node, routing starts and ends at the perpendicular projection onto the nearest road segment. Two virtual node IDs (`__vs__`, `__ve__`) are injected into a shallow-copied adjacency list with edges to/from the two real segment endpoints. This ensures the path begins and ends at the actual click point rather than jumping to an intersection.

### One-Way and Barrier Enforcement via Edge Tags

One-way direction and barrier information are encoded on edges at graph-build time, not during A*. `onewayReversed: true` means this edge direction opposes the way's oneway declaration. Barriers are propagated from `barrierNodes` into edge tags during `buildAdjacency`. `canUseEdge` reads these at query time, making the same graph reusable across routing modes without rebuilding.

### Animation Speed: nodesPerFrame + frameSkip

Two parameters control perceived animation speed. `nodesPerFrame` controls how many history nodes advance per active RAF tick (linear with slider). `frameSkip` skips RAF ticks entirely below 1.0x speed, giving a much wider effective range without changing the fast-end feel. At 0.5x speed: ~4 nodes every 10 ticks ≈ 24 nodes/sec. At 5x speed: 35 nodes every tick ≈ 2100 nodes/sec.

### UnionFind for Disconnectivity Detection

Before sending a route request to the worker, `useRouter.triggerRoute` checks that both snap points share the same connected component using `componentMap`. This provides an instant error message ("points are on disconnected road segments") without a round-trip to the worker.

---

## Testing

152 passing tests in `src/__tests__/` using Vitest + jsdom.

| Test file | Coverage |
|---|---|
| `osmParser.test.ts` | XML parsing, node/way extraction, barrier node detection |
| `osmPipeline.test.ts` | End-to-end parse → build adjacency integration |
| `graphBuilder.test.ts` | buildAdjacency edge creation, oneway flags, barrier propagation, UnionFind |
| `router.test.ts` | A* pathfinding, canUseEdge access matrix, haversine |
| `segmentSnap.test.ts` | Segment projection, mode filtering, distance threshold |
| `animation.test.ts` | filterHistory, computeFrameParams, slicePath |
| `stats.test.ts` | estimateTravelTime, formatDistance, formatTime |
| `dropZone.test.ts` | DropZone drag-and-drop and click behaviour |
| `modeSelector.test.tsx` | ModeSelector rendering and button interaction |
| `markerDrag.test.ts` | buildHandleMarkerDrag pure factory logic |

---

## External Dependencies

| Package | Version | Role |
|---|---|---|
| `maplibre-gl` | ^5.20.0 | Map rendering; tile layer, GeoJSON sources, markers |
| `react` / `react-dom` | ^19.2.4 | UI framework |
| `fflate` | ^0.8.2 | Synchronous gzip decompression (`gunzipSync`) in the worker |
| Tile provider | TomTom Maps API | Vector tile style; API key stored in localStorage |

Tile URL pattern: `https://api.tomtom.com/style/1/style/*?key=<KEY>&map=basic_night`

---

## Bundled Map Data

Two sample `.osm.gz` files are served from `public/maps/`:
- `leiden.osm.gz` — city of Leiden, Netherlands
- `amsterdam.osm.gz` — city of Amsterdam, Netherlands

These are fetched via `fetch('/maps/<filename>')` when the user clicks the quick-start buttons in `DropZone`.
