# Phase 1: Data Pipeline and Map Foundation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Load a .osm.gz file in-browser (via file picker or drag-and-drop), decompress and parse in a Web Worker, build the road graph, and render the road network as an overlay on a MapLibre base map. Users can pan and zoom. No routing or animation — this is the foundation everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Loading feedback
- Show a progress bar with a stage label during OSM load ('Decompressing…', 'Parsing nodes…', 'Building graph…')
- Loading indicator is an overlay on the map canvas — covers the map while loading, then disappears
- After parsing completes, fade in the road network overlay (not instant)
- Map auto-fits/zooms to the loaded road network bounds after parsing completes

### Road rendering style
- Visually differentiate road types: thick for motorway/trunk, medium for primary/secondary, thin for residential/path
- Color scheme: blue tones — #4488ff for primary roads, #2255cc for secondary, thinner/dimmer for residential
- Keep base map roads and labels visible under the overlay (geographic context preserved)

### Map tiles — TomTom API
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/maps/leiden.osm.gz` and `public/maps/amsterdam.osm.gz`: Pre-bundled OSM files. Phase 1 should support loading these as well as user-uploaded files (the `public/maps/index.json` listing suggests a "pick from bundled maps" flow is intended — but this is a Phase 1 implementation decision for the planner).
- `public/maps/index.json`: Lists available bundled maps — planner should decide whether to expose these as quick-start options in the upload UX.

### Established Patterns
- No source code yet — fresh project. All patterns will be established in this phase.

### Integration Points
- Web Worker: parse pipeline runs in a worker; the main thread manages the map and receives parsed graph data via postMessage
- MapLibre GL JS: road overlay added as a custom GeoJSON source + layer on top of the TomTom tile layer
- localStorage: TomTom API key stored under a well-named key (e.g., `tomtom_api_key`)

</code_context>

<specifics>
## Specific Ideas

- Dark base map aesthetic: TomTom Basic Night + blue road overlay is the visual foundation that animation colors (red path, frontier nodes) will build on
- TomTom API key gate: first-load prompt if no key stored, gear icon to manage/clear it — keep it lightweight, not a full settings page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-data-pipeline-and-map-foundation*
*Context gathered: 2026-03-12*
