# Phase 4: Stats and Marker Interaction - Research

**Researched:** 2026-03-14
**Domain:** MapLibre GL JS draggable markers, React state integration, route statistics display
**Confidence:** HIGH

## Summary

Phase 4 adds two independent capabilities to a complete Phase 3 codebase: (1) a live stats panel showing nodes-explored counter, path distance, and estimated travel time, and (2) draggable source/destination markers that trigger route recalculation on drop.

The stats features are pure React state plumbing. The data already exists in the codebase — `RouteResult.distance` (meters), `RouteResult.searchHistory` (node IDs for counting), and `RoutingMode` (determines assumed speed for time). The only new logic is a travel time formula and a live counter that ticks with `useAnimation`'s rAF loop.

The draggable marker feature requires replacing the current GeoJSON circle-layer markers (rendered via MapLibre data layers) with `maplibregl.Marker` DOM overlay objects that have `draggable: true`. MapLibre's `Marker` class exposes `dragend` event + `getLngLat()`, which feeds directly into the existing `handleMapClick`/`triggerRoute` pipeline. This is the one structural change in the phase.

**Primary recommendation:** Keep stats as a new `StatsPanel` component fed from `useAnimation` + `RouteResult`. Replace GeoJSON marker layer with two `maplibregl.Marker` instances owned by `MapView`, exposed to `App.tsx` via a drag callback.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAT-01 | Live counter shows nodes explored during animation | `useAnimation` rAF loop already tracks `cursor` position — expose as state; `filterHistory(route.searchHistory).length` is total |
| STAT-02 | Path distance in km displayed after route found | `RouteResult.distance` is meters from A* gScore — divide by 1000, show when `route.found === true` |
| STAT-03 | Estimated travel time derived from routing mode speeds | Divide `distance` by mode speed constant (car 50 km/h, bicycle 15 km/h, pedestrian 5 km/h); format as h:mm or m:ss |
| MAP-04 | Drag source/destination marker to new position, triggers full recalculation | `new maplibregl.Marker({ draggable: true })` + `marker.on('dragend', ...)` + `marker.getLngLat()` — feed into existing `handleMapClick` equivalent |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| maplibre-gl | ^5.20.0 (installed) | Draggable Marker DOM overlays | Built-in `Marker` class with `draggable` option and `dragend` event — no third-party needed |
| React | ^19.2.4 (installed) | Stats panel UI, state management | Already the app framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | All needs are met by installed dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `maplibregl.Marker` draggable | Custom mouse event listeners on GeoJSON circle | Marker is built-in, handles projection math; custom approach requires mousedown/mousemove/mouseup on canvas with coordinate conversion — unnecessary complexity |
| Stats in `App.tsx` inline | Dedicated `StatsPanel` component | Component is cleaner; App.tsx is already growing |

**Installation:** No new packages required — all dependencies installed.

## Architecture Patterns

### Recommended Project Structure

Phase 4 adds:
```
src/
├── components/
│   └── StatsPanel.tsx          # new: nodes explored, distance, travel time
├── hooks/
│   └── useAnimation.ts         # modified: expose nodesExplored count as state
└── components/
    └── MapView.tsx             # modified: add draggable Marker instances
```

No new lib files needed. Changes are concentrated in `useAnimation`, `MapView`, and a new `StatsPanel`.

### Pattern 1: Expose Live Node Count from useAnimation

**What:** `useAnimation` already tracks `cursor` (how many nodes processed). Expose it as a `useState` integer, updated each frame.

**When to use:** The rAF loop is the only code that knows the current animation position. Lifting state to App via callback would be fine too, but internal useState is simpler.

**Example:**
```typescript
// In useAnimation.ts — add to existing state
const [nodesExplored, setNodesExplored] = useState<number>(0)

// Inside frame() loop, after cursor advances:
setNodesExplored(cursor)

// Reset on startAnimation:
setNodesExplored(0)

// Return from hook:
return { speed, setSpeed, startAnimation, cancelAnimation, nodesExplored }
```

Confidence: HIGH — React useState inside rAF loops is a standard pattern.

### Pattern 2: MapLibre Draggable Marker

**What:** Replace the GeoJSON `markers` source/layer (currently in `mapHelpers.ts` `updateMarkersLayer`) with two imperative `maplibregl.Marker` instances owned by `MapView`.

**When to use:** Whenever you need user-draggable map pins. GeoJSON circle layers cannot be dragged.

**Example:**
```typescript
// Source: https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/
const marker = new maplibregl.Marker({ draggable: true, color: '#22bb44' })
  .setLngLat([lon, lat])
  .addTo(map)

marker.on('dragend', () => {
  const lngLat = marker.getLngLat()
  onMarkerDrag('source', [lngLat.lng, lngLat.lat])
})
```

The `dragend` event fires once when the user releases the marker. `getLngLat()` returns the final position. Feed `[lng, lat]` into `onMarkerDrag` callback which triggers re-route via existing `useRouter.triggerRoute`.

Confidence: HIGH — Verified against MapLibre GL JS official docs (maplibre.org/maplibre-gl-js/docs/API/classes/Marker/).

### Pattern 3: StatsPanel Component

**What:** A fixed-position overlay panel that shows stats. Visible when a route exists. Shows nodes count (live during animation), distance (after route found), travel time (after route found).

**When to use:** After route arrives — `route !== null && route.found === true`.

**Example:**
```tsx
interface StatsPanelProps {
  nodesExplored: number
  totalNodes: number          // filterHistory(route.searchHistory).length
  distanceKm: number | null   // null while animating
  travelTimeMin: number | null
  visible: boolean
}
```

Position: top-right corner (or top-left) — does not conflict with existing `SpeedPanel` (bottom-center), `ModeSelector` (bottom-left area), `DropZone` (center-left), `SettingsPanel` (top-left or similar). Use top-right to avoid all conflicts.

### Pattern 4: Travel Time Calculation

**What:** Derive estimated travel time from `route.distance` (meters) and `RoutingMode`.

**When to use:** When `route.found === true`.

```typescript
// In a new lib utility or inline in StatsPanel
const MODE_SPEEDS_KMH: Record<RoutingMode, number> = {
  car: 50,         // urban average
  bicycle: 15,     // comfortable cycling average
  pedestrian: 5,   // walking average
}

function estimateTravelTime(distanceMeters: number, mode: RoutingMode): number {
  const speedMs = (MODE_SPEEDS_KMH[mode] * 1000) / 3600
  return distanceMeters / speedMs  // seconds
}
```

Format as `"2h 15m"` or `"45 min"` or `"8 min"` depending on magnitude.

Confidence: HIGH — Straightforward arithmetic. Speed assumptions are conventional for portfolio demo context; exact values are discretionary.

### Pattern 5: MapView Marker Lifecycle

**What:** Markers must be created when a snap point exists, repositioned when snap changes, and removed when routing resets.

**When to use:** MapView must react to `sourceSnap`/`destSnap` prop changes.

```typescript
// MapView.tsx — add refs for marker instances
const sourceMarkerRef = useRef<maplibregl.Marker | null>(null)
const destMarkerRef = useRef<maplibregl.Marker | null>(null)

// useEffect watching sourceSnap
useEffect(() => {
  if (!mapRef.current || !loadedRef.current) return
  if (!sourceSnap) {
    sourceMarkerRef.current?.remove()
    sourceMarkerRef.current = null
    return
  }
  if (!sourceMarkerRef.current) {
    sourceMarkerRef.current = new maplibregl.Marker({ draggable: true, color: '#22bb44' })
      .setLngLat(sourceSnap.snappedPoint)
      .addTo(mapRef.current)
    sourceMarkerRef.current.on('dragend', () => {
      const ll = sourceMarkerRef.current!.getLngLat()
      onMarkerDrag?.('source', [ll.lng, ll.lat])
    })
  } else {
    sourceMarkerRef.current.setLngLat(sourceSnap.snappedPoint)
  }
}, [sourceSnap, onMarkerDrag])
```

This pattern: create once, update with `setLngLat`, remove on null.

### Anti-Patterns to Avoid

- **Re-creating Marker on every render:** Expensive — always use `useRef` to persist marker instances and call `setLngLat` for position updates.
- **Using `markers-layer` GeoJSON source alongside `maplibregl.Marker`:** Remove the GeoJSON circle layer entirely to avoid duplicate markers overlapping. `updateMarkersLayer` in `mapHelpers.ts` should either be removed or no longer called.
- **Calling `snapToNearestSegment` on the dropped position in the main thread:** The drag callback should call `handleMapClick`-equivalent (which already snaps internally) — or post a route message to the worker. Do not run snap logic twice.
- **Setting `nodesExplored` state on every rAF frame without concern for React batching:** In React 19, `setState` in rAF is batched — this is fine and will not cause excessive re-renders at 60fps.
- **`dragend` firing during programmatic `setLngLat` calls:** MapLibre does NOT fire drag events from imperative `setLngLat()` — only from user interaction. Safe to call `setLngLat` in useEffect without callback recursion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable map pin | Custom canvas mousemove/mouseup coordinate projection | `maplibregl.Marker({ draggable: true })` | Handles projection, touch, bounds clamping, cursor styles automatically |
| DOM overlay positioning | CSS absolute positioning over canvas | `maplibregl.Marker` | Marker auto-repositions on map pan/zoom |
| Travel time display | Fetching real routing API speeds | Hardcoded mode speed table | Portfolio demo — approximate constants are fine and expected |

**Key insight:** `maplibregl.Marker` handles all the hard parts of draggable map overlays including coordinate system conversion, projection on zoom/pan, and event propagation suppression (drag events don't bubble to the map click handler).

## Common Pitfalls

### Pitfall 1: Map Click Fires on Marker Drag Release

**What goes wrong:** When user drops a dragged marker, `dragend` fires on the marker AND `click` fires on the map, triggering `handleMapClickWithCancel` which starts a new route cycle and resets click state.

**Why it happens:** MapLibre's map `click` event fires on `mouseup` regardless of what element the user interacted with, unless propagation is stopped.

**How to avoid:** MapLibre `Marker` automatically stops map click propagation when the marker is dragged — the map `click` event does NOT fire after a drag. This is built into the library. No extra code needed. However, a pure click on the marker DOES propagate to the map — be aware if this is undesirable.

**Warning signs:** If you see double routing requests or click counter advancing unexpectedly after drag.

### Pitfall 2: Stale `onMarkerDrag` Callback in dragend Listener

**What goes wrong:** `dragend` listener captures the initial `onMarkerDrag` prop and never sees updates — classic stale closure.

**Why it happens:** Event listener registered once at marker creation, captures closure over the prop at that moment.

**How to avoid:** Use a stable ref pattern (same as `onMapClickRef` established in Phase 2):
```typescript
const onMarkerDragRef = useRef(onMarkerDrag)
useEffect(() => { onMarkerDragRef.current = onMarkerDrag })
// In dragend: onMarkerDragRef.current?.('source', [lng, lat])
```

**Warning signs:** Drag works first time but not after mode change or other state updates.

### Pitfall 3: GeoJSON markers-layer Still Visible Under Draggable Markers

**What goes wrong:** Old circle layer from `updateMarkersLayer` renders beneath the new `Marker` DOM elements, creating visual duplicates.

**Why it happens:** `updateMarkersLayer` is called from `MapView`'s useEffect watching `sourceSnap`/`destSnap`.

**How to avoid:** Remove the call to `updateMarkersLayer` from `MapView` when switching to `maplibregl.Marker`. Optionally remove the `markers` source/layer entirely from `addRouteLayers` in `mapHelpers.ts`, or simply stop setting its data.

### Pitfall 4: nodesExplored Stays Stale After Route Reset

**What goes wrong:** `nodesExplored` shows the last animation's count after user sets a new source point, before new route is computed.

**Why it happens:** `cancelAnimation` is called on new click (via `handleMapClickWithCancel`) but `nodesExplored` is not reset.

**How to avoid:** Reset `nodesExplored` to 0 in `cancelAnimation` (or in `startAnimation` before the first frame). `startAnimation` already exists and is the right place since that's when the counter logically restarts.

### Pitfall 5: StatsPanel Visibility Edge Cases

**What goes wrong:** Stats panel appears briefly with stale data when a new route is being computed (after marker drag but before `route-done` response).

**Why it happens:** `route` still holds the old value while worker computes new route.

**How to avoid:** Clear `route` in `useRouter` when a new routing request is triggered (same behavior as current map click reset logic). Check existing `handleMapClick` in `useRouter` — it already calls `setRoute(null)` on source click. The drag handler should similarly clear route state before dispatching new route request.

## Code Examples

### StatsPanel component sketch
```typescript
// Source: project pattern (SpeedPanel.tsx as reference)
interface StatsPanelProps {
  nodesExplored: number
  totalNodes: number
  distanceKm: number | null
  travelTimeSeconds: number | null
  visible: boolean
}

export function StatsPanel({ nodesExplored, totalNodes, distanceKm, travelTimeSeconds, visible }: StatsPanelProps) {
  if (!visible) return null

  const formatTime = (seconds: number): string => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      return `${h}h ${m}m`
    }
    return `${Math.round(seconds / 60)} min`
  }

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 400,
      padding: '12px 16px',
      background: 'rgba(10, 10, 30, 0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      color: '#ffffff',
      fontSize: '13px',
      minWidth: '160px',
    }}>
      <div>Nodes: {nodesExplored.toLocaleString()} / {totalNodes.toLocaleString()}</div>
      {distanceKm !== null && <div>Distance: {distanceKm.toFixed(2)} km</div>}
      {travelTimeSeconds !== null && <div>Est. time: {formatTime(travelTimeSeconds)}</div>}
    </div>
  )
}
```

### Draggable Marker creation in MapView
```typescript
// Source: https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/
// Pattern adapted to match project's stable-ref anti-stale-closure convention
const marker = new maplibregl.Marker({ draggable: true, color: '#22bb44' })
  .setLngLat(sourceSnap.snappedPoint)
  .addTo(map)

marker.on('dragend', () => {
  const { lng, lat } = marker.getLngLat()
  onMarkerDragRef.current?.('source', [lng, lat])
})
```

### Route recalculation on drag (in useRouter or App.tsx)
```typescript
// onMarkerDrag: called from MapView when user drops a marker
const handleMarkerDrag = useCallback(
  (which: 'source' | 'destination', lngLat: [number, number]) => {
    if (!graph) return
    const snapResult = snapToNearestSegment(lngLat, graph, modeRef.current, 200)
    if (!snapResult) return
    cancelAnimation()
    if (mapRef.current) clearFrontierLayers(mapRef.current)
    if (which === 'source') {
      setSourceSnap(snapResult)
      sourceSnapRef.current = snapResult
      if (destSnapRef.current) triggerRoute(snapResult, destSnapRef.current, modeRef.current)
    } else {
      setDestSnap(snapResult)
      destSnapRef.current = snapResult
      if (sourceSnapRef.current) triggerRoute(sourceSnapRef.current, snapResult, modeRef.current)
    }
  },
  [graph, cancelAnimation, triggerRoute],
)
```

Note: `snapToNearestSegment` runs on the main thread here. It's synchronous and fast enough for drag completion (not continuous drag). The worker already handles routing — no architectural change needed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GeoJSON circle layer for markers | `maplibregl.Marker` DOM overlays | Phase 4 (this phase) | Enables native drag; removes `updateMarkersLayer` call |
| No live stats | StatsPanel with live counter | Phase 4 | New overlay, top-right corner |

**Deprecated/outdated:**
- `updateMarkersLayer` in `mapHelpers.ts`: Still valid code but will no longer be called once MapView uses `maplibregl.Marker`. Can be kept or removed.

## Open Questions

1. **Should `handleMarkerDrag` live in `useRouter` or `App.tsx`?**
   - What we know: `useRouter` owns `triggerRoute`, `sourceSnapRef`, `destSnapRef`. `App.tsx` owns `cancelAnimation` and `clearFrontierLayers`.
   - What's unclear: Whether to add `cancelAnimation` as a parameter to a `useRouter.handleMarkerDrag`, or keep drag logic in `App.tsx` calling both hooks.
   - Recommendation: Add `handleMarkerDrag` to `useRouter` and pass `cancelAnimation` + `clearFrontierLayers` calls to `App.tsx` via the same pattern as `handleMapClickWithCancel`. Keeps routing concerns in `useRouter`.

2. **`nodesExplored` scoping: expose from `useAnimation` or pass callback?**
   - What we know: `useAnimation` owns the rAF loop and cursor. React 19 batches state.
   - What's unclear: Whether `setNodesExplored` per frame is acceptable perf (yes in React 19 with batching).
   - Recommendation: useState in `useAnimation`, returned as `nodesExplored`. Simple and consistent with how `speed` is handled.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 |
| Config file | vite.config.ts (test block) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAT-01 | `nodesExplored` increments and resets correctly | unit | `npx vitest run src/__tests__/stats.test.ts -t "nodesExplored"` | Wave 0 |
| STAT-02 | Distance formatting (meters to km, 2 decimal places) | unit | `npx vitest run src/__tests__/stats.test.ts -t "distance"` | Wave 0 |
| STAT-03 | `estimateTravelTime` returns correct seconds for each mode | unit | `npx vitest run src/__tests__/stats.test.ts -t "travelTime"` | Wave 0 |
| MAP-04 | `handleMarkerDrag` calls `triggerRoute` with correct snap and clears animation | unit | `npx vitest run src/__tests__/markerDrag.test.ts` | Wave 0 |

Note: `maplibregl.Marker` drag interaction is imperative/DOM-level — the drag event cannot be unit-tested in jsdom without mocking. Tests should verify the callback pipeline (`handleMarkerDrag` logic), not the MapLibre event binding itself.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/stats.test.ts` — covers STAT-01, STAT-02, STAT-03 (pure function tests for `estimateTravelTime`, distance formatting)
- [ ] `src/__tests__/markerDrag.test.ts` — covers MAP-04 drag callback pipeline

*(No changes needed to existing test infrastructure — vitest config already in place)*

## Sources

### Primary (HIGH confidence)
- [MapLibre GL JS Marker API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/) — draggable option, drag events, getLngLat, setLngLat, setDraggable
- Project codebase (`src/hooks/useAnimation.ts`, `src/hooks/useRouter.ts`, `src/lib/mapHelpers.ts`) — verified existing patterns

### Secondary (MEDIUM confidence)
- MapLibre GL JS official docs (verified): `Marker` fires `dragstart`, `drag`, `dragend` events; map `click` event is suppressed after marker drag

### Tertiary (LOW confidence)
- Speed assumptions (car 50 km/h, bicycle 15 km/h, pedestrian 5 km/h) — conventional portfolio-demo averages, not sourced from a specific authoritative document. Exact values are discretionary.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — maplibre-gl is already installed; Marker API verified against official docs
- Architecture: HIGH — patterns derived directly from existing codebase conventions
- Pitfalls: HIGH — stale closure pitfall is documented in STATE.md (same pattern solved in Phase 2 for onMapClick); GeoJSON layer conflict is structurally obvious
- Travel time constants: LOW — reasonable conventions, explicitly discretionary

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (maplibre-gl API is stable; React 19 batching behavior is stable)
