# Pitfalls Research

**Domain:** In-browser OSM routing animation (TypeScript, MapLibre GL JS)
**Researched:** 2026-03-12
**Confidence:** HIGH (verified against OSM wiki, MapLibre docs, known issues)

## Critical Pitfalls

### Pitfall 1: Haversine heuristic becomes inadmissible with time-based edge weights

**What goes wrong:**
A* guarantees optimal paths only when the heuristic never overestimates the true cost. If edge weights represent travel time (distance / speed), then the heuristic must estimate minimum possible travel time, not distance. A straight-line Haversine distance heuristic is admissible for distance-weighted graphs, but becomes inadmissible for time-weighted graphs unless divided by the maximum speed in the entire graph. If you use Haversine distance as the heuristic but edge costs are travel time, the heuristic can overestimate (a 1km straight line takes longer on a 30km/h residential road than the heuristic assumes if it doesn't account for speed), and A* may return suboptimal paths.

**Why it happens:**
Developers implement A* with Haversine distance as heuristic, then switch edge weights from distance to time for mode-aware routing without adjusting the heuristic. The bug is subtle because paths still look plausible -- they are just not optimal.

**How to avoid:**
For time-weighted A*, the heuristic must be: `haversine_distance(current, goal) / max_speed_in_graph`. This guarantees the heuristic never overestimates travel time. Alternatively, if edge weights are pure distance, Haversine is directly admissible. Pick one approach and be consistent. For a portfolio demo, distance-weighted edges are simpler and avoid this issue entirely; mode differences can be expressed through which edges are traversable rather than through speed weights.

**Warning signs:**
- A* returns a path but it is not the same as Dijkstra's path for the same query
- Routes take unexpected detours through fast roads when they should use shorter local roads
- Unit tests comparing A* vs Dijkstra results fail intermittently

**Phase to address:**
Graph construction and A* implementation phase. Decide on weight semantics (distance vs time) before writing the algorithm.

---

### Pitfall 2: Disconnected graph components cause "no route found" for valid-looking points

**What goes wrong:**
OSM data contains many disconnected subgraphs: dead-end service roads, parking lots, construction areas, mapped paths not connected to the road network. When a user clicks a point, it snaps to the nearest node, which may be on a tiny disconnected island. A* returns no path, and the user sees a confusing failure with no explanation.

**Why it happens:**
Real OSM data is messy. A small city extract can have dozens of disconnected components. Developers test with clean subsets and never encounter this until real data is loaded.

**How to avoid:**
After building the graph, run a connected components analysis (BFS/DFS from any node, mark all reachable nodes, repeat for unvisited). Keep only the largest connected component, or at minimum, when snapping a clicked point to the nearest node, only consider nodes in the largest component. This is a standard step in all production routing engines (OSRM, GraphHopper, Valhalla all do this).

**Warning signs:**
- "No route found" on seemingly valid start/end points
- Routes work for some point pairs but not others in the same area
- Graph node count is much higher than expected for the road network

**Phase to address:**
Graph construction phase. Component analysis should run immediately after graph build, before any routing queries.

---

### Pitfall 3: MapLibre GeoJSON source update memory leak during animation

**What goes wrong:**
Calling `source.setData()` on every `requestAnimationFrame` tick causes updates to queue faster than MapLibre's web worker can process them. The worker's task queue grows indefinitely, consuming memory until the tab crashes. This is a known MapLibre bug (issue #6154, fixed in later versions via PR #6163) but affects any version prior to the fix.

**Why it happens:**
The natural pattern for animation is "update data every frame." MapLibre's architecture processes GeoJSON in a web worker, and `setData` is async. At 60fps, updates pile up while the worker is still processing the previous one.

**How to avoid:**
1. Use a recent MapLibre version (post-fix for #6154) where `setData` cancels pending updates.
2. Throttle source updates: do not call `setData` every frame. Instead, batch multiple animation steps and update the source every 2-3 frames or on a throttled interval (e.g., 20-30fps for map updates while animation logic runs at 60fps).
3. For the search frontier animation, accumulate new explored nodes in a buffer and flush to the map source periodically, not per-node.
4. Consider using `map.getSource('id').updateData()` for incremental updates instead of full `setData` when adding features.

**Warning signs:**
- Browser memory usage climbs steadily during animation
- Animation stutters and then freezes
- Console shows worker-related warnings
- Tab crashes on longer routes

**Phase to address:**
Animation implementation phase. Design the animation loop with throttled map updates from the start.

---

### Pitfall 4: OSM oneway and access tag misinterpretation breaks routing modes

**What goes wrong:**
OSM tagging for access restrictions is complex and inconsistent. Common failures:
- Treating `oneway=yes` as applying to pedestrians (it should not -- pedestrians can walk against oneway streets)
- Missing `oneway:bicycle=no` exceptions (many oneway streets allow contraflow cycling)
- Not handling implied oneways: `junction=roundabout` and `highway=motorway` imply `oneway=yes` even without the tag
- Treating `oneway=-1` as "not oneway" instead of "oneway in reverse direction"
- Ignoring that `highway=footway` prohibits cars and bicycles by default, while `highway=cycleway` permits bicycles but not cars
- Missing `access=private` or `access=no` overrides

**Why it happens:**
The OSM tagging model is a loose convention, not a schema. The wiki documents defaults per highway type per country, but no mainstream router actually follows the wiki tables exactly. Developers either oversimplify (ignore most tags) or try to be exhaustive (and get edge cases wrong).

**How to avoid:**
For a portfolio demo, implement a pragmatic subset:
1. Respect `oneway=yes` and `oneway=-1` for car mode only (not pedestrian, and check `oneway:bicycle=no` for bicycle mode)
2. Handle implied oneways: `junction=roundabout` implies `oneway=yes`
3. Use simple highway-type defaults: motorway/trunk = cars only; footway/path = pedestrians only; cycleway = bicycles + pedestrians; residential/tertiary/secondary/primary = all modes
4. Check `access=no`, `access=private`, `motor_vehicle=no`, `bicycle=no`, `foot=no` as explicit overrides
5. Do NOT try to implement country-specific defaults -- it is a rabbit hole with no end

**Warning signs:**
- Car routes going the wrong way on one-way streets
- Bicycle routes identical to car routes (missing cycleway access)
- Pedestrian routes using motorways
- Routes going through roundabouts the wrong direction

**Phase to address:**
Graph construction phase, specifically the edge filtering and directionality logic. Build a tag interpretation table and test it against known scenarios before wiring up routing.

---

### Pitfall 5: Parsing large OSM XML in the main thread freezes the browser

**What goes wrong:**
A small city extract (.osm.gz) can be 5-50MB compressed, expanding to 50-500MB of XML. Parsing this with DOMParser or a synchronous XML parser on the main thread blocks the UI for seconds to minutes. The browser may show "page unresponsive" dialogs or simply appear frozen.

**Why it happens:**
Developers start with small test files (a few blocks), parsing works fine, then a real city extract kills the browser. XML parsing is inherently CPU-intensive, and building an in-memory DOM for a large OSM file is extremely memory-hungry.

**How to avoid:**
1. Use a streaming SAX-style parser, not a DOM parser. Do not build a full XML DOM -- process elements as they stream through.
2. Run parsing in a Web Worker so the main thread stays responsive. Show a progress indicator.
3. Use `DecompressionStream` API for gzip decompression (supported in all modern browsers since 2023) -- pipe the file through decompression, then through a streaming XML parser.
4. Build the graph incrementally during parsing: first pass collects nodes (id -> lat/lon), second pass processes ways (build edges from node sequences + tags). Do not store the raw XML or full OSM data model -- extract only what routing needs.
5. Consider a two-pass approach: pass 1 scans ways to identify which node IDs are referenced, pass 2 stores only those nodes. This dramatically reduces memory for areas with many non-road features.

**Warning signs:**
- UI freezes during file upload
- Browser memory spikes to multiple GB
- "Page unresponsive" dialogs
- Works with test files, fails with real city extracts

**Phase to address:**
OSM parsing phase. This must be designed correctly from the start -- retrofitting a Web Worker around a synchronous parser is painful.

---

### Pitfall 6: Coordinate order confusion (lat/lng vs lng/lat)

**What goes wrong:**
OSM stores coordinates as latitude, longitude (lat first). GeoJSON spec and MapLibre use longitude, latitude (lng first). Mixing these up causes all points to appear in wrong locations -- often in the ocean or on a different continent. The bug is insidious because both are valid coordinate pairs, so no error is thrown.

**Why it happens:**
This is the single most common mapping API bug. OSM XML has `<node lat="52.37" lon="4.89">`, and developers naturally build arrays as `[lat, lon]`. But GeoJSON and MapLibre expect `[lon, lat]` = `[4.89, 52.37]`. The 90-degree rotation is not always obvious on small scales.

**How to avoid:**
1. Define a typed coordinate interface early: `type LngLat = [number, number]` with clear documentation that index 0 is longitude.
2. Convert from OSM format to lng/lat immediately during parsing -- never store lat/lng order in the graph.
3. Write a single conversion function used everywhere, never inline coordinate swaps.
4. Add an assertion or visual sanity check: plot the bounding box of parsed data on the map and verify it matches the expected region.

**Warning signs:**
- Map shows no data (points are in the ocean)
- Points appear reflected across the diagonal (x and y swapped)
- Bounding box is wrong (e.g., shows up in Africa instead of Europe)

**Phase to address:**
OSM parsing phase. Establish the coordinate convention in the first code that touches coordinates.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip connected component analysis | Faster graph build | Random "no route" failures confuse users | Never -- it is cheap and essential |
| Store full OSM XML DOM in memory | Simpler parsing code | 10x memory usage, browser crashes on real data | Only for tiny test files during early dev |
| Update MapLibre source every frame | Simpler animation code | Memory leak, jank, tab crashes | Never -- throttle from the start |
| Hardcode tag rules instead of a data table | Faster to implement | Adding routing modes or fixing tag logic requires code changes everywhere | MVP only; refactor before adding modes |
| Use `any` types for OSM data | Faster parsing implementation | Type errors surface at runtime in graph building, not at parse time | Never -- define interfaces upfront |
| Skip Web Worker for parsing | Simpler architecture | UI freezes, poor UX on real data | Only for prototype phase with tiny test data |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MapLibre tile sources | Using a tile URL that requires an API key without configuring it | Use free tile sources (e.g., `https://demotiles.maplibre.org/style.json`) for development; document API key requirement for production tiles |
| MapLibre layer ordering | Adding animation layers before base layers, causing them to be hidden beneath fills | Use `map.addLayer(layer, beforeId)` to control z-order; add route/animation layers last or use `beforeId` of a known label layer |
| DecompressionStream | Assuming the file is gzip when it might be raw XML | Check the file header (magic bytes `1f 8b` for gzip) before piping through DecompressionStream; handle both .osm and .osm.gz gracefully |
| GeoJSON coordinate precision | Passing OSM coordinates with 7+ decimal places | Round to 6 decimal places (~11cm precision, more than sufficient) to reduce GeoJSON payload size for MapLibre |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Creating new GeoJSON objects every animation frame | GC pauses, stuttering animation | Pre-allocate GeoJSON structure, mutate coordinates array in place, call setData with same object reference | Noticeable at >100 animated nodes |
| Storing graph as objects with string keys (node ID lookups) | Slow graph traversal | Use a Map<number, Node> or typed arrays for adjacency list; avoid string-keyed object property access in hot loops | >50k nodes |
| Rendering all graph edges as MapLibre features | Map becomes unresponsive | Only render explored edges during animation, not the full graph; use viewport culling | >10k edges visible |
| SAX parsing without streaming (loading full string first) | Same memory spike as DOM parsing | Pipe DecompressionStream directly to parser; process chunks as they arrive | Files >20MB compressed |
| A* priority queue using array sort | O(n log n) per insertion instead of O(log n) | Use a binary heap implementation for the open set | >10k nodes in open set |
| Building graph with edge objects (weight, from, to) | Millions of small objects cause GC pressure | Consider flat typed arrays for adjacency data if performance matters; or at minimum, avoid unnecessary wrapper objects | >200k edges |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator during parsing | User thinks app is broken, refreshes | Show parsing progress (bytes processed / total), use Web Worker to keep UI responsive |
| Click-to-place snaps to invisible graph node | Pin appears in unexpected location, user confused | Show the road network graph on the map so users click on visible roads; highlight the snapped node |
| Animation too fast to follow on large graphs | User sees a flash, misses the visualization | Default to moderate speed; provide pause/step/speed controls; auto-scale speed to route length |
| "No route found" with no explanation | User retries same points, gets frustrated | Explain why: "Start point is not on the road network" or "No connected path exists between these points" |
| No visual difference between routing modes | User switches modes, nothing visibly changes | Highlight which roads are available per mode (e.g., dim motorways in pedestrian mode); ensure the graph visual changes with mode |
| Animation restarts without clearing previous | Overlapping colored paths create visual mess | Clear previous animation state completely before starting new route |

## "Looks Done But Isn't" Checklist

- [ ] **Oneway handling:** Test routing through a known one-way street in both directions -- car mode should refuse reverse, pedestrian should allow it
- [ ] **Roundabout direction:** Test a route through a roundabout -- cars should traverse it counterclockwise (right-hand traffic) or clockwise (left-hand traffic), never backwards
- [ ] **Disconnected components:** Load a real city extract and try routing to a point on a service road or parking lot -- should fail gracefully, not crash
- [ ] **Large file handling:** Test with a 20MB+ compressed OSM file -- parsing should not freeze the UI
- [ ] **Animation memory:** Run a long route animation (1000+ frames) and check browser memory -- should stay flat, not climb
- [ ] **Coordinate order:** Load data for a known city and verify the bounding box matches the expected geographic location, not a mirrored version
- [ ] **Bicycle vs car routes:** Route between the same two points in both modes -- paths should differ if cycleways or oneway exceptions exist in the data
- [ ] **Graph edge count:** Verify the graph has a reasonable number of edges (a city typically has 2-5x as many edges as nodes, not 1:1 which would indicate missing bidirectional edges)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Inadmissible heuristic | LOW | Fix heuristic formula; if using time weights, divide haversine by max speed; all routing results change but no structural refactor needed |
| Coordinate order confusion | LOW-MEDIUM | Add coordinate conversion at parse boundary; grep for all `[lat, lon]` patterns and swap; write regression tests with known coordinates |
| Main-thread parsing | HIGH | Requires moving to Web Worker architecture; parser code needs restructuring for message-passing; plan for this from the start |
| Missing connected component analysis | LOW | Add post-build BFS/DFS pass; filter nodes; no change to parser or A* needed |
| MapLibre memory leak | MEDIUM | Refactor animation loop to throttle updates; may require restructuring the frame callback; lower cost if caught early |
| Wrong oneway/access logic | MEDIUM | Fix tag interpretation table; requires re-testing all routing modes; lower cost if tag logic is centralized in one module |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Coordinate order confusion | OSM parsing / data model | Plot parsed bounding box on map, verify location |
| Main-thread parsing freeze | OSM parsing | Load 20MB+ file, UI remains responsive |
| Disconnected components | Graph construction | Route to points near parking lots / dead ends, get graceful failure |
| Oneway / access tag errors | Graph construction | Automated tests: car cannot reverse on oneway, pedestrian can walk on footway, bike uses cycleway |
| Inadmissible heuristic | A* implementation | Compare A* results vs Dijkstra for 20+ random pairs, all must match |
| MapLibre memory leak | Animation implementation | Run 60-second animation, monitor memory stays flat |
| GeoJSON update performance | Animation implementation | Animation at 30fps with 500+ explored nodes, no visible jank |
| Layer ordering issues | Map rendering setup | Animation layers visible above base map at all zoom levels |

## Sources

- [OSM Key:oneway wiki](https://wiki.openstreetmap.org/wiki/Key:oneway) -- oneway tag rules, implied oneways, bicycle exceptions
- [OSM Access Restrictions for routing](https://wiki.openstreetmap.org/wiki/OSM_tags_for_routing/Access_restrictions) -- default access by highway type, country variations
- [OSM junction=roundabout wiki](https://wiki.openstreetmap.org/wiki/Tag:junction=roundabout) -- implied oneway for roundabouts
- [OSM Relation:restriction wiki](https://wiki.openstreetmap.org/wiki/Relation:restriction) -- turn restriction modeling
- [MapLibre GeoJSON memory leak issue #6154](https://github.com/maplibre/maplibre-gl-js/issues/6154) -- rapid setData causes unbounded memory growth
- [MapLibre animate-a-line example](https://maplibre.org/maplibre-gl-js/docs/examples/animate-a-line/) -- official animation pattern
- [MapLibre large GeoJSON optimization guide](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/) -- coordinate precision, simplification
- [DecompressionStream MDN docs](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream) -- browser gzip support baseline 2023
- [CycleStreets OSM conversion docs](https://www.cyclestreets.net/help/journey/osmconversion/) -- bicycle routing tag interpretation
- [OSM routing wiki](https://wiki.openstreetmap.org/wiki/Routing) -- data quality requirements for routing

---
*Pitfalls research for: In-browser OSM routing animation*
*Researched: 2026-03-12*
