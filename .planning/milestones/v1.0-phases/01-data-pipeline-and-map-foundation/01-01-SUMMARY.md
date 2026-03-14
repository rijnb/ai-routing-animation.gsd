---
phase: 01-data-pipeline-and-map-foundation
plan: 01
subsystem: testing
tags: [vite, react, typescript, vitest, jsdom, testing-library, maplibre-gl, fflate]

# Dependency graph
requires: []
provides:
  - Vite 8 + React 19 + TypeScript project scaffold with npm dependencies installed
  - Vitest jsdom test infrastructure configured (globals, setupFiles, jsdom environment)
  - Wave 0 RED-state test stubs for PIPE-01, PIPE-02, PIPE-04 requirements
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added:
    - vite@8.0.0 (build tool + dev server)
    - react@19.2.4 + react-dom@19.2.4
    - typescript@5.9.3
    - maplibre-gl@5.20.0 (map rendering runtime dep)
    - fflate@0.8.2 (gzip decompression runtime dep)
    - vitest@2.1.9 (test runner)
    - jsdom@28.1.0 (DOM environment for tests)
    - @testing-library/react@16.3.2 + jest-dom + user-event
  patterns:
    - "Test stubs in src/__tests__/ import from src/lib/ modules (not yet created)"
    - "vitest configured via vite.config.ts using @ts-expect-error for type compat"
    - "tsconfig.app.json excludes src/__tests__ so build doesn't fail on missing lib modules"

key-files:
  created:
    - vite.config.ts
    - package.json
    - tsconfig.json / tsconfig.app.json / tsconfig.node.json
    - src/App.tsx (minimal stub)
    - src/main.tsx
    - src/__tests__/setup.ts
    - src/__tests__/osmParser.test.ts
    - src/__tests__/graphBuilder.test.ts
    - src/__tests__/osmPipeline.test.ts
    - src/__tests__/dropZone.test.ts
  modified: []

key-decisions:
  - "Import vitest config via @ts-expect-error in vite.config.ts due to type mismatch between vite@8 and vitest@2's bundled vite version"
  - "Exclude src/__tests__ from tsconfig.app.json so app build passes while test stubs reference unbuilt lib modules"
  - "GeoJSON coordinate order enforced in tests: node[0]=lon, node[1]=lat — explicit lon/lat swap guard test"

patterns-established:
  - "Test-first: test stubs exist before implementation; Plan 02 implements to make them GREEN"
  - "RED state: all 4 test files fail with 'Cannot find module' — no syntax errors, just missing implementations"

requirements-completed: [PIPE-01, PIPE-02, PIPE-04]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 1 Plan 01: Project Scaffold and Wave 0 Test Stubs Summary

**Vite 8 + React 19 + TypeScript scaffold with maplibre-gl/fflate/vitest installed and four RED-state test stubs defining PIPE-01/02/04 contracts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T21:02:03Z
- **Completed:** 2026-03-12T21:06:05Z
- **Tasks:** 2
- **Files modified:** 18 created + 1 modified (tsconfig.app.json)

## Accomplishments

- Bootstrapped Vite + React + TypeScript project in a directory with only `public/maps/` (preserved OSM gz files)
- Installed runtime deps (maplibre-gl, fflate) and dev deps (vitest, jsdom, testing-library)
- Configured Vitest with jsdom environment, globals, and jest-dom setup
- Created 4 failing test stubs defining API contracts for osmParser, graphBuilder, osmPipeline, and osmLoader (dropZone)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React + TypeScript project** - `919d62b` (feat)
2. **Task 2: Wave 0 failing test stubs (RED state)** - `acdcfb3` (test)

Auto-fix commit (Rule 3):
- **Fix: exclude __tests__ from app tsconfig** - `275a668` (fix)

## Files Created/Modified

- `vite.config.ts` - Vite config with vitest jsdom test environment
- `package.json` - All dependencies; name set to ai-routing-animation
- `tsconfig.app.json` - App TypeScript config excluding src/__tests__
- `src/App.tsx` - Minimal stub: `<div id="app-root">OSM Routing Animator</div>`
- `src/__tests__/setup.ts` - Imports @testing-library/jest-dom
- `src/__tests__/osmParser.test.ts` - 4 tests: node map, lon/lat order guard, highway filter, min-2-node check
- `src/__tests__/graphBuilder.test.ts` - 4 tests: FeatureCollection type, LineString geometry, highway props, empty input
- `src/__tests__/osmPipeline.test.ts` - 2 tests: gunzip round-trip, full pipeline with synthetic fixture
- `src/__tests__/dropZone.test.ts` - 2 tests: handleFile function shape, postMessage with ArrayBuffer

## Decisions Made

- Used `@ts-expect-error` in vite.config.ts to suppress type mismatch between vite@8 and vitest@2's bundled internal vite — avoids fighting the type system, build still passes cleanly
- Excluded `src/__tests__` from `tsconfig.app.json` so `npm run build` exits 0 while test stubs reference lib modules that Plan 02 will create
- Enforced GeoJSON lon/lat order in test with explicit numeric guard: `node[0] < 10` catches lat/lon swap since lon ~4.9 < 10 but lat ~52.3 > 10

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded test files from app TypeScript compilation**
- **Found during:** Task 2 verification
- **Issue:** `npm run build` failed with TS2307 "Cannot find module" for lib/ modules that test stubs import — test stubs reference modules not yet created (Plan 02's job)
- **Fix:** Added `"exclude": ["src/__tests__"]` to `tsconfig.app.json` so `tsc -b` skips test files during app build
- **Files modified:** tsconfig.app.json
- **Verification:** `npm run build` exits 0; `npx vitest run` still discovers all 4 files in RED state
- **Committed in:** 275a668 (separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking build issue)
**Impact on plan:** Necessary correctness fix — test stubs are intentionally broken (RED state), app build must not fail because of them. No scope creep.

## Issues Encountered

- `npm create vite@latest . -- --template react-ts --force` cancelled due to existing files — scaffolded in `/tmp` and copied over (preserving `public/maps/` with OSM gz files)
- `vitest/config` defineConfig conflicted with vite@8 types (different internal vite versions) — resolved with `@ts-expect-error` on the `test:` property

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Project builds and dev server is runnable (`npm run dev`)
- Vitest configured and discovering all 4 test files in RED state
- Plan 02 can now implement `src/lib/osmParser.ts`, `src/lib/graphBuilder.ts`, `src/lib/osmLoader.ts` to turn tests GREEN
- `public/maps/leiden.osm.gz` and `public/maps/amsterdam.osm.gz` are available for integration testing in Plan 02

## Self-Check: PASSED

- src/__tests__/osmParser.test.ts: FOUND
- src/__tests__/graphBuilder.test.ts: FOUND
- src/__tests__/osmPipeline.test.ts: FOUND
- src/__tests__/dropZone.test.ts: FOUND
- vite.config.ts: FOUND
- 01-01-SUMMARY.md: FOUND
- Commits 919d62b, acdcfb3, 275a668: ALL FOUND

---
*Phase: 01-data-pipeline-and-map-foundation*
*Completed: 2026-03-12*
