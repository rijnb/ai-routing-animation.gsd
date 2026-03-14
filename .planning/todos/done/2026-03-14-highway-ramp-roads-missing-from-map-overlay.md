---
created: 2026-03-14T12:22:17.000Z
title: Highway ramp roads missing from map overlay
area: ui
files:
  - src/lib/mapHelpers.ts
  - src/lib/osmParser.ts
  - src/lib/graphBuilder.ts
---

## Problem

Some road types — specifically highway ramps and link roads (e.g. `highway=motorway_link`, `trunk_link`, `primary_link`, `secondary_link`, `tertiary_link`) — are not rendered on the road overlay layer on the map, even though they exist in the OSM data and are included in the routing graph.

This means the animated route can visually traverse roads that are invisible on the map, which looks like a bug to the user (route segments appear to float over blank map areas).

User report: "Some roads, like ramps from highways, are not shown on the map; this is a bug."

Likely cause: The highway tag filter in `buildRoadGeoJson` (osmParser.ts / graphBuilder.ts) or the MapLibre layer filter in `mapHelpers.ts` does not include `*_link` variants. The routing graph (`buildAdjacency`) may already handle them (since routes traverse them), but the GeoJSON overlay is filtered more narrowly.

## Solution

1. Check the highway tag allowlist in `buildRoadGeoJson` (or wherever GeoJSON features are filtered) and add `motorway_link`, `trunk_link`, `primary_link`, `secondary_link`, `tertiary_link`, `road` as accepted values.
2. Verify the MapLibre layer filter in `mapHelpers.ts` (the `roads-layer` filter expression) also includes these link types.
3. Optionally style link roads slightly thinner than their parent road type for visual clarity.
4. Cross-check that `buildAdjacency` and `buildRoadGeoJson` use the same highway tag allowlist so the routing graph and visual overlay are always in sync.
