# Phase 3: Search Animation - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Animate the A* search frontier expanding node-by-node on the map while the optimal path grows simultaneously — the core visual experience. Uses pre-calculated `searchHistory` and `path` from Phase 2's `RouteResult`. Speed control via a slider. Pause/play/step/reset are v2 (CTRL-01/02/03) — out of scope.

</domain>

<decisions>
## Implementation Decisions

### Frontier visualization
- Distinguish visited vs frontier nodes by **color + size**:
  - **Frontier nodes**: red (#ff2244 or similar), **6px** circles — bright, dominant
  - **Visited/closed nodes**: teal (#00bcd4), **3px** circles — subtle trail
- Render as two MapLibre circle layers (frontier on top, visited beneath)
- Optimal path line sits above all node layers (bold yellow line takes visual precedence)

### Color scheme (updated from Phase 2)
- **Optimal path line**: **yellow** (changed from red — red is now the frontier node color)
- **Frontier nodes**: red
- **Visited nodes**: teal
- **Road overlay**: blue (Phase 1, unchanged)
- Phase 2's static red route line must be updated to yellow in Phase 3 to avoid clash

### Path-frontier sync
- Path grows **proportionally to frontier**: when frontier has explored X% of total `searchHistory` nodes, path reveals X% of its coordinate sequence
- Both finish at the same frame — synchronized reveal
- Path coordinates are sliced linearly from `path[]` based on fraction explored

### Animation speed
- Default (medium): **~7 nodes per frame** at ~30fps
- Speed slider range: 0.5x to 5x multiplier → ~2 to ~35 nodes per frame
- Uses `requestAnimationFrame` loop; nodes-per-frame adjusts based on slider value

### Animation control UI
- **Bottom-center floating bar**: fixed position, centered horizontally, above map bottom edge
- Contents: 🐢 icon + "Speed" label + horizontal slider track
- No numeric multiplier shown — icon and position on slider convey speed
- Styled consistent with existing overlay pattern: dark semi-transparent background, border, rounded corners
- **Visibility**: appears when a route is computed (before animation starts), persists after animation ends, hidden on OSM reset / before any route exists

### Animation lifecycle
- **Auto-start**: animation begins immediately when route computation completes — no Play button required
- **Interrupt on new click**: if user clicks the map during animation, cancel current animation, clear all frontier/visited layers, compute new route, restart animation. Consistent with Phase 2 cyclic click behavior.
- **End state**: after animation completes, all visited (teal) and frontier (red) nodes remain visible alongside the full yellow path. Static, no fade. Shows full search coverage — the key visual payoff.

### Claude's Discretion
- Exact hex values for red (frontier) and teal (visited) beyond what's specified
- Throttling strategy for GeoJSON updates to maintain ~30fps (batched setData calls, avoid per-node updates)
- Whether to use two separate GeoJSON sources (visited + frontier) or a single source with feature properties to distinguish them
- Exact positioning offsets for the bottom-center speed panel (margin from edge)

</decisions>

<specifics>
## Specific Ideas

- "Red frontier, teal visited" — user's exact color choice overrides the initial recommendation
- Path changes to yellow (not red) to free red for the frontier nodes — this is a Phase 2 visual change that Phase 3 implements
- The end state (full coverage staying visible) is intentional: the user wants to see the full scope of the A* search after animation completes

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `router.ts` → `RouteResult`: `{ path: [number,number][], searchHistory: string[], distance: number, found: boolean }` — `searchHistory` is the animation source; `path` is the growing route line
- `mapHelpers.ts`: `updateRouteLayer(map, path)` uses `source.setData()` pattern — same pattern for frontier/visited circle layers
- `useRouter.ts` → `RouterState.route`: exposes `RouteResult` to React — animation hook can subscribe to this
- `LoadingOverlay.tsx`: uses `percent` prop for progress bar — similar frame-progress model for animation

### Established Patterns
- MapLibre GeoJSON source update: `(map.getSource('id') as GeoJSONSource).setData(fc)` — throttle to ~30fps
- Coordinate convention: all coordinates in lon/lat (GeoJSON) — `searchHistory` node IDs map to `OsmGraph.nodes` Map for coordinates
- Web Worker for computation: A* already runs in `osmWorker.ts`; animation replay runs on main thread (it's just array iteration)
- React patterns: `useRef` for animation frame handle (cancellation), `useState` for speed slider value, `useCallback` for stable handlers

### Integration Points
- `App.tsx` passes `route` from `useRouter` to `MapView` — animation hook can live in `App.tsx` or a new `useAnimation` hook
- `MapView.tsx`: New circle layers for frontier/visited nodes added alongside existing route/markers/snap-indicator layers
- Route line color changes: `updateRouteLayer` in `mapHelpers.ts` needs color updated from red → yellow
- Speed slider component (new): rendered in `App.tsx`, shown when `route !== null`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-search-animation*
*Context gathered: 2026-03-13*
