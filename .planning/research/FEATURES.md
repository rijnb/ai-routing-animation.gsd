# Feature Landscape

**Domain:** OSM routing visualizer / pathfinding algorithm animation (portfolio demo)
**Researched:** 2026-03-12

## Table Stakes

Features users expect from a pathfinding visualizer on real map data. Missing any of these and the app feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Click-to-set start/end points | Every pathfinding visualizer uses click placement; drag-to-reposition is a bonus | Low | Snap to nearest graph node (use spatial index like QuadTree for O(log n) lookup) |
| Animated search frontier expansion | This IS the core product -- node-by-node A* expansion visible on map | High | Must render thousands of nodes without frame drops; use GeoJSON source updates or custom WebGL layer |
| Optimal path highlight (red) | Project requirement -- pre-calculated path grows simultaneously with frontier | Medium | Animate a LineString that extends segment-by-segment as frontier reaches each path node |
| Start/end markers | Users need clear visual anchors for source and destination | Low | Use MapLibre Markers with distinct icons/colors (green=start, red=end is convention) |
| Visited node coloring | Distinguishing explored vs unexplored territory is fundamental to understanding A* | Medium | Semi-transparent fill radiating outward; use timestamp-based rendering for smooth animation |
| Play/pause control | Users need to stop and examine state; every algorithm visualizer has this | Low | Toggle between requestAnimationFrame loop running vs paused |
| Animation speed control | Users want to slow down to understand or speed up to see result; universal in this domain | Low | Slider or discrete speed buttons (1x, 2x, 5x, 10x); controls nodes-per-frame |
| Reset/clear | Must be able to start over without page reload | Low | Clear animation state, remove path/frontier layers, keep map and graph loaded |
| Routing mode selector (car/bicycle/pedestrian) | Project requirement; differentiates this from grid-based visualizers | Medium | Icon buttons or segmented control; must rebuild edge weights when mode changes |
| OSM file upload (.osm.gz) | Project requirement -- this is the data input mechanism | Medium | File input + in-browser decompression (DecompressionStream or pako) + XML parsing |
| Base map tiles underneath | Real geography context is what makes this special vs grid demos | Low | MapLibre GL JS with OSM raster or vector tiles from a free provider (e.g., MapTiler free tier) |
| Road network overlay | Users must see the graph they are routing on, not just empty map | Medium | Render parsed OSM ways as a GeoJSON line layer with subtle styling |

## Differentiators

Features that set this apart from the many grid-based pathfinding visualizers. Not expected, but make it portfolio-impressive.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dual animation (frontier + path simultaneously) | Unique visual -- most visualizers show path AFTER search completes; showing the known optimal path growing in red while blue frontier expands is visually striking | Medium | Requires pre-calculation, then synchronized replay of both animations |
| Real OSM road network (not grid) | Most portfolio pathfinding demos use grids; real road data on real geography is immediately impressive | High | Already core to the project; the differentiator is visual quality of execution |
| Stats panel (nodes explored, path distance, elapsed time) | Adds educational value and "wow" factor; lets viewers compare routing modes quantitatively | Low | Live-updating counters during animation; distance in km, node count, wall-clock time |
| Frontier vs closed set color distinction | Showing open set (frontier) in one color and closed set (visited) in another teaches A* properly | Low | Two-color scheme: e.g., bright cyan for frontier, faded blue for visited/closed |
| Step-through mode | Frame-by-frame stepping for educational deep-dive; separates this from "just pretty" demos | Medium | Pause + "Next Step" button that advances exactly one node expansion |
| Node/edge info on hover | Hovering over a node/edge shows OSM tags, edge weight, heuristic value -- educational transparency | Medium | MapLibre popup or tooltip on hover; requires hit-testing against graph geometry |
| Algorithm comparison (side-by-side) | Run A* vs Dijkstra on same graph and see difference in explored nodes | High | Requires split-view or overlay; impressive but scope-heavy |
| Keyboard shortcuts | Space=play/pause, arrow keys=step, R=reset -- power user feel | Low | Simple event listeners; enhances perceived polish significantly |
| Progress indicator for file parsing | Large OSM files take seconds to parse; progress bar prevents user confusion | Low | Show parsing stage (decompress -> parse XML -> build graph) with progress % |
| Smooth camera animation | Auto-zoom/pan to fit start+end points; fly-to animation when setting points | Low | MapLibre `fitBounds()` and `flyTo()` built-in |

## Anti-Features

Features to explicitly NOT build. These are traps that would consume time without adding portfolio value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multiple algorithm selection UI (Dijkstra, BFS, DFS, Greedy, etc.) | Scope explosion; this project is about A* on real maps, not an algorithm textbook | Only implement A*; mention in UI that it uses A* with mode-specific heuristics |
| Grid/maze mode | Every other pathfinding visualizer does grids; this project's value IS real OSM data | Stay focused on real road networks only |
| Maze generation | Common in grid visualizers but irrelevant for real map data | N/A -- not applicable to OSM |
| Editable graph (add/remove roads) | Massive complexity for a demo; OSM data is the graph | Graph is read-only from uploaded file |
| Multi-stop routing | Project explicitly out of scope; adds significant A* complexity | Single origin-to-destination only |
| Turn-by-turn directions | This is a visualization demo, not a navigation app | Show path visually, not as text directions |
| Mobile/touch optimization | Desktop browser demo per project scope; touch adds complexity without portfolio value | Desktop-first; basic touch from MapLibre is fine but don't optimize for it |
| Elevation profiles | Interesting but tangential; OSM node elevation data is often missing | Omit entirely |
| Real-time traffic or live data | Explicitly out of scope; adds backend dependency | Static OSM snapshot only |
| Backend/server component | Client-side is simpler to deploy (GitHub Pages), demonstrate, and share | Everything runs in-browser |
| Isochrone visualization | Cool but different product; shows reachable area rather than specific path | Out of scope |
| Route export (GPX, GeoJSON) | Useful in production routing apps but unnecessary for a demo | Omit; the visual IS the output |

## Feature Dependencies

```
OSM File Upload + Parse --> Road Network Overlay --> Graph Data Structure
Graph Data Structure --> Click-to-Set Points (need nodes to snap to)
Graph Data Structure + Routing Mode --> A* Pre-calculation
A* Pre-calculation --> Search Frontier Animation
A* Pre-calculation --> Optimal Path Animation
Search Frontier Animation + Optimal Path Animation --> Play/Pause/Speed Controls
Play/Pause/Speed Controls --> Step-Through Mode (extension of pause)
Road Network Overlay + Base Map --> All Visual Features
```

Key insight: Everything depends on the OSM parse-to-graph pipeline. Build that first, render it, then layer animation on top.

## MVP Recommendation

**Phase 1 -- Data Pipeline + Map (foundation everything else depends on):**
1. OSM .osm.gz upload and in-browser parse
2. Graph data structure from OSM ways (mode-aware edge weights)
3. MapLibre base map with road network overlay
4. Click-to-set start/end with node snapping

**Phase 2 -- Core Animation (the product's reason to exist):**
5. A* implementation with pre-calculation
6. Search frontier animation (node-by-node expansion)
7. Simultaneous optimal path animation (red line growing)
8. Play/pause and speed controls

**Phase 3 -- Polish (portfolio-grade finishing touches):**
9. Routing mode selector (car/bicycle/pedestrian)
10. Stats panel (nodes explored, distance, time)
11. Step-through mode
12. Keyboard shortcuts
13. Progress indicator for file parsing
14. Frontier vs closed set color distinction

**Defer indefinitely:** Algorithm comparison, node/edge hover info, any anti-features listed above.

## Sources

- [Clement Mihailescu's Pathfinding Visualizer](https://clementmihailescu.github.io/Pathfinding-Visualizer/) -- benchmark for grid-based pathfinding UI patterns
- [OSM Pathfinding Visualizer by dominikschweigl](https://dominikschweigl.github.io/osm-path-visualizer/) -- closest existing project to this concept
- [Pathfinding Visualizer for Real-World Cities](https://github.com/0kzh/pathfinding-visualizer) -- OSM-based visualizer with performance metrics
- [PathFinding.js Visual](https://qiao.github.io/PathFinding.js/visual/) -- clean UI reference for algorithm controls
- [VisuAlgo](https://visualgo.net/en) -- gold standard for algorithm animation controls and step-through
- [MapLibre GL JS Examples](https://maplibre.org/maplibre-gl-js/docs/examples/) -- animation and interaction patterns
- [EF-Map Exploration Mode](https://ef-map.com/blog/exploration-mode-pathfinding-visualization) -- color scheme best practices for search visualization
- [Map UI Patterns](https://mapuipatterns.com/) -- general map interaction design patterns
- [Google Routes API](https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteTravelMode) -- routing mode conventions
