---
phase: 2
slug: routing-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vite.config.ts` (`test` block, jsdom environment) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | MAP-01, MAP-02 | unit | `npx vitest run src/__tests__/segmentSnap.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | ROUT-01, ROUT-03 | unit | `npx vitest run src/__tests__/router.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | ROUT-02 | unit | `npx vitest run src/__tests__/modeSelector.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | PIPE-03 | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ❌ extend | ⬜ pending |
| 02-02-xx | 02 | 1 | MAP-01, MAP-02 | unit | `npx vitest run src/__tests__/segmentSnap.test.ts` | ✅ W0 | ⬜ pending |
| 02-03-xx | 03 | 1 | ROUT-01, ROUT-02, ROUT-03 | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/segmentSnap.test.ts` — stubs for MAP-01, MAP-02
- [ ] `src/__tests__/router.test.ts` — stubs for ROUT-01, ROUT-03
- [ ] `src/__tests__/modeSelector.test.tsx` — stubs for ROUT-02
- [ ] `src/lib/segmentSnap.ts` — new module (must exist before tests can import)
- [ ] `src/lib/router.ts` — new module (must exist before tests can import)
- [ ] `src/components/ModeSelector.tsx` — new component (needed for ROUT-02 test)
- [ ] Extend `src/__tests__/graphBuilder.test.ts` — add PIPE-03 component detection tests

*(No new framework install required — Vitest already configured)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Markers visually snap to road on map click | MAP-01, MAP-02 | Requires browser interaction + visual check | Click map near a road; verify marker appears on road segment, not at raw click point |
| Three modes produce visibly different routes | ROUT-03 | Visual comparison of drawn polylines | Set source/dest, switch modes, verify route polylines differ meaningfully |
| Disconnected graph warning visible to user | ROUT-01 | UI/toast visibility requires browser | Place markers in disconnected graph regions; verify warning message shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
