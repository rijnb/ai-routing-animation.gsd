# Phase 2: Routing Engine - Research

**Researched:** 2026-03-13
**Domain:** A* pathfinding, road-segment snapping, MapLibre layer management, OSM access rules
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mode Selector**
- Floating panel on the map (corner overlay), hidden until OSM data is loaded
- Icon + label format: car / bike / walk — three toggle buttons
- Mode change on an existing route triggers automatic A* re-route immediately (no confirm step)
- Mode selector appears/disappears together with the routing UI (not always visible)

**Route Display**
- After A* completes, draw a static bold red line on the map showing the optimal path
- Red is consistent with PROJECT.md vision ("path always highlighted in red")
- Optimal path only — no search frontier / visited-node rendering in Phase 2 (deferred to Phase 3)
- New OSM file load → full reset: clear route, markers, and mode selection

**Marker Placement & Interaction**
- Cyclic click flow: 1st map click = source marker, 2nd = destination marker, 3rd = replaces source
- Both markers stay on map after routing; subsequent clicks cycle through replacement
- No drag-to-reposition in Phase 2

**Snap Feedback**
- On successful snap: show the raw click point AND the snapped marker on the road segment, connected by a thin dashed line
- On snap failure (no road within 200m): toast notification "No road within 200m" — no marker placed
- On disconnected graph (PIPE-03): toast "No route — points are on disconnected road segments" — both markers remain

### Claude's Discretion
- Exact toast duration and styling
- Dashed line color/weight for click-to-snap indicator
- Floating panel positioning (which corner)
- Source vs destination marker visual distinction (color, shape, label)
- MapLibre layer names and z-order for route and snap-indicator layers

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-01 | User can click the map to set a source point — snaps to nearest road segment suitable for selected routing mode within 200m, at the interpolated point on that segment | Segment-snapping algorithm (point-to-segment projection), mode access filter, 200m haversine threshold |
| MAP-02 | User can click the map to set a destination point — same segment-snapping behavior | Same as MAP-01; second click in cyclic flow |
| ROUT-01 | A* pathfinding computed with full search history recorded; route starts and ends at interpolated segment points (not just graph nodes) | A* with adjacency list, history array, virtual start/end node injection for segment interpolation |
| ROUT-02 | User can select routing mode: car, bicycle, or pedestrian | Three-button toggle panel; mode state drives access filter and speed table |
| ROUT-03 | Routing modes apply different estimated speeds and OSM access restrictions | OSM tag rules documented below; speed table per mode |
| PIPE-03 | Graph builder detects disconnected components; warns user if source/destination can't be connected | Union-Find (disjoint-set) component labeling at graph-build time; check at route-request time |
</phase_requirements>

---

## Summary

Phase 2 adds the routing brain to an already-working map canvas. The core work splits into three logical areas: (1) graph construction — converting the existing `OsmGraph` (nodes + ways) into a weighted adjacency list with mode access filters and connected-component labels, all inside the osmWorker; (2) segment snapping — given a raw click lon/lat, finding the nearest road segment edge permitted for the current mode within 200 m, projecting the click onto it, and injecting virtual start/end nodes; (3) A* execution — running the search, recording full history, and returning both the optimal path and the history array for Phase 3.

Everything heavy (graph build, A*, component detection) runs in the existing Web Worker following the established pattern. The main thread receives the adjacency list + component map at file-load time, then sends snap-coordinates + mode at route-request time. MapLibre layers for the route line, markers, snap-indicator dashes, and raw-click dots follow exactly the `addRoadLayer`/`updateRoadData` pattern already proven in Phase 1.

The trickiest implementation concern is **virtual node injection for segment interpolation**: A* must start and end at the exact projected point, not at graph nodes, which requires temporarily adding two virtual nodes (with edges to both endpoints of each snapped segment) before running the search.

**Primary recommendation:** Build graph adjacency + component detection in the worker at load time; keep route request/response as a separate worker message type; use haversine for all distance math; implement virtual node injection for clean start/end interpolation.

---

## Standard Stack

### Core (all already in package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| maplibre-gl | ^5.20.0 | Map rendering, click events, layer/source management | Already in use; established pattern |
| react | ^19.2.4 | Component tree, mode selector panel, hook state | Already in use |
| fflate | ^0.8.2 | gzip in worker | Already in use |
| vitest | ^2.1.9 | Unit tests | Already configured |

### No New Dependencies Needed
All Phase 2 logic is pure TypeScript algorithms (A*, haversine, union-find, segment projection). No additional npm packages required.

**Installation:** None — no new dependencies.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── osmParser.ts          (existing — no changes)
│   ├── graphBuilder.ts       (existing — extend with adjacency list + components)
│   ├── router.ts             (NEW — A* algorithm, pure function, testable in Node/vitest)
│   ├── segmentSnap.ts        (NEW — point-to-segment projection, 200m filter)
│   └── mapHelpers.ts         (existing — add route/marker/snap layer helpers)
├── workers/
│   └── osmWorker.ts          (existing — extend with graph message + route request handler)
├── hooks/
│   ├── useOsmLoader.ts       (existing — extend to also return adjacency list)
│   └── useRouter.ts          (NEW — manages mode state, snap state, route state, worker messaging)
└── components/
    ├── MapView.tsx            (existing — add click handler prop, route/marker layers)
    ├── ModeSelector.tsx       (NEW — floating panel, three toggle buttons)
    └── App.tsx                (existing — wire ModeSelector and useRouter)
```

### Pattern 1: Extended Worker Message Protocol

The worker already handles one message type (file load → done). Phase 2 adds a second message type for routing. The worker accumulates graph state across messages.

```typescript
// In osmWorker.ts — worker-side state
let graphState: { adjacency: AdjacencyList; components: ComponentMap } | null = null

self.onmessage = (event: MessageEvent) => {
  const { type, ...payload } = event.data

  if (type === 'load') {
    // existing: decompress, parse, build GeoJSON
    // NEW: also build adjacency list + component map
    graphState = buildAdjacency(graph)
    self.postMessage({ type: 'done', geojson, adjacency: graphState.adjacency, components: graphState.components })
  }

  if (type === 'route') {
    // payload: { source: [lon,lat], destination: [lon,lat], mode: 'car'|'bicycle'|'pedestrian' }
    if (!graphState) return self.postMessage({ type: 'route-error', message: 'No graph loaded' })
    const result = computeRoute(graphState, payload.source, payload.destination, payload.mode)
    self.postMessage({ type: 'route-done', ...result })
  }
}
```

**Why:** Keeps all computation off-main-thread. Adjacency is sent once at load time; route requests are cheap messages.

### Pattern 2: Adjacency List Data Structure

```typescript
// In lib/graphBuilder.ts
export interface AdjacencyList {
  // nodeId → array of { neighborId, weight (meters), wayTags }
  [nodeId: string]: Array<{ to: string; weight: number; tags: Record<string, string> }>
}

export interface ComponentMap {
  // nodeId → component label (integer)
  [nodeId: string]: number
}
```

Build the adjacency list by iterating ways; for each consecutive node pair (A, B) in a way, add edge A→B and B→A (treat all roads as bidirectional for now — OSM `oneway` is a v2 concern). Weight = haversine distance in meters.

### Pattern 3: A* with Full Search History

```typescript
// In lib/router.ts
export interface RouteResult {
  path: [number, number][]       // lon/lat coordinates of optimal path
  searchHistory: string[]        // node IDs visited in exploration order
  distance: number               // total meters
  found: boolean
}

export function aStar(
  adjacency: AdjacencyList,
  startId: string,
  goalId: string,
  nodes: Map<string, [number, number]>,
  modeFilter: (tags: Record<string, string>) => boolean,
): RouteResult
```

A* is a pure function — no side effects, no DOM, no Worker API. This keeps it fully unit-testable in vitest with jsdom.

**History recording:** Append each node ID to `searchHistory` array the first time it is popped from the open set (not when pushed). This is the canonical "nodes explored" sequence for Phase 3 animation.

### Pattern 4: Segment Snapping

```typescript
// In lib/segmentSnap.ts
export interface SnapResult {
  snappedPoint: [number, number]   // lon/lat of projected point on segment
  segmentNodeA: string             // ID of segment start node
  segmentNodeB: string             // ID of segment end node
  t: number                        // parameter [0,1] along segment
  distanceMeters: number
}

export function snapToNearestSegment(
  clickPoint: [number, number],    // lon/lat
  graph: OsmGraph,
  mode: RoutingMode,
  maxDistanceMeters: number,       // 200
): SnapResult | null
```

Algorithm:
1. Iterate all ways that pass the mode access filter.
2. For each consecutive node pair (A, B), project `clickPoint` onto segment AB using the standard parametric formula: `t = dot(AP, AB) / dot(AB, AB)`, clamped to [0, 1].
3. Compute haversine distance from `clickPoint` to the projected point.
4. Return the closest projected point within `maxDistanceMeters`.

**Haversine for projection distance:** Use flat-Earth approximation (lon/lat → meters via cosine correction) for the dot-product math since segments are short (< 1 km). Use full haversine only for the final distance check. This is the standard approach for OSM segment snapping at city scale — confirmed by OSM routing library implementations.

### Pattern 5: Virtual Node Injection

After snapping, the route must start/end at the interpolated point, not at graph nodes A or B. Inject two temporary nodes:

```typescript
// Before A* call, inject virtual nodes into a shallow copy of adjacency
const VIRTUAL_START = '__vs__'
const VIRTUAL_END = '__ve__'

// Virtual start connects to both A and B with weighted partial edges
adjacency[VIRTUAL_START] = [
  { to: segA.id, weight: dist(snappedStart, nodeA) },
  { to: segA.id /* reversed */, ... },
  { to: segB.id, weight: dist(snappedStart, nodeB) },
]
// Also add back-edges from A and B to virtual start
// Same for virtual end

// Run A* from VIRTUAL_START to VIRTUAL_END
// Prepend snappedStart coords and append snappedEnd coords to path
```

**Key:** Shallow-copy the adjacency lists for A and B before mutating — don't modify shared state. Clean up virtual nodes after the call.

### Pattern 6: MapLibre Layers for Phase 2

Following the existing `addRoadLayer` pattern:

```
Sources and Layers (stacked above 'roads'):
  'snap-indicator' source (GeoJSON LineString)     → 'snap-indicator-layer' (dashed line)
  'click-points' source (GeoJSON Point)            → 'click-points-layer' (circle)
  'markers' source (GeoJSON Point, 2 features)     → 'markers-layer' (circle or symbol)
  'route' source (GeoJSON LineString)              → 'route-layer' (bold red line)
```

All managed identically to `roads`: `addSource` + `addLayer` at map-load, `setData` to update.

### Pattern 7: useRouter Hook

Models `useOsmLoader` exactly:

```typescript
export interface RouterState {
  mode: RoutingMode
  setMode: (m: RoutingMode) => void
  sourcePoint: [number, number] | null
  destPoint: [number, number] | null
  snapResult: { source: SnapResult | null; dest: SnapResult | null }
  route: RouteResult | null
  routeError: string | null
  handleMapClick: (lngLat: [number, number]) => void
}
```

Hook owns the cyclic click counter, calls snap logic (can run on main thread — it's fast), posts `route` message to worker when both markers placed (or mode changes).

### Anti-Patterns to Avoid
- **Running A* on main thread:** Even for small graphs this can cause frame drops. All computation in worker.
- **Mutating shared adjacency list:** Virtual node injection must shallow-copy affected lists. Mutation would corrupt subsequent route calls.
- **Using Euclidean distance for haversine heuristic:** Must use haversine (or flat-Earth approximation at city scale) — Euclidean underestimates and breaks admissibility in lon/lat space.
- **Snapping to any road regardless of mode:** Snap must filter by mode access before finding nearest segment. A pedestrian cannot snap to a motorway.
- **Building adjacency on main thread:** The OsmGraph for a city (e.g., Amsterdam) has 200k+ nodes. Build adjacency in the worker.
- **Sending full adjacency list over postMessage:** For large cities the adjacency list serializes to tens of MB. Consider keeping it in the worker and only sending route results. The worker already holds `OsmGraph` — adjacency can stay worker-side and only route results cross the boundary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Priority queue for A* open set | Custom heap | Use a simple array with `sort()` for city-scale graphs | For graphs with < 500k nodes, array-sort is fast enough; a binary heap adds complexity for marginal gain |
| Haversine | Custom formula | Standard haversine formula (6371e3 radius) | Known-correct; see code example below |
| Union-Find | Custom BFS component detection | Standard path-compressed union-find | Union-Find is O(α·n) vs BFS O(n+e); simpler for incremental builds |
| Segment projection math | Custom | Standard parametric projection formula | Well-defined; easy to test |

**Key insight:** This phase is pure algorithm implementation. No new npm packages are needed. The risk is not "wrong library" — it's algorithm correctness (admissible heuristic, virtual node cleanup, mode filter applied consistently).

---

## OSM Access Rules (ROUT-03)

These rules derive from OSM wiki tagging conventions (HIGH confidence — established OSM standard).

### Highway Type Access Matrix

| highway value | car | bicycle | pedestrian |
|---------------|-----|---------|------------|
| motorway | YES | NO | NO |
| trunk | YES | NO | NO |
| primary | YES | YES | YES |
| secondary | YES | YES | YES |
| tertiary | YES | YES | YES |
| unclassified | YES | YES | YES |
| residential | YES | YES | YES |
| service | YES | YES | YES |
| living_street | YES | YES | YES |
| pedestrian | NO | NO | YES |
| footway | NO | NO | YES |
| cycleway | NO | YES | NO |
| path | NO | YES | YES |

### OSM Tag Overrides (apply after highway defaults)
- `access=no` → blocked for all modes
- `foot=no` → blocked for pedestrian
- `bicycle=no` → blocked for bicycle
- `motor_vehicle=no` → blocked for car
- `bicycle=designated` → preferred for bicycle (bonus weight multiplier)

### Speed Table (for STAT-03 in Phase 4; store in route metadata now)

| Mode | Default Speed |
|------|--------------|
| car | 50 km/h (urban default) |
| bicycle | 15 km/h |
| pedestrian | 5 km/h |

**Note:** Phase 2 uses distance-weighted A* (not time-weighted) — haversine heuristic remains admissible. Store travel time in metadata for Phase 4 stats display.

---

## Common Pitfalls

### Pitfall 1: Inadmissible Heuristic
**What goes wrong:** A* returns suboptimal paths or explores more nodes than necessary.
**Why it happens:** Using Euclidean distance (degrees) as heuristic — it doesn't account for Earth curvature, so it over-estimates in some cases (lon degree ≠ lat degree in meters at non-equatorial latitudes).
**How to avoid:** Always use haversine or flat-Earth-corrected distance (meters) for both edge weights and heuristic. The heuristic must be ≤ actual cost (admissible).
**Warning signs:** A* returns paths longer than Dijkstra's result.

### Pitfall 2: Disconnected Component Check at Wrong Time
**What goes wrong:** A* runs for a long time on disconnected graphs before giving up, or throws a silent error.
**Why it happens:** Component detection skipped or done lazily.
**How to avoid:** Label components at graph-build time (union-find over all edges). At snap time, check `componentMap[snapA] !== componentMap[snapB]` before even starting A*. Show toast immediately.
**Warning signs:** Route request hangs for 10+ seconds on disconnected nodes.

### Pitfall 3: Virtual Node Cleanup Forgotten
**What goes wrong:** Subsequent route calls include stale virtual nodes from previous calls, causing incorrect routing.
**Why it happens:** Virtual nodes and their back-edges are added to the adjacency structure but not removed.
**How to avoid:** Use a shallow copy of affected adjacency entries, or explicitly delete virtual node keys after the A* call. Test: run two routes sequentially and assert second path is independent of first snap points.
**Warning signs:** Route 2 passes through geographic coordinates of Route 1's snap points.

### Pitfall 4: Snap Finds Nearest Node Instead of Nearest Segment
**What goes wrong:** Snapped point is always a graph node, not an interpolated point on the segment. Route doesn't start at the exact clicked location.
**Why it happens:** Iterating nodes instead of iterating way-segment pairs.
**How to avoid:** Iterate consecutive node pairs `(nodeRefs[i], nodeRefs[i+1])` for each way, project onto the segment (not just the nodes).
**Warning signs:** Snapped marker jumps to intersections rather than interpolated road positions.

### Pitfall 5: Mode Filter Applied Inconsistently
**What goes wrong:** Snap finds a valid segment, but A* uses edges the mode can't traverse (or vice versa), producing a route that crosses forbidden roads.
**Why it happens:** Mode filter function defined in one place but not called in the other.
**How to avoid:** Define a single `canUseEdge(tags, mode): boolean` function used by both snap and A*. Apply the same filter in both places.
**Warning signs:** Pedestrian route uses motorway edges.

### Pitfall 6: Adjacency List Too Large to Transfer via postMessage
**What goes wrong:** Posting the full adjacency list from worker to main thread causes a multi-second pause (serialization of Map with 200k+ nodes).
**Why it happens:** Treating adjacency like GeoJSON — small enough to transfer. It isn't.
**How to avoid:** Keep adjacency worker-side. Main thread only sends route request parameters (two lon/lat pairs + mode string). Worker only sends route result (path array + history array).
**Warning signs:** Worker `done` message takes 3+ seconds after file parse completes.

### Pitfall 7: MapLibre Click Events Fire on Road Layer Hover
**What goes wrong:** Map click intended to place a marker instead triggers road layer interaction.
**Why it happens:** MapLibre `on('click', layerId, handler)` fires before `on('click', handler)` for the same pixel.
**How to avoid:** Register the marker-placement handler on the map (not a layer). Check `e.defaultPrevented` if needed. Don't use layer-specific click handlers for routing markers.

---

## Code Examples

Verified patterns from standard algorithms and Phase 1 codebase:

### Haversine Distance Function
```typescript
// Standard formula — confirmed against multiple algorithm textbooks
export function haversineMeters(
  a: [number, number],  // [lon, lat]
  b: [number, number],  // [lon, lat]
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (a[1] * Math.PI) / 180
  const φ2 = (b[1] * Math.PI) / 180
  const Δφ = ((b[1] - a[1]) * Math.PI) / 180
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180
  const sinΔφ = Math.sin(Δφ / 2)
  const sinΔλ = Math.sin(Δλ / 2)
  const aa = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}
```

### Segment Projection (Point to Segment)
```typescript
// Standard parametric projection
export function projectPointOnSegment(
  p: [number, number],   // [lon, lat] of click
  a: [number, number],   // [lon, lat] of segment start
  b: [number, number],   // [lon, lat] of segment end
): { projected: [number, number]; t: number } {
  // Work in approximate meters using cosine correction for lon
  const cosLat = Math.cos((a[1] * Math.PI) / 180)
  const ax = a[0] * cosLat, ay = a[1]
  const bx = b[0] * cosLat, by = b[1]
  const px = p[0] * cosLat, py = p[1]

  const abx = bx - ax, aby = by - ay
  const apx = px - ax, apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 === 0) return { projected: a, t: 0 }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
  return {
    projected: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
    t,
  }
}
```

### A* Skeleton
```typescript
// Standard A* with history recording
export function aStar(
  adjacency: AdjacencyList,
  startId: string,
  goalId: string,
  nodes: Map<string, [number, number]>,
  canUse: (tags: Record<string, string>) => boolean,
): RouteResult {
  const gScore = new Map<string, number>([[startId, 0]])
  const fScore = new Map<string, number>([[startId, heuristic(startId, goalId, nodes)]])
  const cameFrom = new Map<string, string>()
  const closed = new Set<string>()
  const open = new Set<string>([startId])
  const searchHistory: string[] = []

  while (open.size > 0) {
    // Pick node in open with lowest fScore
    let current = [...open].reduce((a, b) =>
      (fScore.get(a) ?? Infinity) < (fScore.get(b) ?? Infinity) ? a : b
    )
    searchHistory.push(current)

    if (current === goalId) {
      return { path: reconstructPath(cameFrom, current, nodes), searchHistory, found: true, distance: gScore.get(current) ?? 0 }
    }

    open.delete(current)
    closed.add(current)

    for (const edge of adjacency[current] ?? []) {
      if (closed.has(edge.to) || !canUse(edge.tags)) continue
      const tentativeG = (gScore.get(current) ?? Infinity) + edge.weight
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, current)
        gScore.set(edge.to, tentativeG)
        fScore.set(edge.to, tentativeG + heuristic(edge.to, goalId, nodes))
        open.add(edge.to)
      }
    }
  }

  return { path: [], searchHistory, found: false, distance: 0 }
}
```

### Union-Find for Connected Components
```typescript
// Path-compressed union-find
class UnionFind {
  private parent: Map<string, string> = new Map()
  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!))
    }
    return this.parent.get(x) ?? x
  }
  union(a: string, b: string): void {
    if (!this.parent.has(a)) this.parent.set(a, a)
    if (!this.parent.has(b)) this.parent.set(b, b)
    this.parent.set(this.find(a), this.find(b))
  }
  sameComponent(a: string, b: string): boolean {
    return this.find(a) === this.find(b)
  }
}

// Build during adjacency construction — call union(a, b) for each edge
```

### MapLibre Route Layer (following addRoadLayer pattern)
```typescript
// In mapHelpers.ts — add at map load time
export function addRouteLayers(map: maplibregl.Map): void {
  const EMPTY_FC = { type: 'FeatureCollection', features: [] }

  map.addSource('route', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'route-layer',
    type: 'line',
    source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#e63012', 'line-width': 5, 'line-opacity': 0.9 },
  })

  map.addSource('snap-indicator', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'snap-indicator-layer',
    type: 'line',
    source: 'snap-indicator',
    paint: { 'line-color': '#ffaa00', 'line-width': 1.5, 'line-dasharray': [4, 4] },
  })

  map.addSource('markers', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'markers-layer',
    type: 'circle',
    source: 'markers',
    paint: {
      'circle-radius': 8,
      'circle-color': ['match', ['get', 'markerType'], 'source', '#22bb44', '#ee4444'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })
}
```

### MapLibre Map Click Handler
```typescript
// Register on map object (not layer) to capture all clicks
map.on('click', (e: maplibregl.MapMouseEvent) => {
  const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
  onMapClick(lngLat)  // prop/callback from useRouter
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dijkstra for routing | A* with haversine heuristic | Standard since 1990s | 3-10x fewer nodes explored vs Dijkstra on road networks |
| Node-to-node routing only | Segment interpolation (virtual nodes) | Standard in OSM routers (OSRM, Valhalla) | Accurate start/end positions, not just intersections |
| Server-side routing (OSRM, GraphHopper) | Client-side in-browser A* | This project's constraint | No backend; works for city-scale datasets |
| Full graph transfer to main thread | Graph stays in worker, only results transferred | Modern Web Worker pattern | Avoids serialization bottleneck |

**Deprecated/outdated:**
- BFS for pathfinding: No edge weights, cannot produce shortest path on weighted graph.
- Euclidean heuristic in lon/lat: Non-admissible at high latitudes; always use haversine or cosine-corrected.

---

## Open Questions

1. **One worker vs two workers**
   - What we know: osmWorker already handles file loading. Adding route messaging means worker must hold graph state between messages.
   - What's unclear: Whether a separate routerWorker is cleaner than extending osmWorker.
   - Recommendation: Extend osmWorker — avoids duplicating the OsmGraph state. The worker already holds `graph`; routing is a natural second message type. Keep both handlers in one file; split if it grows unwieldy.

2. **Adjacency list transfer vs worker-retained**
   - What we know: For Amsterdam (~200k nodes), adjacency serializes to ~20-50 MB JSON.
   - What's unclear: Whether the main thread needs the adjacency for snap (it doesn't — snap uses OsmGraph ways/nodes, which is much smaller and already returned as GeoJSON).
   - Recommendation: Keep adjacency in the worker only. Snap runs on main thread using the lightweight `OsmGraph` (nodes + ways), which the worker already sends. No large transfer needed.

3. **Component detection: at graph build or at snap time?**
   - What we know: Union-Find over all edges during adjacency build is O(n·α) — essentially free.
   - What's unclear: Whether to store component IDs in adjacency or as a separate map.
   - Recommendation: Store as `Map<nodeId, componentLabel>` (the root node ID from union-find). Send this small map to main thread alongside GeoJSON so the main thread can check connectivity instantly at snap time without a worker round-trip.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | vite.config.ts (`test` block, jsdom environment) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | snapToNearestSegment returns correct projected point and node IDs | unit | `npx vitest run src/__tests__/segmentSnap.test.ts` | Wave 0 |
| MAP-01 | snapToNearestSegment returns null when no road within 200m | unit | `npx vitest run src/__tests__/segmentSnap.test.ts` | Wave 0 |
| MAP-01 | snap filters by mode (motorway excluded for bicycle) | unit | `npx vitest run src/__tests__/segmentSnap.test.ts` | Wave 0 |
| MAP-02 | same snap logic applies to destination (tested via same function) | unit | `npx vitest run src/__tests__/segmentSnap.test.ts` | Wave 0 |
| ROUT-01 | aStar finds shortest path on simple 3-node graph | unit | `npx vitest run src/__tests__/router.test.ts` | Wave 0 |
| ROUT-01 | aStar searchHistory contains nodes in exploration order | unit | `npx vitest run src/__tests__/router.test.ts` | Wave 0 |
| ROUT-01 | aStar returns found=false on disconnected graph | unit | `npx vitest run src/__tests__/router.test.ts` | Wave 0 |
| ROUT-02 | mode selector renders three buttons; click changes mode | unit | `npx vitest run src/__tests__/modeSelector.test.tsx` | Wave 0 |
| ROUT-03 | canUseEdge returns false for motorway + bicycle | unit | `npx vitest run src/__tests__/router.test.ts` | Wave 0 |
| ROUT-03 | canUseEdge returns false for footway + car | unit | `npx vitest run src/__tests__/router.test.ts` | Wave 0 |
| PIPE-03 | componentMap correctly identifies disconnected nodes | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ❌ extend existing |
| PIPE-03 | sameComponent returns false for disconnected subgraphs | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ❌ extend existing |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/segmentSnap.test.ts` — covers MAP-01, MAP-02
- [ ] `src/__tests__/router.test.ts` — covers ROUT-01, ROUT-03
- [ ] `src/__tests__/modeSelector.test.tsx` — covers ROUT-02
- [ ] `src/lib/segmentSnap.ts` — new module (must exist before tests)
- [ ] `src/lib/router.ts` — new module (must exist before tests)
- [ ] `src/components/ModeSelector.tsx` — new component (needed for ROUT-02 test)
- [ ] Extend `src/__tests__/graphBuilder.test.ts` — add PIPE-03 tests for component detection

*(No new framework install required — Vitest already configured)*

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/osmParser.ts`, `src/lib/graphBuilder.ts`, `src/workers/osmWorker.ts`, `src/lib/mapHelpers.ts`, `src/hooks/useOsmLoader.ts` — direct code inspection
- Standard A* algorithm: Russell & Norvig "Artificial Intelligence: A Modern Approach" — canonical source
- Haversine formula: Standard WGS84 geodesy (R = 6371e3 m)
- Segment projection: Standard parametric line projection formula

### Secondary (MEDIUM confidence)
- OSM highway access defaults: OSM Wiki `Key:access`, `Key:highway`, `Key:bicycle`, `Key:foot` — well-established tagging conventions consistent across OSM routing libraries
- Union-Find path compression: Standard algorithm, O(α·n) amortized

### Tertiary (LOW confidence)
- Speed defaults (50/15/5 km/h): Common defaults used by OSRM and GraphHopper for urban routing; not officially standardized — acceptable approximation for portfolio demo

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; existing stack confirmed by inspection
- A* algorithm: HIGH — standard textbook algorithm, no external library
- Segment snapping: HIGH — standard parametric projection, well-defined math
- OSM access rules: MEDIUM — derived from OSM wiki conventions; covers the highway types already in ROAD_TYPES set
- Architecture: HIGH — extends proven Phase 1 patterns directly
- Pitfalls: HIGH — identified from direct codebase analysis and standard algorithm concerns

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable domain — algorithms and MapLibre API don't change frequently)
