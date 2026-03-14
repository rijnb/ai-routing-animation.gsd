# Phase 3: Search Animation - Research

**Researched:** 2026-03-13
**Domain:** requestAnimationFrame loop, MapLibre GeoJSON layer updates, React animation hooks
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Frontier visualization:**
- Frontier nodes: red (#ff2244 or similar), 6px circles — bright, dominant
- Visited/closed nodes: teal (#00bcd4), 3px circles — subtle trail
- Two MapLibre circle layers (frontier on top, visited beneath)
- Optimal path line sits above all node layers

**Color scheme:**
- Optimal path line: yellow (changed from red — red is now the frontier node color)
- Frontier nodes: red
- Visited nodes: teal
- Road overlay: blue (unchanged)
- Phase 2's static red route line must be updated to yellow in Phase 3

**Path-frontier sync:**
- Path grows proportionally to frontier: when frontier has explored X% of total searchHistory nodes, path reveals X% of its coordinate sequence
- Both finish at the same frame — synchronized reveal
- Path coordinates are sliced linearly from path[] based on fraction explored

**Animation speed:**
- Default (medium): ~7 nodes per frame at ~30fps
- Speed slider range: 0.5x to 5x multiplier → ~2 to ~35 nodes per frame
- Uses requestAnimationFrame loop; nodes-per-frame adjusts based on slider value

**Animation control UI:**
- Bottom-center floating bar: fixed position, centered horizontally, above map bottom edge
- Contents: turtle icon + "Speed" label + horizontal slider track
- No numeric multiplier shown
- Styled consistent with existing overlay pattern: dark semi-transparent background, border, rounded corners
- Visibility: appears when route is computed (before animation starts), persists after animation ends, hidden on OSM reset / before any route exists

**Animation lifecycle:**
- Auto-start: animation begins immediately when route computation completes
- Interrupt on new click: cancel current animation, clear all frontier/visited layers, compute new route, restart animation
- End state: all visited (teal) and frontier (red) nodes remain visible alongside the full yellow path — static, no fade

### Claude's Discretion
- Exact hex values for red (frontier) and teal (visited) beyond what's specified
- Throttling strategy for GeoJSON updates to maintain ~30fps (batched setData calls, avoid per-node updates)
- Whether to use two separate GeoJSON sources (visited + frontier) or a single source with feature properties
- Exact positioning offsets for the bottom-center speed panel (margin from edge)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. v2 controls (pause/play/step/reset) are CTRL-01/02/03, out of scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANIM-01 | Search frontier expands node-by-node, rendering visited/frontier nodes visually distinct | MapLibre circle layers + rAF loop driving batched setData calls; two-layer approach (visited beneath, frontier on top) enables distinct visual identity |
| ANIM-02 | Optimal path grows simultaneously with frontier expansion (pre-calculated, always visible) | Proportional slice of path[] array fed to updateRouteLayer on each batch; route line color change from red → yellow required in mapHelpers.ts |
| ANIM-03 | User can adjust animation speed via a speed slider | React useState for slider value (0.5x–5x), nodes-per-frame derived from multiplier, SpeedPanel component following ModeSelector overlay pattern |
</phase_requirements>

---

## Summary

Phase 3 animates the pre-computed A* `searchHistory` array (node IDs in exploration order) from `RouteResult` using a `requestAnimationFrame` loop. Each frame advances a cursor through `searchHistory` by N nodes (where N = 7 * speedMultiplier), builds two GeoJSON point feature collections (visited nodes accumulated, frontier nodes = the current batch), calls `setData` on two MapLibre circle sources, and simultaneously reveals the proportional slice of `path[]` via the existing `updateRouteLayer`. The animation is driven entirely on the main thread — no Worker involvement — since it is array iteration plus DOM/WebGL updates.

The main integration work is: (1) a new `useAnimation` hook that owns the rAF loop and cancellation, (2) two new MapLibre circle layers registered in `mapHelpers.ts` and initialised in `MapView.tsx`, (3) a `SpeedPanel` component matching the existing floating-panel design language, and (4) updating the route line color from red to yellow in `mapHelpers.ts`.

A critical pitfall: `searchHistory` returned by the worker contains virtual node IDs `__vs__` and `__ve__` (the snapped endpoint nodes injected for routing). These have coordinates in `extendedNodes` on the worker side but those coordinates are NOT available on the main thread. The animation hook must filter these two IDs out of `searchHistory` before animating, or the `OsmGraph.nodes` lookup will return `undefined` and produce corrupt GeoJSON.

**Primary recommendation:** Implement `useAnimation(map, route, graph)` as a standalone hook with a `useRef` for the rAF handle and `useCallback` for `startAnimation`/`cancelAnimation`. Pass `graph` (which holds the `nodes` Map) down from `App.tsx` via `MapView` props to make node-ID-to-coordinate lookup available on the main thread.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| maplibre-gl | ^5.20.0 | GeoJSON source `setData` for circle layers | Already in project; GeoJSONSource.setData is the only correct way to update map features |
| React | ^19.2.4 | Hook lifecycle, useRef for rAF handle, useState for speed | Already in project; hooks already established pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| geojson (types) | via @types | FeatureCollection, Point types for circle GeoJSON | Type-safe GeoJSON construction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rAF loop on main thread | Web Worker postMessage per frame | Worker approach adds serialization cost and latency — rAF is simpler and fast enough for array iteration |
| Two separate GeoJSON sources | Single source with feature property | Two sources is simpler: MapLibre circle paint properties cannot easily distinguish feature categories for radius without data-driven expressions; two sources avoids rebuilding the entire feature collection on every frame |
| setData batched per-frame | Per-node setData | Per-node setData is ~30-50 calls/second per node — would cause severe jank; batching is mandatory |

**Installation:** No new packages required — all dependencies present.

---

## Architecture Patterns

### Recommended File Changes

```
src/
├── hooks/
│   └── useAnimation.ts        # NEW — rAF loop, cancellation, speed state
├── components/
│   ├── MapView.tsx             # MODIFIED — add graph prop, add frontier/visited layers, pass animPathSlice
│   └── SpeedPanel.tsx         # NEW — bottom-center speed slider component
├── lib/
│   └── mapHelpers.ts          # MODIFIED — addFrontierLayers(), updateFrontierLayers(), clearFrontierLayers(), route color red→yellow
└── App.tsx                    # MODIFIED — wire useAnimation, render SpeedPanel
```

### Pattern 1: rAF Animation Loop with Cancellation

**What:** A `useRef` stores the animation frame ID returned by `requestAnimationFrame`. The loop function reads the current `speedRef` (a ref to avoid stale closure on slider changes), advances the cursor, calls setData, then calls `requestAnimationFrame` again if not done.

**When to use:** Any time-driven animation that must be cancellable and react to external state changes (new route, map reset).

```typescript
// Established pattern in this codebase (from useRouter.ts + LoadingOverlay)
const rafHandleRef = useRef<number | null>(null)
const speedRef = useRef<number>(1.0) // kept in sync with slider state via useEffect

const cancelAnimation = useCallback(() => {
  if (rafHandleRef.current !== null) {
    cancelAnimationFrame(rafHandleRef.current)
    rafHandleRef.current = null
  }
}, [])

const startAnimation = useCallback((map: maplibregl.Map, route: RouteResult, graph: OsmGraph) => {
  cancelAnimation()
  // filter virtual nodes
  const history = route.searchHistory.filter(id => id !== '__vs__' && id !== '__ve__')
  const total = history.length
  let cursor = 0
  const visited: [number, number][] = []

  const frame = () => {
    const nodesPerFrame = Math.max(1, Math.round(7 * speedRef.current))
    const batch = history.slice(cursor, cursor + nodesPerFrame)
    cursor += nodesPerFrame

    for (const id of batch) {
      const coord = graph.nodes.get(id)
      if (coord) visited.push(coord)
    }

    // frontier = last batch coords
    const frontierCoords = batch
      .map(id => graph.nodes.get(id))
      .filter((c): c is [number, number] => c !== undefined)

    updateFrontierLayers(map, visited, frontierCoords)

    // Proportional path slice
    const fraction = Math.min(cursor / total, 1)
    const pathSlice = route.path.slice(0, Math.ceil(route.path.length * fraction))
    updateRouteLayer(map, pathSlice)

    if (cursor < total) {
      rafHandleRef.current = requestAnimationFrame(frame)
    } else {
      // End state: show full path and full coverage
      updateRouteLayer(map, route.path)
      rafHandleRef.current = null
    }
  }

  rafHandleRef.current = requestAnimationFrame(frame)
}, [cancelAnimation])
```

### Pattern 2: MapLibre Circle Layers for Point Data

**What:** Two GeoJSON sources (`frontier-nodes`, `visited-nodes`) with `circle` type layers. Visited layer added first (renders beneath), frontier layer on top.

**When to use:** Rendering thousands of point features that update frequently.

```typescript
// Source: mapHelpers.ts established pattern
export function addFrontierLayers(map: maplibregl.Map): void {
  // visited-nodes: beneath frontier
  map.addSource('visited-nodes', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'visited-nodes-layer',
    type: 'circle',
    source: 'visited-nodes',
    paint: {
      'circle-radius': 3,
      'circle-color': '#00bcd4',  // teal
      'circle-opacity': 0.7,
    },
  })

  // frontier-nodes: on top
  map.addSource('frontier-nodes', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'frontier-nodes-layer',
    type: 'circle',
    source: 'frontier-nodes',
    paint: {
      'circle-radius': 6,
      'circle-color': '#ff2244',  // red
      'circle-opacity': 1.0,
    },
  })
}

export function updateFrontierLayers(
  map: maplibregl.Map,
  visited: [number, number][],
  frontier: [number, number][],
): void {
  const toFC = (coords: [number, number][]): FeatureCollection<Point> => ({
    type: 'FeatureCollection',
    features: coords.map(c => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: c },
      properties: {},
    })),
  })

  ;(map.getSource('visited-nodes') as GeoJSONSource)?.setData(toFC(visited))
  ;(map.getSource('frontier-nodes') as GeoJSONSource)?.setData(toFC(frontier))
}

export function clearFrontierLayers(map: maplibregl.Map): void {
  ;(map.getSource('visited-nodes') as GeoJSONSource)?.setData(EMPTY_FC)
  ;(map.getSource('frontier-nodes') as GeoJSONSource)?.setData(EMPTY_FC)
}
```

### Pattern 3: SpeedPanel Component

**What:** Floating bar matching ModeSelector design language — absolute position, dark semi-transparent background, inline styles.

**When to use:** Any new floating UI panel over the map.

```typescript
// Follows ModeSelector.tsx pattern (inline styles, absolute position, visibility prop)
interface SpeedPanelProps {
  speed: number              // 0.5 to 5.0
  onSpeedChange: (v: number) => void
  visible: boolean
}

export function SpeedPanel({ speed, onSpeedChange, visible }: SpeedPanelProps) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 18px',
      background: 'rgba(10, 10, 30, 0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      color: '#ffffff',
      fontSize: '13px',
    }}>
      <span aria-hidden="true">🐢</span>
      <span>Speed</span>
      <input
        type="range"
        min={0.5}
        max={5}
        step={0.5}
        value={speed}
        onChange={e => onSpeedChange(parseFloat(e.target.value))}
        style={{ width: '120px' }}
        aria-label="Animation speed"
      />
    </div>
  )
}
```

### Layer Z-Order in MapLibre

MapLibre layers render in insertion order (last added = topmost). The existing layer order in `addRouteLayers` is:
1. `snap-indicator-layer` (added first)
2. `markers-layer`
3. `route-layer` (topmost)

For Phase 3, `addFrontierLayers` must be called **before** `addRouteLayers` in the `map.on('load')` handler so the route line sits above the circle nodes. The call order in `MapView.tsx` `map.on('load')` becomes:

```typescript
map.on('load', () => {
  addRoadLayer(map)
  addFrontierLayers(map)   // NEW — added before route layers
  addRouteLayers(map)
  loadedRef.current = true
})
```

### Anti-Patterns to Avoid

- **Per-node setData calls:** Calling `setData` once per node per frame = thousands of WebGL redraws/second. Always accumulate the full visited array and call setData once per frame.
- **Stale closure on speed slider:** Speed changes via slider must update a `useRef` inside the rAF loop, not state. If speed is read from state inside the frame closure, it will be stale. Use `speedRef.current`.
- **Blocking the route line color change:** The existing `addRouteLayers` in `mapHelpers.ts` sets `line-color: '#e63012'` (red). This must change to yellow (`#ffcc00` or similar) in Phase 3. Forgetting this causes the route line to clash with the frontier red.
- **Passing graph to MapView as a new object each render:** `graph` from `useOsmLoader` is a stable reference (only changes on new file load). Pass it directly; no need to memoize.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Throttling animation to ~30fps | Custom timer/setInterval | requestAnimationFrame + nodes-per-frame batching | rAF already fires at display refresh rate (60fps); process multiple nodes per frame to achieve effective ~30fps "visual" update rate |
| Point rendering | Canvas 2D overlay | MapLibre GeoJSON circle layer | MapLibre handles WebGL rendering, zoom-level scaling, GPU batching; canvas overlay is a complete parallel rendering pipeline |
| Cancellation token | Separate boolean flag | `cancelAnimationFrame(id)` + nulling the ref | The rAF ID is the cancellation token — built into the browser API |

**Key insight:** The entire animation is array iteration + two `setData` calls per frame. There is no complex state machine needed — just a cursor index and two arrays.

---

## Common Pitfalls

### Pitfall 1: Virtual Node IDs in searchHistory

**What goes wrong:** The worker runs A* with `VIRTUAL_START = '__vs__'` and `VIRTUAL_END = '__ve__'` injected into the adjacency list. These appear at the beginning and end of `searchHistory`. When the animation hook calls `graph.nodes.get('__vs__')`, it returns `undefined` because these IDs only exist in `extendedNodes` on the worker side.

**Why it happens:** The worker uses `extendedNodes` (a local extended copy of the graph's nodes Map) for A*, but only sends `searchHistory` back — not the extended node map.

**How to avoid:** Filter virtual IDs before animating:
```typescript
const history = route.searchHistory.filter(id => id !== '__vs__' && id !== '__ve__')
```

**Warning signs:** Frontier/visited layers render no points, or console errors about undefined coordinates.

### Pitfall 2: Layer Insertion Order for Z-Ordering

**What goes wrong:** If `addFrontierLayers` is called after `addRouteLayers`, the circle node layers render on top of the yellow route line, obscuring it.

**Why it happens:** MapLibre renders layers in insertion order. There is no explicit `before` parameter used in the current codebase's layer setup.

**How to avoid:** Always call `addFrontierLayers(map)` before `addRouteLayers(map)` in the `map.on('load')` handler.

**Warning signs:** Route line disappears once visited nodes cover the path corridor.

### Pitfall 3: Stale speedRef vs useState

**What goes wrong:** If the rAF loop captures `speed` from a `useState` variable in its closure (set at `startAnimation` call time), changing the slider mid-animation has no effect until the animation restarts.

**Why it happens:** rAF callbacks form closures over the variables present when the loop function was created.

**How to avoid:** Keep `speedRef = useRef(1.0)`, update it in a `useEffect` on speed state change:
```typescript
useEffect(() => { speedRef.current = speed }, [speed])
```
Read `speedRef.current` inside the frame function, not `speed`.

**Warning signs:** Slider moves but animation speed doesn't change during an active animation.

### Pitfall 4: Animation Not Cancelling on Map Click

**What goes wrong:** User clicks mid-animation to set a new origin. The old rAF loop continues running, calling `setData` on the frontier/visited layers with stale data from the previous route. The new animation then fights the old one.

**Why it happens:** The rAF loop has no reference to the new route's state; it will keep running until it reaches the end of `history`.

**How to avoid:** In `handleMapClick` (in `useRouter.ts` or in `App.tsx`), call `cancelAnimation()` before calling `handleMapClick`. The interrupt lifecycle is: cancel rAF → clear frontier layers → set route null → proceed with new click.

**Warning signs:** Ghost nodes from previous route visible during new animation.

### Pitfall 5: Memory Growth from Visited Array

**What goes wrong:** The `visited` array inside the rAF closure accumulates all explored coordinates for the current animation. For a large city area, A* may explore 10,000–50,000 nodes. Each coordinate is 2 × 8 bytes = 16 bytes; 50k nodes = 800KB — acceptable. However, if animations are not cleaned up and the array is held in closure, it stays in memory.

**Why it happens:** Closures prevent GC while the animation is live.

**How to avoid:** The visited array lives inside the closure of `startAnimation`. When `cancelAnimation` is called or the animation completes, the frame closure goes out of scope and can be GC'd. This is fine as long as `startAnimation` creates a new closure each time (not an accumulating outer array).

**Warning signs:** Increasing memory usage across multiple routes without reloads — check with Chrome DevTools Memory tab.

---

## Code Examples

Verified patterns from existing codebase:

### GeoJSONSource.setData (from mapHelpers.ts)
```typescript
// Source: src/lib/mapHelpers.ts — updateRouteLayer
const source = map.getSource('route') as GeoJSONSource | undefined
if (!source) return
source.setData(fc)
```

### useRef for Stable Callback Registration (from MapView.tsx)
```typescript
// Source: src/components/MapView.tsx — onMapClickRef pattern
const onMapClickRef = useRef(onMapClick)
useEffect(() => {
  onMapClickRef.current = onMapClick
})
// Inside map.on('click'): onMapClickRef.current?.([...])
```
The same pattern applies to `speedRef` — keep it current via useEffect, read it inside the rAF loop.

### Route Color Change Required (mapHelpers.ts line 106)
```typescript
// Current (MUST CHANGE in Phase 3):
'line-color': '#e63012',  // red — clashes with frontier nodes

// New value:
'line-color': '#ffcc00',  // yellow — matches CONTEXT.md decision
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas overlay for custom rendering | MapLibre GeoJSON layers | MapLibre GL JS v1+ | No separate canvas management; GPU-accelerated; scales correctly with map zoom |
| setInterval for animation timing | requestAnimationFrame | ~2013 (browser standard) | Synced to display refresh; pauses when tab hidden; no drift |

---

## Open Questions

1. **Should `useAnimation` receive `map` directly or be co-located inside `MapView`?**
   - What we know: The existing architecture has `MapView` own the map ref; `App.tsx` drives data via props.
   - What's unclear: Passing `mapRef.current` upward or adding an `onMapReady` callback both have tradeoffs.
   - Recommendation: Keep animation co-located inside `MapView` (or a child hook called from `MapView`). Pass `route` and `graph` as props. This avoids exposing the map ref outside of `MapView` and is consistent with how `updateRouteLayer` is called today.

2. **Performance with very large search histories (>50k nodes)?**
   - What we know: At 7 nodes/frame × 60fps = 420 nodes/sec; 50k nodes → ~119 seconds at default speed. At 5x → ~24 seconds. Acceptable.
   - What's unclear: Whether MapLibre's `setData` with a 50k-feature FeatureCollection causes jank due to WebGL buffer upload cost.
   - Recommendation: The throttle to ~30fps effective updates (process nodes per frame, call setData once) should handle this. If jank occurs, add a max-features threshold: only render the last N visited nodes (sliding window) rather than all of them.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 |
| Config file | vite.config.ts (`test` block) |
| Quick run command | `npx vitest run src/__tests__/animation.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-01 | Virtual node IDs filtered from searchHistory before rendering | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |
| ANIM-01 | Visited array accumulates correctly across frames | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |
| ANIM-01 | Frontier array contains only current-batch nodes | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |
| ANIM-02 | Path slice fraction matches cursor/total ratio | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |
| ANIM-02 | Path slice at cursor=total returns full path | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |
| ANIM-03 | nodesPerFrame = max(1, round(7 × multiplier)) | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |
| ANIM-03 | nodesPerFrame at 0.5x = 4, at 5x = 35 | unit | `npx vitest run src/__tests__/animation.test.ts` | Wave 0 |

Notes on testability:
- `useAnimation` hook integration (rAF loop + MapLibre setData) is manual-only — jsdom has no rAF implementation that runs frames and no WebGL; mock-based tests provide limited value here.
- The pure logic (virtual node filter, path slice fraction, nodesPerFrame calculation) CAN be extracted as pure functions and unit-tested.
- Recommendation: extract `computeNodesPerFrame(multiplier)`, `slicePath(path, cursor, total)`, and `filterHistory(searchHistory)` as pure utility functions in `useAnimation.ts` and test those directly.

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/animation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/animation.test.ts` — covers ANIM-01 (filter + accumulate), ANIM-02 (path slice), ANIM-03 (nodesPerFrame)

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/mapHelpers.ts` — GeoJSONSource.setData pattern, layer insertion order
- Codebase: `src/workers/osmWorker.ts` — confirmed virtual node IDs `__vs__`/`__ve__` in searchHistory
- Codebase: `src/lib/router.ts` — RouteResult shape: `{ path, searchHistory, distance, found }`
- Codebase: `src/hooks/useRouter.ts` — useRef for stable refs, cancel patterns
- Codebase: `src/components/MapView.tsx` — map lifecycle, layer init in `map.on('load')`
- Codebase: `src/components/ModeSelector.tsx` — floating panel design pattern
- MDN: `requestAnimationFrame` / `cancelAnimationFrame` — browser-standard animation API

### Secondary (MEDIUM confidence)
- MapLibre GL JS docs: GeoJSON source `setData` for dynamic updates (consistent with maplibre-gl ^5.20.0 in package.json)
- MapLibre GL JS docs: Circle layer paint properties (`circle-radius`, `circle-color`, `circle-opacity`)

### Tertiary (LOW confidence)
- Performance estimate (50k nodes = ~800KB visited array) — calculated from coordinate size, not benchmarked

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — patterns derived directly from existing codebase
- Pitfalls: HIGH — virtual node issue confirmed by direct code inspection of osmWorker.ts; layer order confirmed by mapHelpers.ts
- Test strategy: MEDIUM — pure function extraction recommended but not yet in codebase

**Research date:** 2026-03-13
**Valid until:** 2026-04-12 (stable domain — maplibre-gl and React APIs unlikely to change meaningfully)
