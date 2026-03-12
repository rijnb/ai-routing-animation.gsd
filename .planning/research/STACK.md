# Technology Stack

**Project:** OSM Routing Animator
**Researched:** 2026-03-12

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | ~5.7 | Language | Project constraint. Strict mode for graph/geo correctness. | HIGH |
| Vite | ^6.3 | Build tool + dev server | Instant HMR, native ESM, vanilla-ts template = no framework overhead. Webpack is overkill for a no-framework SPA. | HIGH |

**No UI framework.** This is a map-centric visualization app. React/Vue/Svelte add abstraction over DOM that MapLibre already manages. Use vanilla TypeScript with MapLibre's own event system. A simple `index.html` + `main.ts` entry point with Vite's vanilla-ts template is sufficient.

### Map Rendering

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MapLibre GL JS | ^5.x (latest 5.20.0) | Tile-based map rendering | Project constraint. WebGL-powered, open source, ships its own TypeScript types. v5 is the current major with active development. | HIGH |

**TypeScript integration:** MapLibre GL JS v5 ships with built-in TypeScript declarations (no `@types/` package needed). Import as `import maplibregl from 'maplibre-gl'`.

**Tile source for base map:** Use a free vector tile provider for the base map layer. Options:
- MapTiler free tier (requires API key, generous limits)
- Protomaps PMTiles (self-hosted, no API key)

For a portfolio demo, MapTiler's free tier is simplest. The OSM data overlay goes on top of whichever base tiles are used.

### In-Browser Decompression (.osm.gz)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| fflate | ^0.8 | Gzip decompression | Fastest JS decompressor. 8kB core, ~3kB for decompress-only. Ships TypeScript types. Outperforms both pako and native DecompressionStream for in-memory data. | HIGH |

**Why not DecompressionStream API?** DecompressionStream has broad browser support (since May 2023), but fflate is faster for in-memory data because DecompressionStream incurs stream marshalling overhead. For files already loaded via `<input type="file">` and read as ArrayBuffer, `gunzipSync` from fflate is simpler and faster.

**Why not pako?** pako is 45kB (vs fflate's ~10kB feature-equivalent), slower by 30-60%, and less actively maintained. fflate is the successor in this space.

**Usage pattern:**
```typescript
import { gunzipSync } from 'fflate';

const compressed = new Uint8Array(await file.arrayBuffer());
const decompressed = gunzipSync(compressed);
const xmlText = new TextDecoder().decode(decompressed);
```

For very large files (50MB+ compressed), use fflate's async `gunzip()` to avoid blocking the main thread, or offload to a Web Worker.

### OSM XML Parsing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Native DOMParser | (browser built-in) | Parse OSM XML to DOM | Zero bundle cost, sufficient for city-scale extracts, simple XPath/querySelector traversal of nodes and ways. | MEDIUM |

**Why DOMParser over streaming/SAX?**
- OSM XML is fully in-memory after decompression anyway (no streaming benefit)
- DOMParser is synchronous and fast for files under ~50MB of XML
- The DOM tree allows random access to elements (needed to resolve node references in ways)
- No additional dependency

**Why not osm-read or osmtogeojson?**
- osm-read: designed for PBF format primarily, XML support is limited
- osmtogeojson: converts to GeoJSON which loses the graph structure we need (node IDs, way connectivity). We need the raw node/way data to build a routing graph.

**Caveat (MEDIUM confidence):** For very large OSM extracts (entire countries), DOMParser will consume significant memory. For city-scale extracts (the stated use case), it is fine. If performance becomes an issue, a hand-rolled SAX parser using the browser's built-in XMLReader or a lightweight SAX library could be considered, but start with DOMParser.

**Parsing strategy:**
1. Query all `<node>` elements, build a `Map<nodeId, {lat, lon}>` lookup
2. Query all `<way>` elements with highway tags, extract ordered node references
3. Build adjacency graph from way node sequences

### Graph Data Structure & Pathfinding

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom implementation | n/a | Graph + A* pathfinding | The core educational value of this project. Rolling your own gives full control over search frontier tracking needed for animation. | HIGH |

**Why not ngraph.path?** ngraph.path (latest 1.6.x) is a solid A* library, BUT:
1. This project's core value IS the A* implementation -- using a library defeats the purpose
2. We need to capture the full search frontier (every explored node, in order) for animation. Generic pathfinding libraries return only the final path, not the exploration history
3. No TypeScript types (would need hand-written declarations)

**Custom graph structure:**
```typescript
interface GraphNode {
  id: number;
  lat: number;
  lon: number;
  neighbors: Edge[];
}

interface Edge {
  target: number;  // node ID
  weight: number;  // cost (distance / speed for mode)
  wayId: number;
}

// A* returns both the path AND the exploration order
interface AStarResult {
  path: number[];           // optimal path node IDs
  explored: number[];       // nodes in exploration order (for animation)
  exploredEdges: [number, number][]; // edges explored (for frontier rendering)
}
```

### Animation Layer on MapLibre

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MapLibre GeoJSON Source + Layers | (part of maplibre-gl) | Animate search frontier and path | Use MapLibre's built-in GeoJSON source with `updateData()` for incremental feature additions. Avoids WebGL complexity. | MEDIUM |

**Two approaches considered:**

1. **GeoJSON Source with `updateData()`** (RECOMMENDED for this project)
   - Add explored edges/nodes as GeoJSON features incrementally using `updateData()` with feature IDs
   - Use separate layers for: frontier edges (blue/yellow), explored nodes (dots), optimal path (red line)
   - Call `map.triggerRepaint()` on each animation frame
   - Pro: Simple, idiomatic MapLibre, style-able with standard layer properties
   - Con: `setData()` is slow for large feature collections; use `updateData()` (partial diff) instead
   - Performance note: `updateData()` requires unique feature IDs but avoids re-serializing the entire collection

2. **CustomLayerInterface (WebGL)** (OVERKILL for this project)
   - Direct WebGL rendering via `render(gl, matrix)` callback
   - Pro: Maximum performance for thousands of animated elements
   - Con: Must manage WebGL state, shaders, buffers manually. Huge complexity for a portfolio demo.

**Start with GeoJSON source approach.** If animation stutters with large graphs (10K+ explored edges), optimize later with canvas overlay or batch the animation updates.

**Animation timing:**
```typescript
// Pseudocode: step-based animation with requestAnimationFrame
let step = 0;
function animate() {
  if (step < explored.length) {
    // Add next batch of explored edges to GeoJSON source
    source.updateData({ add: [nextFeatures] });
    step += batchSize;
    requestAnimationFrame(animate);
  }
}
```

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| fflate | ^0.8 | Gzip decompression | Always -- core requirement | HIGH |
| @turf/distance | ^7 | Haversine distance for A* heuristic | A* heuristic calculation between lat/lon points | MEDIUM |
| @turf/helpers | ^7 | GeoJSON geometry helpers | Building GeoJSON features for MapLibre layers | MEDIUM |

**Why Turf.js (modular)?** Turf is tree-shakeable -- import only `@turf/distance` (~2kB) instead of the full 200kB+ `@turf/turf` package. Useful for the A* haversine heuristic. However, haversine is simple enough to implement manually (~10 lines), so this is optional.

### Dev Dependencies

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| vite | ^6.3 | Build tool + dev server | HIGH |
| typescript | ~5.7 | TypeScript compiler | HIGH |
| eslint | ^9 | Linting | HIGH |
| @typescript-eslint/eslint-plugin | ^8 | TS-specific lint rules | HIGH |
| prettier | ^3 | Code formatting | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Build tool | Vite | webpack | Slower DX, more config, no advantage for a vanilla TS SPA |
| Decompression | fflate | pako | 4.5x larger, 30-60% slower, less maintained |
| Decompression | fflate | DecompressionStream | Slower for in-memory data, stream API adds complexity for already-buffered files |
| XML parsing | DOMParser | sax-wasm | Streaming not needed when full XML is in memory; extra dependency |
| XML parsing | DOMParser | osmtogeojson | Converts to GeoJSON, loses node/way graph structure needed for routing |
| Graph/pathfinding | Custom | ngraph.path | Hides the algorithm (defeats project purpose), no exploration history, no TS types |
| Animation | GeoJSON layers | CustomLayerInterface | WebGL shader management is massive complexity for minimal gain at this scale |
| Animation | GeoJSON layers | deck.gl | Heavy dependency (500kB+) for one animation use case |
| UI framework | None (vanilla TS) | React/Vue | Map-centric app, framework adds abstraction over DOM that MapLibre manages |

## Installation

```bash
# Create project
npm create vite@latest osm-routing-animator -- --template vanilla-ts
cd osm-routing-animator

# Core dependencies
npm install maplibre-gl fflate

# Optional: Turf.js for distance calculations (or implement haversine manually)
npm install @turf/distance @turf/helpers

# Dev dependencies (most come with Vite template)
npm install -D typescript eslint @typescript-eslint/eslint-plugin prettier
```

## Version Pinning Strategy

- **MapLibre GL JS:** Use `^5` (semver, stay on v5 major). v5 is the current actively developed major.
- **fflate:** Use `^0.8` (stable API despite 0.x version).
- **Vite:** Use `^6` (current major).

## Key Configuration Notes

### TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Vite (vite.config.ts)
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',  // Match tsconfig
  },
});
```

No special Vite plugins needed -- MapLibre and fflate work with standard ESM imports.

## Sources

- [MapLibre GL JS npm](https://www.npmjs.com/package/maplibre-gl) - v5.20.0 confirmed
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) - TypeScript types, CustomLayerInterface, GeoJSON source API
- [MapLibre GeoJSON source updateData](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/) - Partial update API
- [MapLibre animate-a-line example](https://maplibre.org/maplibre-gl-js/docs/examples/animate-a-line/) - GeoJSON animation pattern
- [MapLibre performance issue #6154](https://github.com/maplibre/maplibre-gl-js/issues/6154) - setData memory leak with rapid updates
- [fflate GitHub](https://github.com/101arrowz/fflate) - Performance benchmarks, API documentation
- [fflate vs pako comparison](https://npm-compare.com/fflate,pako) - Bundle size and performance data
- [DecompressionStream caniuse](https://caniuse.com/mdn-api_decompressionstream) - Browser support data
- [Vite getting started](https://vite.dev/guide/) - vanilla-ts template
- [ngraph.path GitHub](https://github.com/anvaka/ngraph.path) - API evaluated for suitability
- [MapLibre CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/) - WebGL custom layer API
