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

## Milestone: v1.1 — UI Overhaul

**Shipped:** 2026-03-15
**Phases:** 4 | **Plans:** 6
**Timeline:** 1 day (2026-03-15)
**Commits:** ~17 feature commits

### What Was Built

- CSS design token system (11 `--color-*` custom properties) + Space Grotesk typography via Google Fonts
- Custom pointer-event `Slider` component with 8 tests, replacing native `<input type="range">`
- `ControlPanel` unified fixed-position panel (bottom-right) consolidating drop zone, mode selector, speed, playback with smooth opacity/height transitions
- `ModeSelector` horizontal icon-only segmented control (car/bicycle/pedestrian) with `aria-pressed`
- `PlaybackControls` media-player transport buttons (▶/⏸/⏭) with ref-gated rAF pause/step loop
- `StatsHud` sci-fi 3-column instrument readout (DIST/TIME/NODE) with blue-bordered dark surface, fixed top-left

### What Worked

- **Iterative UAT loops** — two of four phases had user visual feedback integrated before marking complete; layout issues were caught early (Phase 7 panel width, Phase 9 HUD overlap/stability)
- **Corner assignment pattern** — explicitly naming which UI element owns which viewport corner (top-left/top-right/bottom-right) prevented overlap conflicts from the start
- **Ref-gated rAF loop** — keeping rAF alive while paused (rather than cancel/restart) eliminated the need for complex state tracking on resume; discovered during Phase 8 planning and worked perfectly
- **Fixed-width grid for live counters** — `repeat(3, 1fr)` on the HUD prevented layout shift as NODE values grew during animation; `repeat(3, auto)` was the natural first instinct but wrong

### What Was Inefficient

- CSS token layer established in Phase 6 but bypassed in Phases 7–9; components were written with inline hex literals that matched token values. The abstraction exists but provides no leverage. Would have been cleaner to enforce `var(--color-*)` usage from the start.
- Two SUMMARY.md frontmatter gaps (THEME-03 missing from 06-02, CTRL-03 missing from 08-02) — plans that complete requirements across a phase boundary need explicit frontmatter entries in each plan's SUMMARY.
- StatsHud position was originally planned as top-right; overlapped SettingsPanel — corner assignment should be done at roadmap time, not at implementation time.

### Patterns Established

- **Corner assignment**: name viewport corners at roadmap design time — `top-left`, `top-right`, `bottom-right` — to prevent overlap surprises at Phase 9
- **Segmented control pattern**: `flexDirection: row` + `overflow: hidden` on container, `borderRadius: 0` on buttons, `flex: 1` for equal width — no separator divs needed
- **Pause-gate rAF**: `isPausedRef` + `stepRef` at hook level, not inside closure — rAF re-schedules itself when paused, `stepRef` one-shot executes a single frame
- **Fixed-width stat readout**: always use `width` + `repeat(N, 1fr)` grid for columns with live numeric values

### Key Lessons

- Lock down all UI element positions (viewport corner ownership) before building the phase that creates each element
- When a plan executes work for a requirement owned by another plan number, add the REQ-ID explicitly to that plan's SUMMARY frontmatter
- Start Phase 6 token investment early but enforce consumption: add a linting check or code review gate to prevent `#4488ff` literals when `var(--color-accent)` exists

### Cost Observations

- Sessions: ~2 focused sessions (1 day)
- Model: Sonnet 4.6 throughout (quality profile)
- Notable: 6 plans in 4 phases with 2 UAT fix rounds; much faster than v1.0 due to smaller scope and established codebase patterns

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Phases | 5 | 4 |
| Plans | 15 | 6 |
| Timeline (days) | 2 | 1 |
| LOC (TS/TSX) | ~3,900 | ~4,770 |
| Tests | 152 | 152+ |
| Rework incidents | 2 (animation style, speed slider) | 2 (panel layout, HUD overlap) |
