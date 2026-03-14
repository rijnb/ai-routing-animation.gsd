# Phase 5: One-way Streets and Access Restrictions - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Update `buildAdjacency` and `canUseEdge` to enforce OSM one-way restrictions and additional access-blocking tags. Cars follow one-way streets (directed edges); bikes respect oneway unless `oneway:bicycle=no`; pedestrians are always bidirectional. Add construction and barrier checks to `canUseEdge`. No UI changes.

</domain>

<decisions>
## Implementation Decisions

### One-way direction encoding
- Add `onewayReversed?: boolean` to `AdjacencyEdge` interface
- `buildAdjacency` sets `onewayReversed: true` on the reverse edge when a way is tagged `oneway=yes` (or `oneway=-1`, which means directed from last node to first)
- `buildAdjacency` always adds both directions to the adjacency list — no mode logic at build time
- `canUseEdge` handles all mode + tag logic for directionality (single place for all access rules)

### Bicycle one-way handling
- Bikes respect `oneway=yes`/`oneway=-1` by default (same restriction as cars)
- Exception: if the edge is tagged `oneway:bicycle=no`, bikes are allowed in both directions (contraflow lane)
- `oneway=-1` is symmetric with `oneway=yes` — the reversed edge is `onewayReversed=true` and the same rules apply
- Pedestrians always bidirectional — ignore `onewayReversed` entirely

### Construction blocking
- Block all modes (car, bicycle, pedestrian) for `highway=construction` or `construction=yes`
- Check lives in `canUseEdge` — consistent with existing `access=no` pattern, no graph rebuild needed

### Barrier handling
- Mode-aware, edge-level only (check `barrier=*` on way tags in `AdjacencyEdge.tags`)
- `barrier=bollard` → blocks car only (bollards let bikes and peds through)
- `barrier=wall` / `barrier=fence` / `barrier=hedge` → blocks all modes
- `barrier=gate` / `barrier=lift_gate` → blocks car by default; access tag overrides still apply
- Node-level barrier nodes not implemented (OSM barrier nodes require separate node tag data — out of scope)

### Claude's Discretion
- Exact set of barrier values to treat as "blocks all" vs "blocks car only" (follow common OSM practice)
- Whether `cycle_barrier` or `kissing_gate` need separate handling (can include if straightforward)

</decisions>

<specifics>
## Specific Ideas

- The `onewayReversed` flag pattern keeps `buildAdjacency` mode-agnostic — it always builds the full graph; `canUseEdge` decides what's traversable. This matches the existing architecture where tags are passed through and decisions made at route time.
- Portfolio demo correctness: cars routing around one-way streets is visually impressive and demonstrates the feature clearly.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdjacencyEdge` (router.ts:7): Add `onewayReversed?: boolean` here — minimal interface change
- `canUseEdge` (router.ts:71): All new tag checks (construction, barrier, oneway direction) slot in here — existing `access=no`, `foot=no`, `bicycle=no`, `motor_vehicle=no` checks are the pattern to follow
- `buildAdjacency` (graphBuilder.ts:88): Add `oneway=yes`/`oneway=-1` detection per way before pushing edges

### Established Patterns
- `canUseEdge` is the single gate for access decisions — all tag-based blocking goes here
- `AdjacencyEdge.tags` already carries the full way tag map — no data pipeline changes needed
- `buildAdjacency` accepts `(ways, nodes)` — test contract is authoritative; avoid adding mode param

### Integration Points
- `aStar` (router.ts:97): Calls `canUseEdge(edge.tags, mode)` — will need signature update to `canUseEdge(edge, mode)` to pass `onewayReversed` flag, OR pass the full edge object
- Tests for `buildAdjacency` and `canUseEdge` will need new cases for one-way, construction, and barrier tags

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-improve-routing-to-respect-osm-one-way-streets-and-access-restrictions*
*Context gathered: 2026-03-14*
