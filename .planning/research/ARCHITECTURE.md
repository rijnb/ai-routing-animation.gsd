# Architecture Research

**Domain:** Browser-based OSM routing visualization / pathfinding animation
**Researched:** 2026-03-12
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │  FileLoader   │  │ MapControls   │  │ AnimationControls   │  │
│  │  (drag/drop)  │  │ (click/mode)  │  │ (play/pause/speed)  │  │
│  └──────┬───────┘  └───────┬───────┘  └──────────┬──────────┘  │
├─────────┴───────────────────┴────────────────────┴──────────────┤
│                     Application State                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  StateMachine: idle → loading → graphReady → routing →   │   │
│  │                 animating → done                          │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Core Engine (runs in Web Worker)            │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐      │
│  │ OSM Parser │→ │ Graph      │→ │ A* Router            │      │
│  │ (XML→data) │  │ Builder    │  │ (search + path)      │      │
│  └────────────┘  └────────────┘  └──────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                     Rendering Layer                              │
│  ┌──────────────────────┐  ┌────────────────────────────┐      │
│  │ MapLibre GL JS       │  │ AnimationRenderer          │      │
│  │ (tiles + base map)   │  │ (GeoJSON source updates)   │      │
│  └──────────────────────┘  └────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| **FileLoader** | Accept .osm.gz file, decompress with DecompressionStream, hand raw XML to worker | Owns: file input UI, gzip decompression. Outputs: XML string/stream |
| **OSMParser** | Parse OSM XML into structured node/way collections | Owns: XML SAX parsing, tag extraction. Outputs: raw OSM data (nodes Map, ways array) |
| **GraphBuilder** | Convert OSM ways into a weighted directed graph for routing | Owns: intersection detection, edge creation, weight calculation. Outputs: Graph object |
| **AStarRouter** | Run A* with mode-specific weights, record search history | Owns: priority queue, heuristic, visited tracking. Outputs: path + search history |
| **StateMachine** | Track app lifecycle states, gate UI interactions | Owns: state transitions, event dispatch. No data transformation |
| **MapControls** | Handle map click for source/destination, mode selection | Owns: click-to-node snapping, mode dropdown. Outputs: node IDs + mode |
| **AnimationControls** | Play/pause/step/speed controls for search replay | Owns: playback state, speed multiplier. Outputs: animation commands |
| **AnimationRenderer** | Step through search history, update MapLibre GeoJSON sources per frame | Owns: frame timing, GeoJSON construction. Reads: search history + path |
| **MapLibre Integration** | Map instance, tile layers, GeoJSON sources for graph/animation | Owns: map lifecycle, layer management. Receives: GeoJSON updates |

## Recommended Project Structure

```
src/
├── main.ts                 # Entry point, wire everything together
├── state/
│   └── app-state.ts        # State machine (idle/loading/graphReady/routing/animating)
├── osm/
│   ├── decompress.ts       # DecompressionStream gzip handling
│   ├── parser.ts           # SAX-style OSM XML parser
│   └── types.ts            # OsmNode, OsmWay, OsmTag types
├── graph/
│   ├── graph.ts            # Graph data structure (adjacency list)
│   ├── builder.ts          # OSM ways → graph edges
│   ├── weights.ts          # Speed/access tables per routing mode
│   └── types.ts            # GraphNode, GraphEdge, RoutingMode
├── routing/
│   ├── astar.ts            # A* implementation with search history recording
│   ├── heuristic.ts        # Haversine distance heuristic
│   └── types.ts            # SearchStep, RoutingResult
├── worker/
│   ├── routing-worker.ts   # Web Worker entry: parse → build → route
│   └── messages.ts         # Typed message protocol (main ↔ worker)
├── map/
│   ├── map-manager.ts      # MapLibre instance, sources, layers
│   ├── layers.ts           # Layer definitions (graph overlay, animation)
│   └── click-handler.ts    # Click → nearest graph node snapping
├── animation/
│   ├── animator.ts         # Replay engine: steps through search history
│   ├── renderer.ts         # Converts animation state → GeoJSON → setData
│   └── controls.ts         # Play/pause/speed state
└── ui/
    ├── file-input.ts       # Drag-and-drop / file picker
    ├── mode-selector.ts    # Car/bicycle/pedestrian toggle
    └── status-bar.ts       # Loading progress, node/edge counts
```

### Structure Rationale

- **osm/:** Isolated from graph concerns. Parser produces raw OSM data; it does not know about graphs. This separation allows swapping parsers (XML, PBF) without touching graph code.
- **graph/:** Pure data structure, no UI or map dependencies. The builder transforms OSM data into a graph; weights.ts encodes routing mode logic separately so it can be unit tested.
- **routing/:** A* is a pure function: graph in, result out. Search history recording is the only "side effect" and it is just array accumulation. No DOM or map dependencies.
- **worker/:** Thin orchestration layer that imports osm/, graph/, routing/ and runs them in a Worker context. Message types are shared with the main thread.
- **map/:** All MapLibre-specific code lives here. Nothing else imports maplibre-gl. This makes the core engine testable without a map.
- **animation/:** Owns the temporal dimension. The animator decides which search step to show at time T; the renderer translates that to GeoJSON. Separation from map/ means animation logic is testable without MapLibre.

## Architectural Patterns

### Pattern 1: Web Worker for Heavy Computation

**What:** Run OSM parsing, graph building, and A* routing in a dedicated Web Worker. Main thread stays responsive for map interaction and animation.

**When to use:** Always. Parsing a city-sized OSM file (100K+ nodes) and running A* are blocking operations that would freeze the UI for seconds.

**Trade-offs:**
- Pro: UI never freezes during parsing/routing
- Pro: Can report progress back via postMessage
- Con: Data must be serialized across the worker boundary (structured clone)
- Con: Slightly more complex development (message passing vs direct calls)

**Implementation approach:**
```typescript
// messages.ts - shared types
type WorkerRequest =
  | { type: 'parse-and-build'; osmXml: string; mode: RoutingMode }
  | { type: 'route'; from: number; to: number; mode: RoutingMode };

type WorkerResponse =
  | { type: 'progress'; stage: string; percent: number }
  | { type: 'graph-ready'; nodeCount: number; edgeCount: number; bbox: BBox }
  | { type: 'route-result'; path: number[]; searchHistory: SearchStep[] }
  | { type: 'error'; message: string };
```

**Key detail:** The graph stays in the worker. Only the routing result (path coordinates + search history as coordinate arrays) crosses the boundary. Do NOT transfer the entire graph to the main thread -- it can be megabytes. Instead, the worker resolves node IDs to [lng, lat] coordinates before sending results.

### Pattern 2: Typed Adjacency List Graph

**What:** Represent the road network as a Map of node IDs to edge arrays. Each edge carries the target node, distance, and mode-specific traversal cost.

**When to use:** For A* on OSM road networks with mode-specific routing.

**Trade-offs:**
- Pro: O(1) neighbor lookup, memory-efficient for sparse graphs (road networks are sparse)
- Pro: Typed edges allow different weights per mode without rebuilding the graph
- Con: Less cache-friendly than flat typed arrays for very large graphs

**Data structure:**
```typescript
interface GraphNode {
  id: number;        // OSM node ID
  lat: number;
  lon: number;
}

interface GraphEdge {
  target: number;           // target node ID
  distance: number;         // meters (haversine between endpoints)
  highwayType: HighwayType; // e.g., 'primary', 'residential', 'cycleway'
  oneway: boolean;
  access: AccessFlags;      // { car: boolean; bicycle: boolean; foot: boolean }
}

// Adjacency list: node ID → outgoing edges
type Graph = {
  nodes: Map<number, GraphNode>;
  edges: Map<number, GraphEdge[]>;
};
```

**Why store highway type on edges instead of pre-computed speed:** Different routing modes need different interpretations of the same edge. A `residential` road is 50 km/h for cars but irrelevant for pedestrians (who walk at ~5 km/h everywhere). By storing the highway type, the A* cost function selects the appropriate weight at query time without rebuilding the graph when the user switches modes.

### Pattern 3: Search History as Recorded Steps

**What:** During A* execution, record every node expansion as a SearchStep. The animation engine replays these steps sequentially.

**When to use:** Always -- this is how the "search frontier animation" works.

**Trade-offs:**
- Pro: Complete decoupling of routing from animation. A* runs to completion; animation replays at leisure
- Pro: Enables pause, step, rewind, speed change without re-running A*
- Con: Memory proportional to explored nodes (typically 10K-50K steps for city routing -- manageable)

**Structure:**
```typescript
interface SearchStep {
  nodeId: number;
  coords: [number, number];   // [lng, lat]
  gScore: number;             // cost so far
  fScore: number;             // estimated total cost
  parentId: number | null;
  isOnPath: boolean;          // true if this node is on the final optimal path
}

interface RoutingResult {
  path: [number, number][];       // ordered coordinates of optimal path
  searchHistory: SearchStep[];    // every expansion in order
  stats: { explored: number; pathLength: number; duration: number };
}
```

### Pattern 4: GeoJSON Source Mutation for Animation

**What:** MapLibre renders the animation via GeoJSON sources that are mutated each frame using `source.setData()`. Two sources: one for the search frontier (points/circles), one for the path (line).

**When to use:** For any frame-by-frame map animation in MapLibre.

**Trade-offs:**
- Pro: Native MapLibre pattern (well-documented, GPU-accelerated rendering)
- Pro: setData on a single source is efficient for moderate feature counts
- Con: Rebuilding full GeoJSON each frame is wasteful for 50K+ features -- batch in chunks instead

**Implementation approach:**
- **frontier-source** (GeoJSON, circle layer): accumulates explored nodes. Update every N steps per frame (not every single step -- batch 10-50 steps per animation frame for smooth playback).
- **path-source** (GeoJSON, line layer): the red optimal path. Grows as the frontier "discovers" path nodes. Pre-calculated, so show path segments up to the current frontier position.
- Use `requestAnimationFrame` for timing. A speed multiplier controls how many search steps advance per frame.

### Pattern 5: Finite State Machine for App Lifecycle

**What:** The app has clear sequential states. Use an explicit state machine to prevent invalid transitions (e.g., cannot start routing without a graph, cannot animate without a route).

**States and transitions:**
```
idle ──[file loaded]──→ loading ──[parse complete]──→ graphReady
                                                         │
graphReady ──[src+dst+mode selected]──→ routing ──[route found]──→ animating
                                                                      │
animating ──[animation complete]──→ done ──[new route]──→ routing
                                         ──[new file]──→ loading
```

## Data Flow

### Primary Pipeline

```
User drops .osm.gz file
    ↓
[Main Thread] DecompressionStream → XML string
    ↓ (postMessage: XML string to worker)
[Web Worker] OSM Parser → { nodes: Map, ways: Way[] }
    ↓
[Web Worker] Graph Builder → { nodes: Map, edges: Map }
    ↓ (postMessage: graph-ready + bbox)
[Main Thread] Fit map to bbox, enable click-to-route
    ↓
User clicks source + destination, selects mode
    ↓ (postMessage: route request)
[Web Worker] A* Router → { path, searchHistory }
    ↓ (postMessage: routing result with coordinates)
[Main Thread] AnimationRenderer replays searchHistory
    ↓ (requestAnimationFrame loop)
[Main Thread] frontier-source.setData() + path-source.setData()
    ↓
MapLibre renders updated layers each frame
```

### Worker Communication Protocol

```
Main → Worker:  { type: 'parse-and-build', osmXml, mode }
Worker → Main:  { type: 'progress', stage: 'parsing', percent: 30 }
Worker → Main:  { type: 'progress', stage: 'building', percent: 70 }
Worker → Main:  { type: 'graph-ready', nodeCount, edgeCount, bbox }

Main → Worker:  { type: 'route', from: nodeId, to: nodeId, mode }
Worker → Main:  { type: 'progress', stage: 'routing', percent: 50 }
Worker → Main:  { type: 'route-result', path, searchHistory }
```

### Key Data Flows

1. **File → Graph:** Gzip bytes → XML string → OSM nodes/ways → filtered road ways → graph adjacency list. All in worker except decompression (needs browser Streams API on main thread -- though worker also supports DecompressionStream).
2. **Graph → Route:** User click coordinates → snap to nearest graph node (worker does spatial lookup) → A* runs → path + full search history returned as coordinate arrays.
3. **Route → Animation:** Search history array drives a frame-by-frame index. Each frame advances the index by `stepsPerFrame * speed`. GeoJSON features accumulate (frontier grows, path grows). Two `setData()` calls per frame.

## OSM Parsing and Graph Building Details

### Two-Pass Processing

OSM XML must be processed in two passes because ways reference node IDs that may appear later in the file:

1. **Pass 1 -- Collect Nodes:** Build a `Map<nodeId, {lat, lon}>` from all `<node>` elements.
2. **Pass 2 -- Process Ways:** For each `<way>` with a `highway=*` tag, resolve node references to coordinates. Create graph edges between consecutive nodes in the way.

For SAX-style parsing (recommended for large files), use a streaming XML parser. The DOMParser approach loads the entire XML into memory as a DOM tree -- wasteful for large files. A SAX parser processes elements as they stream through.

### Intersection Detection

Not every OSM node becomes a graph node. Only **intersection nodes** (referenced by 2+ ways) and **dead-end nodes** (first/last in a way) become graph vertices. Intermediate nodes along a road are collapsed into the edge geometry. This dramatically reduces graph size:

- Raw OSM nodes for a small city: ~200,000
- Graph nodes (intersections + dead-ends): ~20,000-40,000

**Algorithm:**
1. First pass: count how many ways reference each node ID
2. Nodes with count >= 2 are intersections
3. When building edges, split ways at intersection nodes

### Routing Mode Weights

| Highway Type | Car Speed (km/h) | Car Access | Bicycle Access | Pedestrian Access |
|---|---|---|---|---|
| motorway | 120 | yes | no | no |
| trunk | 90 | yes | no | no |
| primary | 70 | yes | yes | yes |
| secondary | 60 | yes | yes | yes |
| tertiary | 50 | yes | yes | yes |
| residential | 30 | yes | yes | yes |
| living_street | 20 | yes | yes | yes |
| cycleway | -- | no | yes | no |
| footway | -- | no | no | yes |
| path | -- | no | yes | yes |
| pedestrian | -- | no | no | yes |
| service | 20 | yes | yes | yes |

Bicycle speed: ~15 km/h on roads, ~12 km/h on paths. Pedestrian speed: ~5 km/h everywhere.

Edge cost for A* = `distance / speed_for_mode`. Inaccessible edges get infinite cost (filtered out during neighbor iteration).

## Scaling Considerations

This is a portfolio demo, but OSM file sizes vary widely:

| Scale | Nodes | Graph Nodes | Approach |
|-------|-------|-------------|----------|
| Neighborhood (~1MB .osm.gz) | ~10K | ~2K | Everything instant, no optimization needed |
| Small city (~10MB .osm.gz) | ~200K | ~30K | Worker essential, parsing takes 1-3s |
| Large city (~50MB .osm.gz) | ~1M | ~150K | Streaming parser critical, animation must batch aggressively |

### Scaling Priorities

1. **First bottleneck -- parsing:** Large OSM XML files take seconds to parse. SAX/streaming parser + Web Worker keeps UI responsive. Show progress bar.
2. **Second bottleneck -- animation frame rate:** With 50K+ explored nodes, rebuilding full GeoJSON every frame gets expensive. Batch: add features incrementally rather than rebuilding from scratch. Keep a running GeoJSON object and push new features into its array.
3. **Third bottleneck -- memory:** Search history for large graphs can be 50K+ entries. Each SearchStep with coordinates is ~50 bytes, so ~2.5MB. Acceptable. The graph itself is the bigger memory consumer -- adjacency list for 150K nodes with edges is ~20-50MB.

## Anti-Patterns

### Anti-Pattern 1: Transferring the Full Graph to Main Thread

**What people do:** Build graph in worker, then postMessage the entire graph object to main thread for rendering.
**Why it is wrong:** Structured cloning a Map with 150K entries and edge arrays takes hundreds of milliseconds and doubles memory usage. The main thread does not need the graph.
**Do this instead:** Keep the graph in the worker. The worker resolves coordinates before sending results. The main thread only receives coordinate arrays for rendering.

### Anti-Pattern 2: Animating Every Single Search Step Per Frame

**What people do:** One requestAnimationFrame = one search step shown on map.
**Why it is wrong:** A* explores thousands of nodes. At 60fps, animating one node per frame takes minutes for a medium graph. Users lose patience.
**Do this instead:** Batch N steps per frame. Default to ~50 steps/frame at 1x speed. At "fast" speed, batch 200+. At "step" mode, advance exactly 1. This gives controllable speed without tedium.

### Anti-Pattern 3: Rebuilding Full GeoJSON from Scratch Each Frame

**What people do:** On each animation frame, construct a new GeoJSON FeatureCollection from all explored nodes so far.
**Why it is wrong:** At step 30,000, you are creating a 30K-feature GeoJSON object 60 times per second. GC pressure and serialization overhead tank performance.
**Do this instead:** Keep a persistent GeoJSON object. Each frame, push new features into the existing features array and call setData with the same object. MapLibre's setData accepts the mutated reference.

### Anti-Pattern 4: Using DOMParser for Large OSM XML

**What people do:** `new DOMParser().parseFromString(xml, 'text/xml')` then querySelectorAll.
**Why it is wrong:** Loads entire XML into a DOM tree in memory. A 50MB XML file becomes a ~200MB DOM tree. Parsing itself takes seconds, then querying is slow.
**Do this instead:** Use a streaming/SAX XML parser that processes elements one at a time. In a worker, you can use a lightweight SAX parser (e.g., sax-wasm or a simple custom state machine for the limited OSM XML schema).

### Anti-Pattern 5: Computing Haversine Distance in the A* Hot Loop

**What people do:** Call the full haversine formula (with sin, cos, atan2, sqrt) for every edge cost and heuristic evaluation during A*.
**Why it is wrong:** Trig functions are expensive. A* may evaluate hundreds of thousands of edges.
**Do this instead:** Pre-compute edge distances during graph building (one-time cost). For the heuristic, use the equirectangular approximation: `dx = (lon2-lon1) * cos(avgLat); dy = lat2-lat1; d = sqrt(dx*dx + dy*dy) * R`. One cos call instead of four trig calls. Good enough for city-scale distances.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Data Crossing the Boundary |
|----------|---------------|---------------------------|
| Main thread <-> Web Worker | postMessage / onmessage | XML string in, progress events + coordinate arrays out |
| StateMachine <-> UI Components | Event dispatch / callbacks | State names, enable/disable signals |
| AnimationRenderer <-> MapLibre | source.setData(geojson) | GeoJSON FeatureCollection objects |
| User Click <-> Worker | postMessage with coordinates | Click coords in, nearest node ID + coords out |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MapLibre tile server | Map style URL (e.g., OSM raster or vector tiles) | Free tile sources: OpenFreeMap, Stadia, MapTiler free tier |
| None (no backend) | -- | All processing is client-side |

## Build Order (Dependencies)

Components should be built in this order based on dependencies:

```
Phase 1: Foundation
  ├── Types (osm/types.ts, graph/types.ts, routing/types.ts)
  ├── State machine (state/app-state.ts)
  └── MapLibre setup (map/map-manager.ts with base tiles)

Phase 2: Data Pipeline
  ├── Gzip decompression (osm/decompress.ts)
  ├── OSM XML parser (osm/parser.ts)
  ├── Graph builder with weights (graph/builder.ts, graph/weights.ts)
  └── Worker orchestration (worker/routing-worker.ts, worker/messages.ts)

Phase 3: Routing
  ├── A* with search history (routing/astar.ts, routing/heuristic.ts)
  ├── Click-to-node snapping (map/click-handler.ts)
  └── Mode selection (ui/mode-selector.ts)

Phase 4: Animation
  ├── Animation engine (animation/animator.ts)
  ├── GeoJSON renderer (animation/renderer.ts)
  ├── MapLibre layers (map/layers.ts)
  └── Animation controls (animation/controls.ts)

Phase 5: Polish
  ├── Graph overlay visualization
  ├── Progress indicators
  ├── Error handling
  └── Performance tuning
```

**Rationale:** Each phase produces a working (if incomplete) artifact. Phase 1 gets a map on screen. Phase 2 can display the parsed graph as a debug overlay. Phase 3 computes routes. Phase 4 animates them. Phase 5 makes it portfolio-worthy.

## Sources

- [MapLibre GL JS - Animate a Line example](https://maplibre.org/maplibre-gl-js/docs/examples/animate-a-line/) -- GeoJSON source mutation pattern with requestAnimationFrame
- [MapLibre GL JS - GeoJSONSource API](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/) -- setData method documentation
- [OSM tags for routing / Access restrictions](https://wiki.openstreetmap.org/wiki/OSM_tags_for_routing/Access_restrictions) -- default access by highway type and vehicle
- [OSM tags for routing / Maxspeed](https://wiki.openstreetmap.org/wiki/OSM_tags_for_routing/Maxspeed) -- default speed values per highway type
- [Red Blob Games - Introduction to A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html) -- frontier expansion visualization patterns
- [MDN - DecompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream) -- browser-native gzip decompression
- [MDN - Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) -- streaming decompression support
- [OSM Help - Building a graph from OSM XML](https://help.openstreetmap.org/questions/38328/building-a-graph-out-of-osm-xml) -- intersection detection and edge creation patterns
- [Building a Weighted Graph based on OSM Data for Routing](https://socialhub.technion.ac.il/wp-content/uploads/2017/08/revise_version-final.pdf) -- academic reference for OSM graph construction

---
*Architecture research for: Browser-based OSM routing animation*
*Researched: 2026-03-12*
