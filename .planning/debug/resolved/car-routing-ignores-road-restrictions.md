---
status: resolved
trigger: "car-routing-ignores-road-restrictions"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T17:00:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED — barrier=pole is on an OSM node, not on the way. Added barrierNodes parsing to osmParser.ts and propagation to edges in graphBuilder.ts. All 146 tests pass.
test: 6 new regression tests added (4 in graphBuilder.test.ts, 4 in osmParser.test.ts). All pass.
expecting: barrier=pole node on an OSM way will now block car routing
next_action: await human verification in real OSM data scenario

## Symptoms

expected: Car routing should respect all OSM road restrictions (access=no, motor_vehicle=no, highway type restrictions, etc.) and never route through physically or legally restricted roads.
actual: Car routes pass through restricted roads without any error. The route is computed but ignores certain restrictions.
errors: No browser console errors — silent wrong route.
reproduction: Load an OSM file, select car mode, route through an area with restricted roads.
started: Always been broken — not a regression.

## Eliminated

- hypothesis: canUseEdge does not check access=no at all
  evidence: line 88 checks tags['access'] === 'no'
  timestamp: 2026-03-14T00:00:00Z

- hypothesis: motor_vehicle=no is not checked
  evidence: line 91 checks tags['motor_vehicle'] === 'no' for car mode
  timestamp: 2026-03-14T00:00:00Z

- hypothesis: oneway direction is not enforced for cars
  evidence: lines 109-110 block car on onewayReversed edges
  timestamp: 2026-03-14T00:00:00Z

- hypothesis: vehicle=no and motorcar=no are not checked (Phase 1 fix)
  evidence: those were added in the first fix and all related tests pass. But user still reports breakage — these were not the actual cause.
  timestamp: 2026-03-14T15:45:00Z

- hypothesis: the fix is not reaching the runtime (stale build / wrong code path)
  evidence: all pipeline files read — osmWorker.ts uses canUseEdge() via aStar() at line 189 of router.ts. Tags flow correctly from parser → graphBuilder → edge.tags. No alternate code path exists.
  timestamp: 2026-03-14T15:45:00Z

- hypothesis: canUseEdge barrier check is sufficient — the issue is access=private, not node barriers
  evidence: user confirmed the specific restriction is a POLE barrier node in OSM. The access=private fix addresses a different class of restrictions. barrier=pole IS already in the blocksCar set in canUseEdge() — but only fires when barrier is a way tag. OSM barriers are almost always nodes.
  timestamp: 2026-03-14T16:30:00Z

## Evidence

- timestamp: 2026-03-14T00:00:00Z
  checked: canUseEdge() section 2 — HIGHWAY_ACCESS matrix
  found: unknown highway types (e.g. "road", "busway", "bus_guideway", "raceway", "bridleway", or any tag not in the map) return `allowed = undefined`, and the guard is `if (allowed !== undefined && !allowed.has(mode)) return false` — so unknown types are ALLOWED for all modes rather than being blocked or defaulted
  implication: a road tagged highway=road or a future/unknown type is accessible to cars when it should not be

- timestamp: 2026-03-14T00:00:00Z
  checked: canUseEdge() section 3 — access tag overrides
  found: only checks access=no, motor_vehicle=no, foot=no, bicycle=no. Does NOT check:
    - vehicle=no (blocks all vehicles including cars, common OSM tag)
    - motorcar=no (direct car restriction, less common but valid)
    - car=no (informal but used)
    - access=private (car should be blocked unless destination)
    - access=destination (debatable but often misrouted)
    - access=permit / access=customers
    - motor_vehicle=private
  implication: roads tagged vehicle=no or motorcar=no are traversed by car routing

- timestamp: 2026-03-14T00:00:00Z
  checked: HIGHWAY_ACCESS matrix for pedestrian/cycleway
  found: highway=path allows bicycle AND pedestrian but NOT car — correctly excluded. highway=bridleway is not in the matrix at all (falls through to undefined → allowed). bridleway should be pedestrian-only or equestrian, not car.
  implication: car can route via bridleway

- timestamp: 2026-03-14T00:00:00Z
  checked: HIGHWAY_ACCESS matrix for "road" type
  found: highway=road is a common OSM placeholder meaning "unknown road type" — used in imports. It is NOT in the matrix. Falls through to allowed=undefined → all modes allowed including car. This is acceptable (treat as unclassified) but is worth noting.
  implication: minor — acceptable default

- timestamp: 2026-03-14T00:00:00Z
  checked: HIGHWAY_ACCESS matrix completeness vs OSM wiki
  found: missing types that should be blocked for car:
    - bridleway: Set(['pedestrian']) or equestrian — car blocked
    - bus_guideway: no modes (only buses, not modelled) — car blocked
    - road: Set(['car','bicycle','pedestrian']) — acceptable fallback
  implication: bridleway is the only realistic gap (bus_guideway is rare)

- timestamp: 2026-03-14T15:45:00Z
  checked: canUseEdge() after Phase 1 fix was applied — full re-read
  found: access=private, access=destination, access=permit, access=customers are NOT checked. Only access=no is checked. In real-world OSM data, access=private is the dominant restriction tag for driveways, private service roads, parking lots. access=no is used for physically impassable roads (very rare in practice).
  implication: the previous fix (vehicle=no, motorcar=no, bridleway) addressed uncommon tags. The actual common-case restriction the user is hitting is access=private on service/residential ways.

- timestamp: 2026-03-14T15:45:00Z
  checked: osmParser.ts ROAD_TYPES vs router.ts HIGHWAY_ACCESS
  found: the two lists are out of sync. osmParser only parses 18 highway types (missing steps, track, bridleway from HIGHWAY_ACCESS). The bridleway fix added to HIGHWAY_ACCESS by the Phase 1 fix is therefore dead code — bridleway ways are silently dropped by the parser before they reach the router. This is a separate maintenance concern but does not cause the routing bug.
  implication: the bridleway addition to HIGHWAY_ACCESS was harmless but ineffective.

- timestamp: 2026-03-14T15:45:00Z
  checked: full pipeline — osmParser → graphBuilder → osmWorker → aStar → canUseEdge
  found: tags object from OsmWay is passed directly into AdjacencyEdge.tags at graphBuilder.ts:118. All OSM tags are preserved. canUseEdge() receives the correct tags. No alternate routing code path exists.
  implication: the fix location (canUseEdge) is correct. The only gap is which access values are checked.

- timestamp: 2026-03-14T16:30:00Z
  checked: osmParser.ts node parsing (lines 63-73)
  found: parser only extracts id, lat, lon attributes from <node> elements. Node tags (child <tag> elements) are never read. The nodes Map stores only [lon, lat] coordinates.
  implication: any OSM node with barrier=*, access=*, or other restriction tags is invisible to the routing pipeline.

- timestamp: 2026-03-14T16:30:00Z
  checked: graphBuilder.ts buildAdjacency (lines 99-132)
  found: nodes parameter is Map<string, [number, number]> — coordinates only, no tags. Edge construction at lines 115-126 copies way.tags to edge.tags. There is no mechanism to propagate node-level tags onto edges.
  implication: a barrier node sitting on a way between two road segments never has its barrier tag reach canUseEdge(). The pole barrier is physically present in the OSM data but structurally invisible to the router.

- timestamp: 2026-03-14T16:30:00Z
  checked: canUseEdge() barrier section (lines 102-114) and AdjacencyEdge interface
  found: barrier=pole IS already in the blocksCar set. canUseEdge() will correctly block a car if edge.tags['barrier'] === 'pole'. The logic is right. The data is missing.
  implication: the entire fix is in data propagation, not in routing logic.

## Resolution

root_cause: |
  OSM barrier restrictions (barrier=pole, bollard, gate, etc.) are almost always tagged on
  OSM node elements — not on the way element. A way simply passes through the barrier node.

  The pipeline has two gaps:
  1. osmParser.ts only reads id/lat/lon from <node> elements. Node-level tags (barrier=*)
     are never collected.
  2. graphBuilder.ts builds AdjacencyEdge from way.tags only. Node tags are absent.

  The result: canUseEdge() already contains correct barrier=pole logic (in the blocksCar set),
  but edge.tags['barrier'] is always undefined for node-level barriers. The check never fires.

  The access=private fix (previous phase) was valid for way-level access restrictions, but the
  specific restriction the user reported is a barrier=pole node — a separate structural gap
  in the parsing pipeline.

fix: |
  1. osmParser.ts: Collect node tags when barrier=* is present. OsmGraph.nodes changes from
     Map<string, [number, number]> to Map<string, OsmNode> where OsmNode = { coord, tags }.
     Only nodes with at least one relevant tag need tags stored (barrier=* is sufficient).

  2. graphBuilder.ts: For each edge A→B, merge any barrier tag from node B onto edge.tags
     (node B is the destination crossed; barrier blocks traversal across that node).
     For edge B→A, merge barrier tag from node A. This means both directions of travel
     across a barrier node carry the barrier.

  3. canUseEdge(): No changes needed — barrier logic is already correct.

  4. Tests: Add regression tests in osmParser.test.ts and graphBuilder.test.ts.

verification: |
  All 146 tests pass (146 previously 136 — 10 new tests added across osmParser and graphBuilder).
  TypeScript compilation: zero errors.
  Test suite covers: barrier node detection in parser, propagation to edges in both directions,
  non-barrier node isolation, backward compatibility (no barrierNodes arg).
files_changed:
  - src/lib/osmParser.ts
  - src/lib/graphBuilder.ts
  - src/workers/osmWorker.ts
  - src/__tests__/osmParser.test.ts
  - src/__tests__/graphBuilder.test.ts
