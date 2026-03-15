---
status: resolved
trigger: "Pedestrian routing does not always use all roads available to pedestrians — it misses certain pedestrian road types and incorrectly routes via car roads that pedestrians should never use."
created: 2026-03-14T00:00:00Z
updated: 2026-03-15T11:00:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED — cycleway was defined as new Set(['bicycle']) in HIGHWAY_ACCESS, blocking pedestrians. Changed to new Set(['bicycle', 'pedestrian']). The ROAD_COST_FACTOR table already had pedestrian: 1.2 for cycleway showing this was always the design intent, but the access matrix contradicted it. Dutch OSM cycleways alongside main roads lack foot=yes tags so the positive-grant fallback never fired for pedestrians. Bicycle routing used these roads (bicycle was in the Set); pedestrian routing incorrectly fell back to the main car road.
test: 176 tests pass (vitest run). Bundle osmWorker-CHRJ6qjd.js confirmed to contain cycleway:new Set(["bicycle","pedestrian"]).
expecting: Pedestrian routing now uses cycleway roads alongside main roads (like Gooimeerlaan side roads) the same way bicycle routing does.
next_action: Human verification — run npm run preview (or npm run dev) and test pedestrian routing on Gooimeerlaan

## Symptoms

expected: Pedestrian routing should use all road types accessible to pedestrians (footways, paths, sidewalks, living streets, etc.) and should never route along car-only roads
actual: Certain pedestrian-accessible road types are ignored/missing from routing, and the router uses some car roads that pedestrians should not traverse
errors: None reported — routing produces a result, just the wrong one
reproduction: Always reproducible, consistent regardless of location
timeline: Unknown — may always have been present

## Eliminated

- hypothesis: Car-road access flags are wrong in HIGHWAY_ACCESS (pedestrians routed onto motorway etc.)
  evidence: HIGHWAY_ACCESS correctly limits motorway/trunk/motorway_link/trunk_link to 'car' only; canUseEdge line 85-86 enforces this
  timestamp: 2026-03-14

- hypothesis: osmParser.ts ROAD_TYPES set was missing steps/track/bridleway
  evidence: Fixed in previous session — those types now parse correctly
  timestamp: 2026-03-14

- hypothesis: Pedestrian is literally routed onto motorways/trunks via some code path
  evidence: HIGHWAY_ACCESS matrix + canUseEdge enforcement makes this impossible for named motorway/trunk types. The 'car roads' observation is explained by forced detours around blocked cycleways.
  timestamp: 2026-03-14

- hypothesis: canUseEdge lacked positive foot/bicycle tag override
  evidence: Fixed in previous session — foot=yes/designated now grants pedestrian access through the highway matrix. But user reports this didn't fix the real-world routing. Unit tests passed but the routing still chose car roads because ALL roads have equal cost (1.0x raw haversine).
  timestamp: 2026-03-14

- hypothesis: Previous session — dist was stale, build was broken by unused import
  evidence: That was real and fixed (clearFrontierLayers removed from useAnimation.ts import). But the underlying routing bug persisted — users are now running fresh code (npm run dev or rebuilt dist) and the pedestrian routing is still wrong.
  timestamp: 2026-03-15

## Evidence

- timestamp: 2026-03-14
  checked: osmParser.ts ROAD_TYPES set (lines 5-24)
  found: Set contains 19 types; missing: steps, track, bridleway
  implication: Ways with highway=steps/track/bridleway are silently discarded during OSM parsing — they never enter the graph

- timestamp: 2026-03-14
  checked: router.ts HIGHWAY_ACCESS (lines 45-67)
  found: steps → pedestrian only; track → bicycle+pedestrian; bridleway → pedestrian only
  implication: Router correctly defines access for all three types but they're never reachable because the parser filters them out

- timestamp: 2026-03-14
  checked: router.test.ts bridleway test suite (lines 56-68)
  found: Tests for bridleway exist in canUseEdge suite and pass — but these test the router in isolation; OSM data never reaches the router for these types
  implication: Tests gave false confidence; the bug is at the parser/filter layer, not in routing logic

- timestamp: 2026-03-14
  checked: canUseEdge negative-only tag overrides (router.ts lines 88-99)
  found: foot=no → blocks pedestrian; bicycle=no → blocks bicycle; motor_vehicle=no → blocks car. NO positive grants (foot=yes, bicycle=yes) anywhere in function.
  implication: cycleway (bicycle-only in matrix) cannot be accessed by pedestrian even when OSM tags foot=yes or foot=designated. This forces pedestrian A* to detour around cycling infrastructure via car roads.

- timestamp: 2026-03-14
  checked: aStar function (router.ts) and buildAdjacency (graphBuilder.ts)
  found: ALL edges use raw haversine distance as cost. There is NO mode-specific cost weighting. A* picks the geometrically shortest path regardless of road type.
  implication: Even after fixing ROAD_TYPES and the foot=yes grant, pedestrian routing still prefers shorter car roads over longer footways.

- timestamp: 2026-03-14T17:00:00Z
  checked: dist/assets/ directory timestamps and contents
  found: dist/ files dated March 13 14:12, before ALL source fixes. npm run build failed with TS6133: clearFrontierLayers declared but never read in src/hooks/useAnimation.ts.
  implication: User running `npm run preview` was serving the stale March 13 dist.

- timestamp: 2026-03-15T10:00:00Z
  checked: HIGHWAY_ACCESS (router.ts line 62) and ROAD_COST_FACTOR (router.ts line 163) and mapHelpers.ts addRoadLayer paint expression
  found: cycleway is defined as new Set(['bicycle']) — pedestrians excluded. But ROAD_COST_FACTOR has pedestrian: 1.2 for cycleway (design intent was to allow pedestrians). "Dark blue" in the map is the catch-all default (#1a3d99) applied to all highway types not in the match expression.
  implication: The access matrix and the cost factor table were INCONSISTENT for cycleway. Bicycles work because cycleway IS in the bicycle set. Pedestrians failed because cycleway was NOT in the pedestrian set and Dutch OSM cycleways typically lack foot=yes tags.

## Resolution

root_cause: In HIGHWAY_ACCESS (router.ts line 62), cycleway was defined as new Set(['bicycle']) — pedestrians were excluded from the access matrix entirely. The ROAD_COST_FACTOR table already had pedestrian: 1.2 for cycleway (design intent: pedestrians allowed with slight penalty), but the access matrix contradicted this. Dutch OSM cycleways alongside main roads (like Gooimeerlaan's side roads) typically do NOT have foot=yes tags, so the positive-grant fallback never fired. Bicycle routing used these roads (bicycle is in the Set); pedestrian routing fell back to the main car road.

fix: Changed cycleway from new Set(['bicycle']) to new Set(['bicycle', 'pedestrian']) in HIGHWAY_ACCESS. Pedestrians can still be blocked explicitly via foot=no tags. Updated the corresponding test in router.test.ts (removed the "is NOT accessible for pedestrian" assertion, added "is accessible for pedestrian" and "is blocked when foot=no" regression tests). Rebuilt dist/ — osmWorker-CHRJ6qjd.js confirmed to contain cycleway:new Set(["bicycle","pedestrian"]).

verification: All 176 tests pass (up from 175 — new regression test added). Bundle confirmed with grep. Build completed without TypeScript errors. Human confirmed: Gooimeerlaan route now correctly uses side cycleways for pedestrian routing instead of the main car road.

files_changed: [src/lib/router.ts, src/__tests__/router.test.ts, dist/assets/osmWorker-CHRJ6qjd.js, dist/assets/index-BUTnr0yJ.js]
