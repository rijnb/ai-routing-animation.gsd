# Phase 1: Data Pipeline and Map Foundation - Research

**Researched:** 2026-03-12
**Domain:** MapLibre GL JS, OSM XML parsing, Web Workers, fflate gzip decompression, TomTom Maps API
**Confidence:** HIGH (core stack), MEDIUM (TomTom style URL format), HIGH (architecture patterns)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Show a progress bar with a stage label during OSM load ('Decompressing…', 'Parsing nodes…', 'Building graph…')
- Loading indicator is an overlay on the map canvas — covers the map while loading, then disappears
- After parsing completes, fade in the road network overlay (not instant)
- Map auto-fits/zooms to the loaded road network bounds after parsing completes
- Visually differentiate road types: thick for motorway/trunk, medium for primary/secondary, thin for residential/path
- Color scheme: blue tones — #4488ff for primary roads, #2255cc for secondary, thinner/dimmer for residential
- Keep base map roads and labels visible under the overlay (geographic context preserved)
- Base map tiles come from TomTom Maps API (not CartoDB or OSM standard tiles)
- Use TomTom "Basic Night" (dark) style
- On first load: check localStorage for TomTom API key — if missing, show a prompt/modal to enter it, then save to localStorage
- Settings panel accessible via a gear/settings icon (top-right): shows the stored API key (masked) and a "Clear key" button
- Clearing the key removes it from localStorage and re-prompts the user on next use

### Claude's Discretion
- Exact progress bar visual design (colors, animation, placement within overlay)
- Exact settings panel layout and styling
- API key input modal styling
- Line widths for each road tier (within the thick/medium/thin hierarchy)
- Opacity of the road overlay layer

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | User can upload a .osm.gz file via file picker or drag-and-drop | File input + dragover/drop events; File.arrayBuffer() transfers to Worker |
| PIPE-02 | Browser decompresses and parses the OSM XML in a Web Worker (UI remains responsive) | fflate gunzipSync in Worker; DOMParser or manual XML parse; postMessage with progress |
| PIPE-04 | Parsed road network is rendered as a visible overlay layer on the MapLibre base map | MapLibre addSource('geojson') + addLayer('line') with data-driven paint expressions |
| MAP-03 | User can pan and zoom the map at any time, including during animation | MapLibre GL JS interactive by default; overlay does not block interaction |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire technical stack from scratch: a Vite + React + TypeScript app that loads an OSM .gz file, decompresses and parses it in a Web Worker, builds a road graph, and renders it as a GeoJSON line overlay on a MapLibre base map fed from TomTom tiles. There is no existing source code — every pattern is established here.

The parsing pipeline must stay off the main thread. fflate's `gunzipSync` runs fast inside a Worker and avoids the marshalling overhead of `CompressionStream`. OSM XML is parsed with `DOMParser` (available in Workers via the `importScripts`-accessible `DOMParser` global in modern browsers) — for Amsterdam/Leiden-sized files this is adequate; streaming SAX is only needed for files over ~100 MB. The Worker communicates progress via `postMessage` and sends the final GeoJSON back via transferable ArrayBuffer (zero-copy).

MapLibre GL JS v5.20.0 renders the overlay as a GeoJSON source + line layer with data-driven `match` expressions for `line-width` and `line-color` keyed on the `highway` feature property. TomTom "Basic Night" style is loaded as the map style URL; the API key is injected from `localStorage`.

**Primary recommendation:** Vite + React + TypeScript scaffold → Web Worker with fflate + DOMParser → MapLibre GeoJSON overlay with data-driven paint expressions → TomTom style URL with API key from localStorage.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| maplibre-gl | ^5.20.0 | Interactive map rendering, GeoJSON overlays | Open-source fork of Mapbox GL; vector tiles, WebGL-accelerated; TypeScript-first |
| fflate | ^0.8.2 | Gzip decompression in browser/Worker | Faster than `CompressionStream` for in-memory data; 8 kB bundle; pure TS |
| vite | ^6.x | Build tool, dev server, Worker bundling | `import.meta.url` Worker syntax built-in; TypeScript out of box |
| react | ^18.x | UI component tree | Standard for interactive single-page apps |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/maplibre-gl | (bundled) | TypeScript types for MapLibre | Included in maplibre-gl package since v3 |
| vitest | ^2.x | Unit testing | Testing OSM parsing logic, graph building |
| @testing-library/react | ^16.x | Component integration tests | Testing UI components (modal, progress bar) |
| jsdom | latest | DOM environment for Vitest | Required for React component tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fflate | `CompressionStream` (native) | Native is available everywhere but has poor in-memory perf; fflate is faster for files already in memory |
| DOMParser (Worker) | `fast-xml-parser` | fast-xml-parser is faster for huge files but adds a dependency; DOMParser is zero-dependency and sufficient for city-scale OSM files |
| React | Vanilla TS | Simpler for this size, but React pays off in Phases 2–4 with modal/panel state |

**Installation:**
```bash
npm create vite@latest . -- --template react-ts
npm install maplibre-gl fflate
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── workers/
│   └── osmWorker.ts         # Web Worker: decompress + parse + postMessage
├── lib/
│   ├── osmParser.ts         # Pure function: Uint8Array → OsmGraph (nodes, ways)
│   ├── graphBuilder.ts      # Pure function: OsmGraph → road GeoJSON FeatureCollection
│   └── mapHelpers.ts        # fitBounds, addRoadLayer, removeRoadLayer helpers
├── components/
│   ├── MapView.tsx           # MapLibre map container; manages map instance lifecycle
│   ├── LoadingOverlay.tsx    # Progress bar + stage label overlay; CSS fade-in/out
│   ├── ApiKeyModal.tsx       # First-run localStorage key prompt
│   ├── SettingsPanel.tsx     # Gear icon → masked key + clear button
│   └── DropZone.tsx          # File input + drag-and-drop area
├── hooks/
│   └── useOsmLoader.ts       # Orchestrates Worker messages, progress state, result
├── App.tsx
└── main.tsx
public/
└── maps/
    ├── index.json            # ["leiden.osm.gz", "amsterdam.osm.gz"]
    ├── leiden.osm.gz
    └── amsterdam.osm.gz
```

### Pattern 1: Web Worker with Staged Progress

**What:** Worker sends progress messages before the final result. Main thread updates UI state on each message.
**When to use:** Any multi-stage blocking operation that must not freeze the UI.

```typescript
// src/workers/osmWorker.ts
import { gunzipSync } from 'fflate';

self.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
  const raw = new Uint8Array(e.data.buffer);

  postMessage({ type: 'progress', stage: 'Decompressing…', pct: 0 });
  const xml = gunzipSync(raw);

  postMessage({ type: 'progress', stage: 'Parsing nodes…', pct: 30 });
  const osm = parseOsmXml(xml);  // DOMParser inside Worker

  postMessage({ type: 'progress', stage: 'Building graph…', pct: 70 });
  const geojson = buildRoadGeoJson(osm);

  // Transfer GeoJSON as serialized string in ArrayBuffer for zero-copy
  postMessage({ type: 'done', geojson }, []);
};
```

```typescript
// src/hooks/useOsmLoader.ts
const worker = new Worker(
  new URL('../workers/osmWorker.ts', import.meta.url),
  { type: 'module' }
);

worker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    setStage(e.data.stage);
    setPercent(e.data.pct);
  } else if (e.data.type === 'done') {
    setGeojson(e.data.geojson);
  }
};
```

### Pattern 2: MapLibre GeoJSON Overlay with Data-Driven Styling

**What:** Add a named GeoJSON source + line layer; use `match` expressions for highway-type-based paint values.
**When to use:** Rendering categorized vector data over a tile base map.

```typescript
// Source: https://maplibre.org/maplibre-style-spec/layers/
// Attach after map.on('load', ...)
map.addSource('roads', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] }  // initially empty
});

map.addLayer({
  id: 'roads-layer',
  type: 'line',
  source: 'roads',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': [
      'match', ['get', 'highway'],
      ['motorway', 'trunk'], '#4488ff',
      ['primary', 'secondary'], '#2255cc',
      '#1a3d99'  // residential/other fallback
    ],
    'line-width': [
      'match', ['get', 'highway'],
      ['motorway', 'trunk'], 4,
      ['primary', 'secondary'], 2.5,
      1.5  // residential/other fallback
    ],
    'line-opacity': 0   // start invisible; CSS transition handles fade-in
  }
});

// Populate and fit bounds
(map.getSource('roads') as maplibregl.GeoJSONSource).setData(geojson);
const bounds = new maplibregl.LngLatBounds();
geojson.features.forEach(f => {
  (f.geometry as GeoJSON.LineString).coordinates.forEach(c => bounds.extend(c as [number, number]));
});
map.fitBounds(bounds, { padding: 40, duration: 600 });

// Fade in overlay
map.setPaintProperty('roads-layer', 'line-opacity', 0.85);
```

### Pattern 3: OSM XML Parse (DOMParser in Worker)

**What:** Parse decompressed XML text with DOMParser, filter `<way>` elements with a `highway` tag, reconstruct coordinates from `<node>` id refs.
**When to use:** City-scale OSM files (Amsterdam ~80 MB uncompressed). Streaming SAX not needed at this scale.

```typescript
// Source: OSM XML spec https://wiki.openstreetmap.org/wiki/OSM_XML
function parseOsmXml(xml: Uint8Array): { nodes: Map<string, [number, number]>; ways: Way[] } {
  const text = new TextDecoder().decode(xml);
  const doc = new DOMParser().parseFromString(text, 'application/xml');

  // Step 1: index all nodes — NOTE: convert lat/lon → [lon, lat] (GeoJSON order) at THIS boundary
  const nodes = new Map<string, [number, number]>();
  doc.querySelectorAll('node').forEach(n => {
    nodes.set(n.getAttribute('id')!, [
      parseFloat(n.getAttribute('lon')!),
      parseFloat(n.getAttribute('lat')!)
    ]);
  });

  // Step 2: extract routable ways
  const ROAD_TYPES = new Set(['motorway','trunk','primary','secondary','tertiary',
                               'unclassified','residential','service','living_street',
                               'pedestrian','footway','cycleway','path']);
  const ways: Way[] = [];
  doc.querySelectorAll('way').forEach(w => {
    const highway = w.querySelector('tag[k="highway"]')?.getAttribute('v');
    if (!highway || !ROAD_TYPES.has(highway)) return;
    const coords = Array.from(w.querySelectorAll('nd'))
      .map(nd => nodes.get(nd.getAttribute('ref')!))
      .filter(Boolean) as [number, number][];
    if (coords.length >= 2) ways.push({ id: w.getAttribute('id')!, highway, coords });
  });

  return { nodes, ways };
}
```

### Pattern 4: TomTom Style URL

**What:** Use TomTom Map Display API style endpoint as MapLibre style URL.
**When to use:** TomTom base tiles in MapLibre.

```typescript
// Source: https://developer.tomtom.com/map-display-api/documentation/mapstyles/map-styles
const TOMTOM_STYLE_URL =
  `https://api.tomtom.com/style/1/style/*?key=${apiKey}&map=basic_night`;

const map = new maplibregl.Map({
  container: 'map',
  style: TOMTOM_STYLE_URL,
  center: [4.9, 52.3],  // Amsterdam fallback
  zoom: 10
});
```

### Anti-Patterns to Avoid

- **Parsing OSM on the main thread:** Even for Leiden (~20 MB uncompressed) this blocks for hundreds of ms. Always use a Worker.
- **Posting GeoJSON objects via structured clone for very large graphs:** For very large networks, serialize to JSON string → `TextEncoder` → `ArrayBuffer` and transfer. For city-scale (~50k features) plain `postMessage(geojson)` is acceptable (~50–150 ms).
- **Adding the road layer before `map.on('load', ...)`:** MapLibre throws if sources/layers are added before the style is fully loaded.
- **Using lat/lon order in GeoJSON:** OSM XML uses `lat=, lon=`. GeoJSON requires `[lon, lat]`. Convert at the parse boundary — never in the rendering code.
- **Re-creating the Worker on every file load:** Reuse a single Worker instance; just postMessage to it again.
- **Calling `map.fitBounds` before `setData` resolves:** Always call fitBounds after the source data is set.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gzip decompression | Custom inflate loop | fflate `gunzipSync` | Handles all GZIP variants, CRC checks, multi-member streams |
| Map tile rendering | Custom WebGL tile loader | MapLibre GL JS | Tile fetching, caching, projection, retina — enormous scope |
| Coordinate projection | Haversine/Mercator utils from scratch | MapLibre `LngLatBounds` + GeoJSON | MapLibre handles all projection internally; use it |
| File reading/buffering | Custom streaming file reader | `File.arrayBuffer()` + Worker transfer | Native API, zero-copy transfer possible, handles all file types |
| Progress reporting in Worker | Custom event bus | `postMessage` structured messages | Web platform primitive; no lib needed |

**Key insight:** The three hard problems (gzip, map rendering, file I/O) are fully solved by platform APIs and fflate. The only custom logic is OSM XML → GeoJSON conversion, which is straightforward with DOMParser.

---

## Common Pitfalls

### Pitfall 1: DOMParser Not Available in Older Worker Contexts

**What goes wrong:** `DOMParser` throws "DOMParser is not defined" in some Worker configurations.
**Why it happens:** `DOMParser` is available in dedicated Workers in all modern browsers (Chrome 55+, Firefox, Safari 14+), but not in older specs. Some test environments also lack it.
**How to avoid:** Verify target browsers support Worker `DOMParser`. As fallback: use a lightweight regex-based parser or `fast-xml-parser` which is pure JS with no DOM dependency.
**Warning signs:** Error thrown in Worker before any parse output; works in dev but fails in test environment.

### Pitfall 2: MapLibre Style Load Race Condition

**What goes wrong:** Calling `map.addSource()` or `map.addLayer()` outside `map.on('load', ...)` causes "style not loaded" errors.
**Why it happens:** Map style (TomTom tile URL) loads asynchronously; the `Map` constructor returns immediately.
**How to avoid:** All source/layer additions go inside the `'load'` callback or use `map.loaded()` guard.
**Warning signs:** Intermittent errors in development; always fails in CI where network is slower.

### Pitfall 3: GeoJSON Coordinate Order Confusion

**What goes wrong:** Roads render in wrong location or not at all; map jumps to ocean coordinates.
**Why it happens:** OSM XML: `lat="52.3" lon="4.9"`. GeoJSON spec: `[longitude, latitude]` = `[4.9, 52.3]`. DOMParser returns OSM order; many developers pass it directly.
**How to avoid:** In `parseOsmXml`, store nodes as `[parseFloat(lon), parseFloat(lat)]` — longitude first. Add a unit test asserting `nodes.get('some-id')[0] < 90` (longitude) for Dutch data.
**Warning signs:** Map pans to 0,0 or south Pacific; `fitBounds` zooms to wrong region.

### Pitfall 4: File ArrayBuffer Ownership After Transfer

**What goes wrong:** Main thread tries to read file data after transferring the `ArrayBuffer` to Worker; gets zero-length or detached buffer error.
**Why it happens:** Transferable object ownership moves to Worker on `postMessage(..., [buffer])`. The original reference is neutered.
**How to avoid:** Read file → get ArrayBuffer → immediately transfer to Worker; never touch the buffer again in main thread after transfer. If you need to show file size, read it before transfer.
**Warning signs:** `ArrayBuffer` reports `byteLength === 0` in main thread after postMessage.

### Pitfall 5: TomTom API Key Leakage in Source Control

**What goes wrong:** API key committed to repo or exposed in built JS bundle.
**Why it happens:** Developers hardcode keys in source files for convenience.
**How to avoid:** ALWAYS load key from `localStorage` at runtime. Never put the key in source code or `.env` files committed to git. The modal pattern is the correct approach.
**Warning signs:** Key visible in `git log`; key visible in `vite.config.ts` or `.env`.

### Pitfall 6: OSM Relations Mistakenly Skipped

**What goes wrong:** Some roads (especially complex junctions, roundabouts tagged as `type=route`) are missing from the overlay.
**Why it happens:** Phase 1 parses only `<way>` elements. Relations are ignored. This is correct for Phase 1 (graph is ways-only), but should be documented.
**How to avoid:** Accept this as Phase 1 scope. Comment in code: "Relations not parsed — Phase 1 ways-only."
**Warning signs:** Motorway interchanges missing sections; not a bug, just known scope.

---

## Code Examples

### File Input + Drag-and-Drop to Worker

```typescript
// Source: MDN File API https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications
async function handleFile(file: File) {
  const buffer = await file.arrayBuffer();
  worker.postMessage({ buffer }, [buffer]);  // transfer ownership
}

// Input element
inputEl.addEventListener('change', e => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
});

// Drag and drop
dropZoneEl.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
});
```

### LocalStorage API Key Guard

```typescript
const STORAGE_KEY = 'tomtom_api_key';

function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function saveApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

### MapLibre map.on('load') Setup Pattern

```typescript
// Source: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
const map = new maplibregl.Map({
  container: mapContainerRef.current!,
  style: `https://api.tomtom.com/style/1/style/*?key=${apiKey}&map=basic_night`,
  center: [4.9, 52.3],
  zoom: 10
});

map.on('load', () => {
  map.addSource('roads', { type: 'geojson', data: emptyFeatureCollection });
  map.addLayer({
    id: 'roads-layer',
    type: 'line',
    source: 'roads',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['match', ['get', 'highway'],
        ['motorway', 'trunk'], '#4488ff',
        ['primary', 'secondary'], '#2255cc',
        '#1a3d99'
      ],
      'line-width': ['match', ['get', 'highway'],
        ['motorway', 'trunk'], 4,
        ['primary'], 2.5,
        ['secondary', 'tertiary'], 2,
        1.2
      ],
      'line-opacity': 0
    }
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pako for gzip | fflate | ~2021 | 3-5x faster, 80% smaller bundle |
| Mapbox GL JS (proprietary) | MapLibre GL JS | 2021 fork | Open source, no token required for rendering |
| FileReader (callback API) | `File.arrayBuffer()` Promise | ~2019 | Cleaner async; transferable to Worker |
| Hardcoded map style objects | TomTom/provider style URL | Ongoing | Provider handles style versioning |
| Worker via `new Worker('worker.js')` | `new Worker(new URL('./w.ts', import.meta.url), {type:'module'})` | Vite 2.x+ | TypeScript-native, bundled properly by Vite |

**Deprecated/outdated:**
- `FileReader.readAsArrayBuffer` callback: Still works, but `.arrayBuffer()` Promise is cleaner
- pako: Functional but larger and slower than fflate — do not introduce
- Mapbox GL JS: Requires proprietary token and has license restrictions — use MapLibre

---

## Open Questions

1. **TomTom style URL wildcard version `*`**
   - What we know: The `*` wildcard selects "latest" TomTom style version per their API docs
   - What's unclear: Whether `*` is stable enough for production or if a pinned version (e.g., `20.3.4-6`) is safer
   - Recommendation: Use `*` for development; planner should decide whether to pin version or stay on latest

2. **DOMParser in Worker: test environment**
   - What we know: DOMParser is available in production browser Workers
   - What's unclear: Whether jsdom (Vitest's test environment) exposes DOMParser inside simulated Workers
   - Recommendation: Unit tests for `parseOsmXml` should run the parser function directly (not inside a Worker), passing the Uint8Array directly to the pure function

3. **Bundled map quick-start flow**
   - What we know: `public/maps/index.json` lists bundled maps; context notes this is a Phase 1 implementation decision
   - What's unclear: Whether to expose bundled maps as quick-pick buttons alongside the file picker
   - Recommendation: Include bundled map buttons (fetch by URL, same Worker path) — improves demo UX without adding scope; planner decides

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vite.config.ts` (test section) — Wave 0 creates this |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | File picker and drag-drop trigger handleFile | unit | `npx vitest run src/__tests__/dropZone.test.ts` | Wave 0 |
| PIPE-02 | `parseOsmXml` returns correct node count and way list from fixture | unit | `npx vitest run src/__tests__/osmParser.test.ts` | Wave 0 |
| PIPE-02 | `gunzipSync` + `parseOsmXml` completes without throwing on leiden.osm.gz | integration | `npx vitest run src/__tests__/osmPipeline.test.ts` | Wave 0 |
| PIPE-04 | GeoJSON FeatureCollection has LineString features with `highway` property | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | Wave 0 |
| MAP-03 | MapLibre map instance is interactive (pan/zoom not blocked) | manual | n/a — WebGL not testable in jsdom | manual-only |

Manual-only justification for MAP-03: MapLibre GL JS requires WebGL canvas; jsdom does not support WebGL. Verify manually that pan/zoom works with the overlay visible.

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/osmParser.test.ts` — covers PIPE-02 (parse correctness with small XML fixture)
- [ ] `src/__tests__/graphBuilder.test.ts` — covers PIPE-04 (GeoJSON output shape)
- [ ] `src/__tests__/osmPipeline.test.ts` — covers PIPE-02 integration (full gunzip+parse flow)
- [ ] `src/__tests__/dropZone.test.ts` — covers PIPE-01 (file handler unit test)
- [ ] `vitest` install: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom`
- [ ] `vite.config.ts` test section: `test: { environment: 'jsdom', globals: true }`

---

## Sources

### Primary (HIGH confidence)

- MapLibre GL JS official docs: https://maplibre.org/maplibre-gl-js/docs/ — GeoJSONSource, Map API, fitBounds
- MapLibre Style Spec: https://maplibre.org/maplibre-style-spec/layers/ — line paint properties, match expressions
- fflate GitHub: https://github.com/101arrowz/fflate — gunzipSync API, version 0.8.2
- OSM XML Wiki: https://wiki.openstreetmap.org/wiki/Key:highway — highway tag values
- MDN File API: https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications — File.arrayBuffer(), drag-drop
- MDN Transferable Objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects — zero-copy Worker transfer

### Secondary (MEDIUM confidence)

- TomTom Map Display API style docs: https://developer.tomtom.com/map-display-api/documentation/mapstyles/map-styles — style URL format `basic_night`; version wildcard behavior not fully confirmed
- Vite Workers docs: https://vite.dev/guide/assets — `new Worker(new URL(...), {type:'module'})` pattern
- Vitest docs: https://vitest.dev/guide/ — jsdom environment setup

### Tertiary (LOW confidence)

- fflate vs CompressionStream performance claim (faster for in-memory data): corroborated by fflate README but not independently benchmarked for this project's file sizes

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via GitHub releases and npm; fflate 0.8.2, MapLibre 5.20.0 verified
- Architecture: HIGH — patterns from official MapLibre docs, Web Workers platform docs
- TomTom style URL: MEDIUM — URL format confirmed from TomTom docs; wildcard `*` version behavior not deeply verified
- Pitfalls: HIGH for coordinate order, race condition, buffer transfer; MEDIUM for DOMParser Worker availability in test environments

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (MapLibre is active; verify version before planning if delayed)
