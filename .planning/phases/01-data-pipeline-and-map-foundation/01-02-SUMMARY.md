---
phase: 01-data-pipeline-and-map-foundation
plan: 02
subsystem: data-pipeline
tags: [osm, parsing, web-worker, react-hook, geojson, fflate]

# Dependency graph
requires:
  - 01-01 (Vite scaffold + Wave 0 RED test stubs)
provides:
  - parseOsmXml: string → OsmGraph (nodes Map + ways array)
  - buildRoadGeoJson: (ways, nodes) → GeoJSON FeatureCollection<LineString>
  - handleFile: (File, Worker) → Promise<void>
  - osmWorker: Web Worker — gunzip + parse + build with staged progress
  - useOsmLoader: React hook — worker lifecycle + reactive state
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "parseOsmXml accepts string (not Uint8Array) — decompression is Worker's responsibility"
    - "buildRoadGeoJson takes (ways, nodes) as separate args — not a single OsmGraph object"
    - "handleFile posts raw ArrayBuffer (not {buffer: ArrayBuffer}) — test-driven API"
    - "osmWorker receives ArrayBuffer directly via event.data"
    - "useOsmLoader creates Worker once in useEffect; uses useRef to hold instance"

key-files:
  created:
    - src/lib/osmParser.ts
    - src/lib/graphBuilder.ts
    - src/lib/osmLoader.ts
    - src/workers/osmWorker.ts
    - src/hooks/useOsmLoader.ts
  modified: []

key-decisions:
  - "parseOsmXml signature: accepts string (not Uint8Array) — tests pass xmlString from TextDecoder output"
  - "buildRoadGeoJson signature: (ways, nodes) two-arg form — tests call buildRoadGeoJson(mockWays, mockNodes)"
  - "handleFile posts raw ArrayBuffer not wrapped object — dropZone.test checks payload instanceof ArrayBuffer"
  - "osmWorker receives raw ArrayBuffer from event.data (not event.data.buffer)"

requirements-completed: [PIPE-01, PIPE-02, PIPE-04]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 1 Plan 02: OSM Parsing Pipeline Summary

**parseOsmXml + buildRoadGeoJson pure functions, osmWorker Web Worker with staged progress, and useOsmLoader React hook — all 12 Wave 0 tests GREEN**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T21:08:22Z
- **Completed:** 2026-03-12T21:09:44Z
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments

- Implemented `parseOsmXml`: decodes OSM XML string, indexes nodes as `[lon, lat]` (GeoJSON order), filters only ROAD_TYPES highways, excludes ways with fewer than 2 resolved node refs
- Implemented `buildRoadGeoJson`: maps ways array + nodes Map into GeoJSON `FeatureCollection<LineString>` with `properties.highway`
- Implemented `handleFile`: async, reads `File.arrayBuffer()`, transfers to Worker via `postMessage(buffer, [buffer])`
- Implemented `osmWorker`: receives ArrayBuffer, gunzips with fflate, parses XML, builds GeoJSON, posts 4 messages (3 progress + 1 done), wraps in try/catch for error posting
- Implemented `useOsmLoader`: creates Worker once in `useEffect`, uses `useRef` for Worker instance, exposes `{ stage, percent, geojson, error, loadFile }`

## Task Commits

1. **Task 1: osmParser, graphBuilder, osmLoader** - `debb9a8` (feat)
2. **Task 2: osmWorker, useOsmLoader** - `506fedd` (feat)

## Files Created

- `src/lib/osmParser.ts` - parseOsmXml + OsmWay/OsmGraph interfaces
- `src/lib/graphBuilder.ts` - buildRoadGeoJson
- `src/lib/osmLoader.ts` - handleFile
- `src/workers/osmWorker.ts` - Web Worker with fflate gunzipSync
- `src/hooks/useOsmLoader.ts` - React hook with Worker lifecycle management

## Decisions Made

- **parseOsmXml takes a string**: The tests pass `xmlString` (output of `TextDecoder.decode()`), not raw `Uint8Array`. The function also accepts `Uint8Array` as a convenience overload (decoded internally), but the primary path is string — matching the plan interface comment "decompression is in the Worker".
- **buildRoadGeoJson takes (ways, nodes) as two args**: The test calls `buildRoadGeoJson(mockWays, mockNodes)` — the plan interface showed `OsmGraph` as single arg, but actual test API is two args. Tests are the source of truth.
- **handleFile posts raw ArrayBuffer**: `dropZone.test.ts` checks `expect(payload).toBeInstanceOf(ArrayBuffer)` — payload is the raw buffer, not `{buffer: ...}`. Transferable list still passed as second arg.
- **osmWorker receives event.data directly as ArrayBuffer**: Since `handleFile` posts `buffer` (not `{buffer}`), the worker reads `event.data` directly as the ArrayBuffer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Contract mismatch] API signatures adapted to actual test contracts**
- **Found during:** Task 1 implementation
- **Issue:** Plan interfaces showed `parseOsmXml(xml: Uint8Array)`, `buildRoadGeoJson(graph: OsmGraph)`, and worker receiving `{buffer: ArrayBuffer}`. Actual test stubs use different signatures.
- **Fix:** Implemented to match test contracts — parseOsmXml accepts string|Uint8Array; buildRoadGeoJson takes (ways, nodes) as separate args; handleFile posts raw ArrayBuffer; osmWorker reads event.data as ArrayBuffer.
- **Files modified:** All 5 implementation files
- **Impact:** Tests define the truth. Plan interfaces were illustrative; actual contracts are in the test files.

## Self-Check: PASSED

- src/lib/osmParser.ts: FOUND
- src/lib/graphBuilder.ts: FOUND
- src/lib/osmLoader.ts: FOUND
- src/workers/osmWorker.ts: FOUND
- src/hooks/useOsmLoader.ts: FOUND
- 01-02-SUMMARY.md: FOUND
- Commits debb9a8, 506fedd: verified in git log

---
*Phase: 01-data-pipeline-and-map-foundation*
*Completed: 2026-03-12*
