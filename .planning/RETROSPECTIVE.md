# Retrospective: OSM Routing Animator

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-14
**Phases:** 5 | **Plans:** 15
**Timeline:** 2 days (2026-03-12 → 2026-03-14)
**Commits:** ~111

### What Was Built

- OSM parsing pipeline in Web Worker with in-browser gzip decompression
- A* pathfinding with haversine heuristic, mode-aware access matrix, union-find component detection
- A* search frontier visualization: rAF animation loop with density cloud rendering, speed slider
- Draggable source/destination markers with segment snapping, live stats panel (nodes, distance, time)
- One-way street and access restriction enforcement with contraflow bicycle lane support

### What Worked

- **TDD wave pattern** (RED stubs → GREEN implementation → wiring) kept logic clean and testable throughout
- **Pure function extraction** for animation utilities, stats, and routing algorithms enabled fast unit tests without browser environment
- **Web Worker from day 1** — retrofitting would have been costly; this decision paid off immediately
- **Subagent-driven development** — plan execution via GSD agents was rapid and consistent
- **Virtual node pattern** for snapped routing — never mutating shared adjacency state was the right call

### What Was Inefficient

- Phase 2 routing engine had 4 plans but the ROADMAP still shows Phase 2 as incomplete (minor tracking gap)
- A few key decisions were re-discovered mid-phase (e.g., coordinate convention, exact function signatures) that could have been specified upfront
- STATE.md accumulated a very large decisions log that would benefit from pruning after milestone

### Patterns Established

- `@ts-expect-error` in `vite.config.ts` for Vite 8 / Vitest 2 type mismatch — documented pattern
- Exclude `src/__tests__` from `tsconfig.app.json` so app build passes while tests reference unbuilt modules
- GeoJSON lon/lat test guard: `node[0] < 10` distinguishes lon (~4.9) from lat (~52.3)
- `onMapReady` callback pattern to expose MapLibre map instance to App.tsx without prop drilling
- Factory export pattern (`buildHandleMarkerDrag`) for testing hooks without React context

### Key Lessons

- Specify exact function signatures and argument shapes in plans upfront — deviations from plan specs cause rework
- `slicePath` for growing red path was dropped by user preference — confirm animation style with user before implementing
- Frame-skip mechanism (not just `nodesPerFrame`) is necessary for sub-1-node-per-frame slow animation
- Guard `startAnimation` on `route.found` — A* returns full `searchHistory` even when no path exists

### Cost Observations

- Sessions: ~4 focused sessions over 2 days
- Model: Sonnet 4.6 throughout (quality profile)
- Notable: 15 plans executed with no major rework loops; TDD discipline prevented most integration surprises

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 5 |
| Plans | 15 |
| Timeline (days) | 2 |
| LOC (TS/TSX) | ~3,900 |
| Tests | 152 |
| Rework incidents | 2 (animation style, speed slider) |
