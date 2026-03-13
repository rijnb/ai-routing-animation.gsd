---
phase: 3
slug: search-animation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^2.1.9 |
| **Config file** | vite.config.ts (`test` block) |
| **Quick run command** | `npx vitest run src/__tests__/animation.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/animation.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | ANIM-01 | unit | `npx vitest run src/__tests__/animation.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | ANIM-02 | unit | `npx vitest run src/__tests__/animation.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | ANIM-03 | unit | `npx vitest run src/__tests__/animation.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | ANIM-01 | manual | Visual: frontier nodes visible, teal/red distinct | n/a | ⬜ pending |
| 3-02-02 | 02 | 1 | ANIM-02 | manual | Visual: yellow path grows alongside frontier | n/a | ⬜ pending |
| 3-03-01 | 03 | 1 | ANIM-03 | unit | `npx vitest run src/__tests__/animation.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 1 | ANIM-03 | manual | Visual: slider changes animation speed live | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/animation.test.ts` — stubs covering ANIM-01 (filterHistory, visited accumulation, frontier batch), ANIM-02 (slicePath fraction), ANIM-03 (computeNodesPerFrame at 0.5x and 5x)

*Pure functions to extract and test: `filterHistory(searchHistory)`, `slicePath(path, cursor, total)`, `computeNodesPerFrame(multiplier)`*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontier expands node-by-node with teal/red distinction | ANIM-01 | rAF loop + MapLibre WebGL — jsdom has no rAF implementation and no WebGL | Load OSM, click origin + destination, observe nodes appearing in teal (visited) and red (frontier) |
| Yellow path grows alongside frontier | ANIM-02 | Same — visual WebGL rendering | Observe yellow route line growing proportionally as frontier expands |
| Slider adjusts speed live during animation | ANIM-03 | Requires active animation running in browser | Drag slider while animation runs; speed change should be immediate |
| No memory growth across multiple routes | ANIM-01 | Requires Chrome DevTools Memory profiling | Record 5 routes, observe heap stays stable in Memory tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
