# Phase 2: Routing Engine - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can click two points on the map, select a routing mode (car/bicycle/pedestrian), and get a computed A* route with full search history recorded — ready for Phase 3 animation. Includes segment snapping, mode-aware access/speed, and disconnected-graph detection.

</domain>

<decisions>
## Implementation Decisions

### Mode Selector
- Floating panel on the map (corner overlay), hidden until OSM data is loaded
- Icon + label format: car / bike / walk — three toggle buttons
- Mode change on an existing route triggers automatic A* re-route immediately (no confirm step)
- Mode selector appears/disappears together with the routing UI (not always visible)

### Route Display
- After A* completes, draw a static bold red line on the map showing the optimal path
- Red is consistent with PROJECT.md vision ("path always highlighted in red")
- Optimal path only — no search frontier / visited-node rendering in Phase 2 (deferred to Phase 3)
- New OSM file load → full reset: clear route, markers, and mode selection

### Marker Placement & Interaction
- Cyclic click flow: 1st map click = source marker, 2nd = destination marker, 3rd = replaces source
- Both markers stay on map after routing; subsequent clicks cycle through replacement
- No drag-to-reposition in Phase 2

### Snap Feedback
- On successful snap: show the raw click point AND the snapped marker on the road segment, connected by a thin dashed line
- On snap failure (no road within 200m): toast notification "No road within 200m" — no marker placed
- On disconnected graph (PIPE-03): toast "No route — points are on disconnected road segments" — both markers remain

### Claude's Discretion
- Exact toast duration and styling
- Dashed line color/weight for click-to-snap indicator
- Floating panel positioning (which corner)
- Source vs destination marker visual distinction (color, shape, label)
- MapLibre layer names and z-order for route and snap-indicator layers

</decisions>

<specifics>
## Specific Ideas

- Red route line is established in PROJECT.md ("path always highlighted in red as search grows") — use the same color for the static display in Phase 2 so Phase 3 animation is visually consistent
- Cyclic marker replacement keeps the interaction dead-simple — no mode toggle, no right-click, just keep clicking

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MapView.tsx`: Map mount point; new route/marker/snap layers will plug in here
- `mapHelpers.ts` (`addRoadLayer`, `updateRoadData`, `fitRoadBounds`): Established pattern for adding MapLibre sources + layers — routing layers should follow same pattern
- `osmWorker.ts`: Worker messaging pattern proven; graph building + A* should extend this worker (or a second worker) to keep computation off-main-thread
- `osmParser.ts`: `OsmGraph` struct already available (`nodes: Map<string, [number, number]>`, `ways: OsmWay[]` with tags including `highway`, `bicycle`, `foot`)
- `useOsmLoader.ts`: React hook wrapping worker messaging — model for a future `useRouter` hook

### Established Patterns
- Distance-weighted edges; haversine heuristic (admissible, established in STATE.md)
- Web Worker for all heavy computation (decompression, parsing — routing follows same rule)
- Coordinate convention: lon/lat in GeoJSON (OSM lat/lon converted at parse boundary)
- Road types already filtered via `ROAD_TYPES` set in osmParser — mode access rules layer on top of this

### Integration Points
- MapLibre `'roads'` GeoJSON source already exists; route and snap-indicator layers will be new sources/layers stacked above it
- `App.tsx` orchestrates the flow: after OSM load success, routing UI (mode selector panel + click handler) becomes active
- Worker → main messaging: extend to include graph adjacency list + A* result (search history + optimal path) in addition to existing GeoJSON

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-routing-engine*
*Context gathered: 2026-03-13*
