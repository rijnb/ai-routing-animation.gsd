---
status: resolved
trigger: "frontier-dots-persist-after-animation"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: clearFrontierLayers clears BOTH sources. On natural animation end, only frontier-nodes (red dots) should be cleared — visited-nodes (cyan roads) should remain. Need a surgical clearFrontierDots helper.
test: Human verified: partial fix worked for red dots but wiped cyan roads too — confirms clearFrontierLayers is too broad for animation-end cleanup.
expecting: Adding clearFrontierDots (clears only frontier-nodes) to mapHelpers.ts and calling it on animation end will preserve cyan roads and remove red dots.
next_action: Apply fix — add clearFrontierDots to mapHelpers.ts, update useAnimation.ts to call clearFrontierDots instead of clearFrontierLayers on animation completion

## Symptoms

expected: After the A* animation finishes playing, the red frontier dots (frontier-nodes-layer) and cyan visited edges (visited-nodes-layer) should be cleared from the map automatically.
actual: Red dots (and likely cyan visited edges) persist on the map after the animation ends. They are only cleared on the next map click (handleMapClickWithCancel calls cancelAnimation + clearFrontierLayers).
errors: No console errors — silent visual bug.
reproduction: Load an OSM file, place source and destination markers, wait for the animation to complete fully. Red dots remain.
timeline: Always been like this — not a regression.

## Eliminated

- hypothesis: clearFrontierLayers is called somewhere on animation end
  evidence: Full read of App.tsx shows only two call sites — handleMapClickWithCancel and the geojson-change effect. Neither fires on natural animation completion.
  timestamp: 2026-03-14T00:00:00Z

## Evidence

- timestamp: 2026-03-14T00:00:00Z
  checked: useAnimation.ts lines 95-99 — the else branch when animation finishes
  found: Sets rafHandleRef.current = null and returns. No cleanup, no callback, no clearFrontierLayers call.
  implication: The frontier layers remain populated with the last frame's data (the final batch of nodes rendered just before cursor >= total).

- timestamp: 2026-03-14T00:00:00Z
  checked: App.tsx — all clearFrontierLayers call sites
  found: Called in handleMapClickWithCancel (line 88) and in the geojson-change effect (line 78). Neither is triggered by animation end.
  implication: Natural animation completion has no cleanup path — confirms the bug.

- timestamp: 2026-03-14T00:00:00Z
  checked: mapHelpers.ts clearFrontierLayers
  found: Resets both visited-nodes and frontier-nodes sources to EMPTY_FC.
  implication: The function is correct and available; it just needs to be called at animation end.

## Resolution

root_cause: useAnimation.ts frame() called clearFrontierLayers on animation end, which cleared BOTH visited-nodes (cyan roads) and frontier-nodes (red dots). On natural animation completion only the red dots should be removed; the cyan visited-edges overlay should persist.
fix: Added clearFrontierDots (clears only frontier-nodes source) to mapHelpers.ts. Updated useAnimation.ts to call clearFrontierDots(map) instead of clearFrontierLayers(map) in the animation-complete branch. clearFrontierLayers remains unchanged for the cancel/new-route-start path (App.tsx).
verification: Human confirmed — red dots clear on animation end, cyan visited roads stay, and map click clears both correctly.
files_changed:
  - src/lib/mapHelpers.ts (added clearFrontierDots export)
  - src/hooks/useAnimation.ts (import + call clearFrontierDots on completion)
