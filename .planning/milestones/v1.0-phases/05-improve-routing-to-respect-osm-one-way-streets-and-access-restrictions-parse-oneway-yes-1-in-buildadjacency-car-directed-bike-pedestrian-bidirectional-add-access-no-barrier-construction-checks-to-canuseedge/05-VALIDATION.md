---
phase: 5
slug: improve-routing-to-respect-osm-one-way-streets-and-access-restrictions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vite.config.ts` (test block, jsdom environment) |
| **Quick run command** | `npx vitest run src/__tests__/router.test.ts src/__tests__/graphBuilder.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/router.test.ts src/__tests__/graphBuilder.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | Add `onewayReversed?` to `AdjacencyEdge` interface | unit | `npx vitest run src/__tests__/router.test.ts src/__tests__/graphBuilder.test.ts` | ✅ | ⬜ pending |
| 5-01-02 | 01 | 1 | `buildAdjacency` sets `onewayReversed: true` for `oneway=yes` (reverse edge) | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-01-03 | 01 | 1 | `buildAdjacency` sets `onewayReversed: true` for `oneway=-1` (forward edge) | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-01 | 02 | 2 | Update `canUseEdge` signature to accept `AdjacencyEdge`; update `aStar` call site | regression | `npx vitest run src/__tests__/router.test.ts` | ✅ | ⬜ pending |
| 5-02-02 | 02 | 2 | `canUseEdge` blocks all modes for `highway=construction` / `construction=yes` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-03 | 02 | 2 | `canUseEdge` blocks car on `onewayReversed=true` edge | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-04 | 02 | 2 | `canUseEdge` blocks bicycle on `onewayReversed=true` (no contraflow tag) | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-05 | 02 | 2 | `canUseEdge` allows bicycle on `onewayReversed=true` with `oneway:bicycle=no` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-06 | 02 | 2 | `canUseEdge` allows pedestrian on `onewayReversed=true` edge | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-07 | 02 | 2 | `canUseEdge` blocks car for `barrier=bollard`, allows bike and ped | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-08 | 02 | 2 | `canUseEdge` blocks all modes for `barrier=wall` / `fence` / `hedge` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |
| 5-02-09 | 02 | 2 | `canUseEdge` blocks car for `barrier=gate` and `barrier=lift_gate` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (new cases) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no Wave 0 setup needed.

*Vitest 2.1.9, jsdom, and `setup.ts` are fully in place. New test cases go into existing `router.test.ts` and `graphBuilder.test.ts`.*

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
