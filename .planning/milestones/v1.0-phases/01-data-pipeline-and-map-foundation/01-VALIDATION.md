---
phase: 1
slug: data-pipeline-and-map-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vite.config.ts` (test section) — Wave 0 creates this |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-dropZone | TBD | 1 | PIPE-01 | unit | `npx vitest run src/__tests__/dropZone.test.ts` | ❌ W0 | ⬜ pending |
| 1-osmParser | TBD | 1 | PIPE-02 | unit | `npx vitest run src/__tests__/osmParser.test.ts` | ❌ W0 | ⬜ pending |
| 1-osmPipeline | TBD | 1 | PIPE-02 | integration | `npx vitest run src/__tests__/osmPipeline.test.ts` | ❌ W0 | ⬜ pending |
| 1-graphBuilder | TBD | 1 | PIPE-04 | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ❌ W0 | ⬜ pending |
| 1-mapInteraction | TBD | 1 | MAP-03 | manual | n/a — WebGL not testable in jsdom | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/osmParser.test.ts` — stubs for PIPE-02 (parse correctness with small XML fixture)
- [ ] `src/__tests__/graphBuilder.test.ts` — stubs for PIPE-04 (GeoJSON output shape)
- [ ] `src/__tests__/osmPipeline.test.ts` — stubs for PIPE-02 integration (full gunzip+parse flow)
- [ ] `src/__tests__/dropZone.test.ts` — stubs for PIPE-01 (file handler unit test)
- [ ] Vitest install: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom`
- [ ] `vite.config.ts` test section: `test: { environment: 'jsdom', globals: true }`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MapLibre map pan/zoom not blocked by road overlay | MAP-03 | WebGL canvas required; jsdom does not support WebGL | Load a .osm.gz file, verify road overlay appears, then pan and zoom — map must remain responsive |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
