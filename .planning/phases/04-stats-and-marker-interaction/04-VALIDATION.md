---
phase: 4
slug: stats-and-marker-interaction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^2.1.9 |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | STAT-01, STAT-02, STAT-03 | unit | `npx vitest run src/__tests__/stats.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | MAP-04 | unit | `npx vitest run src/__tests__/markerDrag.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | STAT-01 | unit | `npx vitest run src/__tests__/stats.test.ts -t "nodesExplored"` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | STAT-02 | unit | `npx vitest run src/__tests__/stats.test.ts -t "distance"` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 1 | STAT-03 | unit | `npx vitest run src/__tests__/stats.test.ts -t "travelTime"` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | MAP-04 | unit | `npx vitest run src/__tests__/markerDrag.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/stats.test.ts` — stubs for STAT-01 (`nodesExplored` increments/resets), STAT-02 (distance meters→km formatting), STAT-03 (`estimateTravelTime` per mode)
- [ ] `src/__tests__/markerDrag.test.ts` — stubs for MAP-04 drag callback pipeline (`handleMarkerDrag` logic, not MapLibre event binding)

*Existing infrastructure covers test runner — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MapLibre Marker drag UI interaction | MAP-04 | jsdom cannot simulate real drag events on MapLibre canvas | Open app, drag source marker to new location, confirm route recalculates and animation restarts |
| Live counter visually ticks during animation | STAT-01 | DOM timing behavior depends on rAF loop and browser paint | Open app, trigger route animation, observe counter incrementing in real time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
