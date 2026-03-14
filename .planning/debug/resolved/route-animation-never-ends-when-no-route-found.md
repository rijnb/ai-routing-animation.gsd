---
status: resolved
trigger: "route-animation-never-ends-when-no-route-found"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - App.tsx starts animation without checking route.found. When no path exists, searchHistory is still non-empty (all explored nodes), causing the animation to run exhaustively without ever showing a "route not found" message.
test: Read App.tsx lines 63-70 and router.ts return value when route not found
expecting: Fix: guard startAnimation call with route.found check; when !route.found, show error toast instead
next_action: Apply fix in App.tsx - check route.found before calling startAnimation, and surface a routeError when found is false

## Symptoms

expected: When no route can be found, the animation should quickly end (or not start) and show a "route not found" message. The app already knows there is no route because no red line (optimal path) is shown.
actual: The animation plays through all possible paths/edges exhaustively and never terminates with a "route not found" message. It just keeps animating forever or takes very long.
errors: None reported - it's a logical/UX issue.
reproduction: Set start and end points where no connecting route exists, then trigger route animation. The animation explores all paths but never concludes.
started: Unknown - possibly always present.

## Eliminated

## Evidence

- timestamp: 2026-03-14T00:00:00Z
  checked: src/App.tsx lines 63-70 (auto-start animation effect)
  found: startAnimation is called without checking route.found. Only checks route !== null, route !== prevRouteRef, graph, and mapRef.current.
  implication: Animation always starts when a RouteResult arrives, even when found=false.

- timestamp: 2026-03-14T00:00:00Z
  checked: src/lib/router.ts aStar() return value on no-path
  found: Returns { path: [], searchHistory: <all explored nodes>, distance: 0, found: false }. searchHistory can be very large — every node touched before openSet exhaustion.
  implication: Animation iterates through the full searchHistory with no path in red, and never terminates with an error message.

- timestamp: 2026-03-14T00:00:00Z
  checked: src/hooks/useAnimation.ts frame() function
  found: No check for route.found inside startAnimation or frame(). It just calls updateRouteLayer(map, route.path) which is an empty array when no route found — so no red line. Animation runs to completion of searchHistory and then stops silently.
  implication: User sees nodes explored exhaustively and then nothing happens — no error, no "route not found" message.

- timestamp: 2026-03-14T00:00:00Z
  checked: src/hooks/useRouter.ts triggerRoute connectivity check (lines 107-111)
  found: Only blocks routes between disconnected components. Same-component pairs with access/direction restrictions still reach aStar and get found=false results.
  implication: The route.found=false case is reachable even after the connectivity check passes.

## Resolution

root_cause: App.tsx starts animation unconditionally when a RouteResult arrives, without checking route.found. When A* exhausts all reachable nodes without reaching the goal, it returns found=false with a full searchHistory. The animation plays through all explored nodes, shows no red path, and ends silently — no "route not found" error is ever shown to the user.
fix: In App.tsx, inside the auto-start animation useEffect, check route.found before calling startAnimation. When found=false, skip the animation and instead surface a routing error message (e.g. "No route found between these points").
verification: All 146 existing tests pass. Fix is a 3-line guard in App.tsx that skips startAnimation and shows error toast when route.found is false.
files_changed: [src/App.tsx]
