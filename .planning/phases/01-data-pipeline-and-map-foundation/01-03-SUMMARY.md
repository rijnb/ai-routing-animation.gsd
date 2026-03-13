---
phase: 01-data-pipeline-and-map-foundation
plan: 03
subsystem: ui-components
tags: [maplibre, tomtom, react, drag-and-drop, loading-overlay, geojson, road-overlay]

# Dependency graph
requires:
  - 01-01 (Vite scaffold + Wave 0 RED test stubs)
  - 01-02 (OSM parsing pipeline + useOsmLoader hook)
provides:
  - MapView: MapLibre map with TomTom Basic Night style + road overlay
  - ApiKeyModal: first-run modal for TomTom API key
  - SettingsPanel: gear icon settings panel with masked key + clear button
  - DropZone: file picker + drag-and-drop + bundled map quick-starts
  - LoadingOverlay: full-screen progress overlay with stage label
  - apiKeyStore: getApiKey/saveApiKey/clearApiKey (localStorage)
  - mapHelpers: addRoadLayer, updateRoadData, fitRoadBounds
  - App: top-level wiring of all Phase 1 components
affects: [01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apiKey stored in localStorage under 'tomtom_api_key' — never in source code"
    - "MapView creates map once per apiKey change via useEffect([apiKey]) dep array"
    - "Road layer opacity animates 0→0.85 via setPaintProperty — locked fade-in decision"
    - "fitRoadBounds always called after setData to avoid anti-pattern"
    - "DropZone bundled maps: fetch → arrayBuffer → new File wrapper → onFile callback"
    - "LoadingOverlay uses pointer-events:none when invisible to allow map interaction"

key-files:
  created:
    - src/lib/mapHelpers.ts
    - src/lib/apiKeyStore.ts
    - src/components/MapView.tsx
    - src/components/ApiKeyModal.tsx
    - src/components/SettingsPanel.tsx
    - src/components/DropZone.tsx
    - src/components/LoadingOverlay.tsx
  modified:
    - src/App.tsx
    - src/index.css
    - src/main.tsx

key-decisions:
  - "apiKeyStore extracted as separate module (not inlined) — keeps modal and settings panel testable"
  - "MapView re-mounts map on apiKey change — simplest correct behavior when key is cleared and re-entered"
  - "DropZone absolutely positioned bottom-center over map — visible before and after load, hidden during load"
  - "LoadingOverlay opacity transition (not display:none) — smooth UX, pointer-events:none prevents map blocking"
  - "Chunk size warning from MapLibre is acceptable — not a bug, noted in summary"
  - "rawGzipStaticPlugin in vite.config.ts: serve public/*.gz with Content-Type: application/gzip (no Content-Encoding) so browser does not transparently decompress before worker gunzipSync"

requirements-completed: [PIPE-01, PIPE-02, PIPE-04, MAP-03]

# Metrics
duration: 50min
completed: 2026-03-13
---

# Phase 1 Plan 03: UI Components and App Wiring Summary

**Full Phase 1 UI: TomTom Basic Night map with API key gate, OSM file upload with drag-and-drop and bundled quick-starts, staged loading overlay, and blue-toned road network overlay with type-differentiated widths**

## Performance

- **Duration:** ~50 min (including bug investigation and fix)
- **Started:** 2026-03-12T21:11:46Z
- **Completed:** 2026-03-13T09:10:00Z
- **Tasks:** 3 of 3 (all complete, including human verification)
- **Files created/modified:** 11

## Accomplishments

- Implemented `src/lib/apiKeyStore.ts`: localStorage CRUD for TomTom API key under key `'tomtom_api_key'`
- Implemented `src/lib/mapHelpers.ts`: `addRoadLayer` (blue-toned data-driven road styling with match expressions), `updateRoadData` (setData + fade-in to opacity 0.85), `fitRoadBounds` (LngLatBounds computation + fitBounds with padding 40, duration 600)
- Implemented `src/components/MapView.tsx`: MapLibre map with TomTom Basic Night style URL, road layer added on load, reactive geojson updates
- Implemented `src/components/ApiKeyModal.tsx`: centered overlay modal, no skip option, saves key to localStorage
- Implemented `src/components/SettingsPanel.tsx`: gear icon fixed top-right, toggles panel with masked key (first 4 chars + ****) and "Clear key" button
- Implemented `src/components/DropZone.tsx`: drag-and-drop + file picker (accepts .osm.gz) + Leiden/Amsterdam quick-start buttons fetching from `/maps/`
- Implemented `src/components/LoadingOverlay.tsx`: full-screen semi-transparent overlay, progress bar, stage label, opacity transition, pointer-events:none when hidden
- Updated `src/App.tsx`: wired all components — API key gate, MapView + geojson prop, LoadingOverlay, conditional DropZone, SettingsPanel, auto-dismiss error toast (5s)
- Updated `src/index.css`: full-viewport dark base styles (#0a0a0a), overflow hidden, loading-overlay transition class
- Updated `src/main.tsx`: added `maplibre-gl/dist/maplibre-gl.css` import

## Task Commits

1. **Task 1: Map infrastructure** - `b1f0173` (feat)
2. **Task 2: Upload UX + App wiring** - `a0f13ce` (feat)
3. **Bug fix: gzip transparent decompression** - `8b6aa68` (fix)
4. **Task 3: Human verification approved** - see plan metadata commit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing referenced file] apiKeyStore module created**
- **Found during:** Task 1 implementation
- **Issue:** `ApiKeyModal` and `SettingsPanel` reference `../lib/apiKeyStore` but the plan did not list it as a file to create — it was described inline as a "localStorage contract"
- **Fix:** Created `src/lib/apiKeyStore.ts` with the three functions from the plan's interface block
- **Files created:** `src/lib/apiKeyStore.ts`
- **Commit:** `b1f0173`

**2. [Rule 1 - Bug] Fixed "invalid gzip data" when loading bundled maps**
- **Found during:** Task 3 human verification
- **Issue:** Vite's static file handler serves `public/maps/*.gz` files with `Content-Encoding: gzip`. The browser silently decompresses the response before `fetch().arrayBuffer()` resolves, so the OSM worker's `gunzipSync(new Uint8Array(buffer))` received raw XML bytes instead of gzip-compressed data, throwing "invalid gzip data".
- **Fix:** Added `rawGzipStaticPlugin` to `vite.config.ts` — a `configureServer` middleware that intercepts `.gz` URL requests, reads the file with `fs.readFileSync`, and responds with `Content-Type: application/gzip` with no `Content-Encoding` header, bypassing Vite's static handler entirely for `.gz` files.
- **Files modified:** `vite.config.ts`
- **Verification:** Dev server response confirmed via curl — `Content-Type: application/gzip`, no `Content-Encoding`. `npm run build` passes. All 12 tests GREEN.
- **Committed in:** `8b6aa68`

---

**Total deviations:** 2 auto-fixed (1 Rule 3 - blocking, 1 Rule 1 - bug)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Self-Check: PASSED

- src/lib/mapHelpers.ts: FOUND
- src/lib/apiKeyStore.ts: FOUND
- src/components/MapView.tsx: FOUND
- src/components/ApiKeyModal.tsx: FOUND
- src/components/SettingsPanel.tsx: FOUND
- src/components/DropZone.tsx: FOUND
- src/components/LoadingOverlay.tsx: FOUND
- src/App.tsx: FOUND (modified)
- src/index.css: FOUND (modified)
- src/main.tsx: FOUND (modified)
- vite.config.ts: FOUND (modified — rawGzipStaticPlugin)
- Task 1 commit b1f0173: FOUND
- Task 2 commit a0f13ce: FOUND
- Bug fix commit 8b6aa68: FOUND
- All 12 tests: GREEN
- npm run build: exits 0

---
*Phase: 01-data-pipeline-and-map-foundation*
*Completed: 2026-03-12*
