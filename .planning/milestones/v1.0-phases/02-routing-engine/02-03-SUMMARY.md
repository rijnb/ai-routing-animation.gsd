---
phase: 02-routing-engine
plan: "03"
subsystem: routing
tags: [typescript, react, hooks, web-worker, astar, osm, routing, modeSelector]

# Dependency graph
requires:
  - phase: 02-routing-engine/02-02
    provides: aStar, buildAdjacency, snapToNearestSegment implementations
  - phase: 02-routing-engine/02-01
    provides: OsmGraph, AdjacencyList, RoutingMode, ComponentMap type stubs

provides:
  - osmWorker.ts extended with typed 'load'/'route' message protocol (backwards-compatible)
  - osmWorker posts componentMap and graph (OsmGraph) in 'done' message
  - osmWorker 'route' handler: snap + virtual nodes + A* + route-done/route-error
  - useOsmLoader.ts exposes workerRef, graph, and componentMap state
  - useRouter hook: click-based snap, connectivity check, worker dispatch, mode auto-reRoute
  - ModeSelector component: icon+label toggle buttons with aria-pressed, visible prop

affects:
  - 02-04 (animation layer mounts map layers using route from useRouter, uses workerRef from useOsmLoader)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Worker message multiplexing via addEventListener (not onmessage assignment)
    - Virtual node injection for snapped routing (VIRTUAL_START / VIRTUAL_END pattern)
    - Shared worker ref passed to multiple hooks to avoid duplicate worker creation
    - Ref-backed state for triggerRoute to avoid stale closures in callbacks

key-files:
  created:
    - src/hooks/useRouter.ts
  modified:
    - src/workers/osmWorker.ts
    - src/hooks/useOsmLoader.ts
    - src/components/ModeSelector.tsx

key-decisions:
  - "useRouter receives workerRef from useOsmLoader rather than owning its own worker — prevents duplicate workers"
  - "useOsmLoader.ts switched from onmessage assignment to addEventListener to allow multiple listeners on the same worker"
  - "Virtual node pattern for snapped routing: VIRTUAL_START/VIRTUAL_END injected into shallow-copied adjacency, never mutating shared state"
  - "useRouter uses modeRef.current (not state) inside callbacks to avoid stale closures while still exposing mode state for renders"

patterns-established:
  - "Worker message multiplexing: each hook calls worker.addEventListener('message', handler); worker.onmessage reserved for nothing"
  - "Shallow-copy adjacency before adding virtual nodes; spread existing arrays when appending back-edges to avoid mutation"
  - "Connectivity check before route dispatch: compare componentMap[nodeA] for source vs dest to fail fast"

requirements-completed: [ROUT-01, ROUT-02, PIPE-03]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 2 Plan 03: Worker Bridge and Hook Summary

**Typed worker message protocol with virtual-node A* routing, useRouter hook managing full click-to-route pipeline, and ModeSelector with icon+label toggle buttons — all 42 tests GREEN**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-13T11:26:19Z
- **Completed:** 2026-03-13T11:28:50Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended `osmWorker.ts` with a typed `load`/`route` message protocol (backwards-compatible with raw ArrayBuffer), virtual-node A* routing, and `componentMap`+`graph` in the `done` message
- Implemented `useRouter` hook with click-cycle state, main-thread snap, connectivity check, worker dispatch, and mode auto-reRoute
- Updated `useOsmLoader` to expose `workerRef`, `graph`, and `componentMap` and use `addEventListener` for worker message multiplexing
- Completed `ModeSelector` with three icon+label toggle buttons, `aria-pressed`, `visible` prop, and floating bottom-right panel

## Task Commits

1. **Task 1: Extend osmWorker with typed message protocol and route handler** - `21a0d21` (feat)
2. **Task 2: Implement useRouter hook and complete ModeSelector component** - `9ae0115` (feat)

## Files Created/Modified

- `src/workers/osmWorker.ts` — typed dispatch, load handler with componentMap/graph in done, route handler with virtual nodes and A*
- `src/hooks/useOsmLoader.ts` — addEventListener migration, workerRef exposed, graph/componentMap state added
- `src/hooks/useRouter.ts` — new hook implementing RouterState interface (click cycle, snap, connectivity, dispatch, mode reRoute, reset)
- `src/components/ModeSelector.tsx` — full implementation replacing RED stub; icon+label buttons, aria-pressed, visible prop

## Decisions Made

- `useRouter` receives `workerRef` as a parameter rather than owning a worker — plan called for this pattern to avoid duplicate workers; both hooks share the single worker created by `useOsmLoader`
- `useOsmLoader` switched from `worker.onmessage =` to `worker.addEventListener('message', ...)` so `useRouter` can attach its own listener without replacing the loader's
- Virtual node injection uses shallow copy of adjacency (not deep clone) — sufficient because we use spread when appending back-edges; the original arrays in `adjacency` are never mutated
- `modeRef.current` tracked alongside `mode` state to give stable closure access inside `handleMapClick`/`triggerRoute` callbacks

## Deviations from Plan

None — plan executed exactly as written. All interfaces matched plan spec exactly.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Routing data/logic layer complete: worker computes routes, `useRouter` manages state, `ModeSelector` handles mode selection
- Plan 04 can now add map layers (route line, marker pins, A* animation) by consuming `useRouter` and `useOsmLoader` from `App.tsx`
- `workerRef` is available from `useOsmLoader` for `useRouter` — wiring goes in `App.tsx` or a top-level component

---
*Phase: 02-routing-engine*
*Completed: 2026-03-13*

## Self-Check: PASSED

- src/workers/osmWorker.ts: FOUND
- src/hooks/useRouter.ts: FOUND
- src/components/ModeSelector.tsx: FOUND
- .planning/phases/02-routing-engine/02-03-SUMMARY.md: FOUND
- commit 21a0d21: FOUND
- commit 9ae0115: FOUND
