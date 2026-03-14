---
phase: 05-improve-routing-oneway-access
verified: 2026-03-14T12:47:30Z
status: passed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "Route a car through a known one-way street in a real .osm.gz file"
    expected: "Car cannot enter from the wrong direction; pedestrian can traverse both directions"
    why_human: "End-to-end routing behavior on real OSM data cannot be verified by static analysis alone"
---

# Phase 5: One-Way Streets and Access Restrictions Verification Report

**Phase Goal:** Routing correctly enforces OSM one-way streets and access restrictions — cars follow directed edges, bikes respect one-ways with contraflow exception, pedestrians are always bidirectional; construction zones and barriers block appropriate modes
**Verified:** 2026-03-14T12:47:30Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `buildAdjacency` sets `onewayReversed: true` on the B→A edge when `oneway=yes` | VERIFIED | `graphBuilder.ts:125` — `onewayReversed: isOneway ? true : undefined` on edgeBA; test `oneway=yes: B→A edge has onewayReversed: true` passes |
| 2 | `buildAdjacency` sets `onewayReversed: true` on the A→B edge when `oneway=-1` | VERIFIED | `graphBuilder.ts:119` — `onewayReversed: isOnewayMinus1 ? true : undefined` on edgeAB; test `oneway=-1: A→B edge has onewayReversed: true` passes |
| 3 | `buildAdjacency` leaves `onewayReversed` absent on non-oneway ways | VERIFIED | `graphBuilder.ts:119,125` — `undefined` when neither flag set; regression guard test passes |
| 4 | `AdjacencyEdge` interface includes `onewayReversed?: boolean` | VERIFIED | `router.ts:11` — field present on the exported interface |
| 5 | Cars cannot traverse a `onewayReversed=true` edge | VERIFIED | `router.ts:107` — `if (mode === 'car') return false`; test `blocks car on onewayReversed=true edge` passes |
| 6 | Bikes cannot traverse a `onewayReversed=true` edge unless `oneway:bicycle=no` is set | VERIFIED | `router.ts:108` — `if (mode === 'bicycle' && tags['oneway:bicycle'] !== 'no') return false`; both bike tests pass |
| 7 | Pedestrians can always traverse a `onewayReversed=true` edge | VERIFIED | `router.ts:109` (comment + fall-through to `return true`); test `allows pedestrian on onewayReversed=true edge` passes |
| 8 | All modes are blocked on `highway=construction` or `construction=yes` edges | VERIFIED | `router.ts:81` — construction check first; all 4 construction tests pass |
| 9 | `barrier=bollard/gate/lift_gate/cycle_barrier` blocks car only; bike and pedestrian pass through | VERIFIED | `router.ts:97-98` — blocksCar set; all bollard/gate/lift_gate/cycle_barrier tests pass |
| 10 | `barrier=wall/fence/hedge` blocks all modes | VERIFIED | `router.ts:96` — blocksAll set with `return false`; wall/fence/hedge tests pass |
| 11 | `barrier=gate` and `barrier=lift_gate` block car; bike and pedestrian pass through | VERIFIED | `router.ts:97` — gate/lift_gate in blocksCar; gate/lift_gate tests pass |
| 12 | `barrier=kissing_gate` blocks car and bike, allows pedestrian | VERIFIED | `router.ts:99,101` — blocksCarAndBike set; kissing_gate tests pass |
| 13 | All existing `canUseEdge` and `aStar` tests still pass | VERIFIED | Full suite: 98/98 tests pass; no regressions in router, graphBuilder, segmentSnap, animation, stats |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/router.ts` | `AdjacencyEdge` with `onewayReversed?: boolean`; `canUseEdge(edge, mode)` signature; `aStar` call site using full edge | VERIFIED | Line 11: field present. Line 73-76: signature updated. Line 183: `canUseEdge(edge, mode)` call |
| `src/lib/graphBuilder.ts` | `oneway` detection in `buildAdjacency`; sets flag on correct directed edge | VERIFIED | Lines 112-126: `isOneway`/`isOnewayMinus1` detection; separate edge objects with conditional flag |
| `src/__tests__/graphBuilder.test.ts` | Three new oneway test cases (`yes`, `-1`, no-tag regression guard) | VERIFIED | Lines 119-172: `buildAdjacency — oneway detection` describe block with all 3 cases |
| `src/__tests__/router.test.ts` | New tests for oneway direction, construction, barrier; existing tests migrated to `edge()` fixture | VERIFIED | Lines 5-7: fixture helper defined. Lines 70-178: oneway/construction/barrier describe blocks. All existing tests migrated |
| `src/lib/segmentSnap.ts` | Call site updated to pass minimal `AdjacencyEdge` inline literal | VERIFIED | Line 79: `canUseEdge({ to: '', weight: 0, tags: way.tags }, mode)` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/graphBuilder.ts` | `src/lib/router.ts` | `AdjacencyEdge` import used with `onewayReversed` | WIRED | Line 3: `import type { AdjacencyList, AdjacencyEdge } from './router'`; `onewayReversed` set at lines 119, 125 |
| `src/lib/router.ts` (aStar) | `src/lib/router.ts` (canUseEdge) | `canUseEdge(edge, mode)` — full edge object passed | WIRED | Line 183: `if (!canUseEdge(edge, mode)) continue` — full edge, not `edge.tags` |
| `src/__tests__/router.test.ts` | `src/lib/router.ts` | `edge()` fixture helper builds `AdjacencyEdge` for test calls | WIRED | Lines 5-7: helper defined; all `canUseEdge` calls use it |
| `src/lib/segmentSnap.ts` | `src/lib/router.ts` | inline `AdjacencyEdge` literal at way-level snap filtering | WIRED | Line 79: `{ to: '', weight: 0, tags: way.tags }` — no `onewayReversed` (correct: snap is access-only) |

---

### Requirements Coverage

The requirement IDs listed in the PLAN frontmatter (ONEWAY-01, ONEWAY-02, ONEWAY-03, ONEWAY-04, BARRIER-01, CONSTRUCTION-01) and referenced in ROADMAP.md under Phase 5 are **not defined in REQUIREMENTS.md**. They appear to have been created as phase-specific identifiers without being added to the central requirements document.

**Orphaned requirement IDs (in ROADMAP.md Phase 5 and plan frontmatter, absent from REQUIREMENTS.md):**

| Requirement ID | Source | Description (from plan context) | Verified in Code |
|----------------|--------|--------------------------------|------------------|
| ONEWAY-01 | 05-01-PLAN.md, ROADMAP.md | `AdjacencyEdge.onewayReversed?: boolean` field added | YES — `router.ts:11` |
| ONEWAY-02 | 05-01-PLAN.md, ROADMAP.md | `buildAdjacency` detects `oneway=yes`/`-1`, sets flag on correct edge | YES — `graphBuilder.ts:112-126` |
| ONEWAY-03 | 05-02-PLAN.md, ROADMAP.md | Cars blocked on `onewayReversed=true` edges | YES — `router.ts:107` |
| ONEWAY-04 | 05-02-PLAN.md, ROADMAP.md | Bikes blocked unless `oneway:bicycle=no`; pedestrians always pass | YES — `router.ts:108-110` |
| BARRIER-01 | 05-02-PLAN.md, ROADMAP.md | Barrier blocking with mode-specific rules | YES — `router.ts:94-103` |
| CONSTRUCTION-01 | 05-02-PLAN.md, ROADMAP.md | `highway=construction`/`construction=yes` blocks all modes | YES — `router.ts:81` |

All 6 requirement IDs are implemented and verified in code. The gap is documentation only: REQUIREMENTS.md does not include these IDs. This does not block the phase goal.

---

### Anti-Patterns Found

Files scanned: `src/lib/router.ts`, `src/lib/graphBuilder.ts`, `src/__tests__/graphBuilder.test.ts`, `src/__tests__/router.test.ts`, `src/lib/segmentSnap.ts`

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No anti-patterns found |

No TODOs, FIXMEs, placeholders, empty implementations, or stub patterns found in phase 05 files.

---

### Human Verification Required

#### 1. Live routing on real one-way OSM data

**Test:** Load a `.osm.gz` file containing known one-way streets (e.g., a city center). Set source and destination such that the direct route requires traversing a one-way street against traffic. Route as car, then as pedestrian.
**Expected:** Car route avoids the one-way (takes longer detour); pedestrian route can use the one-way street in both directions.
**Why human:** Static analysis confirms the logic is correct in `canUseEdge`; actual path selection through `aStar` on real graph topology requires runtime observation.

#### 2. Bicycle contraflow behaviour

**Test:** With a `.osm.gz` containing a one-way street tagged `oneway:bicycle=no`, route a bicycle through it against the one-way direction.
**Expected:** Bicycle path successfully uses the contraflow lane; car route still avoids it.
**Why human:** Requires a real OSM dataset with `oneway:bicycle=no` tagging and a visual path comparison between modes.

---

### Summary

Phase 05 goal is fully achieved. All must-haves verified against actual codebase:

**Plan 01 (ONEWAY-01, ONEWAY-02):** `AdjacencyEdge` has `onewayReversed?: boolean` at `router.ts:11`. `buildAdjacency` correctly detects `oneway=yes` (sets flag on edgeBA) and `oneway=-1` (sets flag on edgeAB) using separate object literals. Three new tests all pass; no regression on non-oneway ways.

**Plan 02 (ONEWAY-03, ONEWAY-04, BARRIER-01, CONSTRUCTION-01):** `canUseEdge` signature changed to `(edge: AdjacencyEdge, mode: RoutingMode)`. Construction check is first (before highway matrix). Barrier dispatch uses three readable sets (`blocksAll`, `blocksCar`, `blocksCarAndBike`). Oneway direction enforcement is last, with pedestrian always passing. `aStar` call site updated to pass full edge. `segmentSnap.ts` auto-fixed with inline minimal edge literal. 24 new tests added; full suite 98/98 green.

**Documentation gap (non-blocking):** Requirement IDs ONEWAY-01 through ONEWAY-04, BARRIER-01, CONSTRUCTION-01 are referenced in ROADMAP.md and plan frontmatter but are not defined in REQUIREMENTS.md. The implementations exist and are verified; only the requirements document is incomplete.

---

_Verified: 2026-03-14T12:47:30Z_
_Verifier: Claude (gsd-verifier)_
