---
status: resolved
trigger: "The speed slider is not working well; the slowest setting needs to be at least 10x slower; the fastest setting needs to remain as-is."
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: computeNodesPerFrame uses a linear scale starting at min=0.5, yielding 4 nodes/frame at the slowest setting — that is still too fast. The fix is to make the slow end much slower (fewer nodes/frame or add frame-skipping) while keeping the fast end unchanged.
test: Read computeNodesPerFrame and SpeedPanel slider range, then redesign the curve.
expecting: At speed=0.5 (min), the animation processes ~1 node every ~10 frames (10x slower than current); at speed=5.0 (max), it processes the same number of nodes/frame as today.
next_action: Apply fix to computeNodesPerFrame and adjust SpeedPanel/useAnimation if needed.

## Symptoms

expected: At the slowest slider position, the animation should run at least 10x slower than it currently does. The fastest setting should remain unchanged.
actual: The slowest slider setting is still too fast — not slow enough for users to follow the animation step-by-step.
errors: None — this is a UX/behavior issue.
reproduction: Open the app, set the speed slider to the minimum/slowest position, start a route animation, observe it still runs too fast.
started: Unknown — possibly always been this way.

## Eliminated

- (none yet)

## Evidence

- timestamp: 2026-03-14T00:00:00Z
  checked: src/components/SpeedPanel.tsx
  found: Slider range min=0.5, max=5.0, step=0.5; passes numeric value directly to onSpeedChange.
  implication: multiplier fed to computeNodesPerFrame ranges 0.5–5.0.

- timestamp: 2026-03-14T00:00:00Z
  checked: src/lib/animationUtils.ts — computeNodesPerFrame
  found: `Math.max(1, Math.round(7 * multiplier))` → at multiplier=0.5 yields 4 nodes/frame; at multiplier=5 yields 35 nodes/frame. requestAnimationFrame fires ~60fps so at slowest: 4*60=240 nodes/sec.
  implication: Even at slowest setting 240 nodes/sec is processed — far too fast to follow visually. Root cause confirmed.

- timestamp: 2026-03-14T00:00:00Z
  checked: src/hooks/useAnimation.ts
  found: Every RAF call invokes frame() which calls computeNodesPerFrame(speedRef.current) and advances cursor. No frame-skipping logic exists.
  implication: To slow down we must either reduce nodes/frame below 1 (requires frame-skipping) or increase the interval between frames.

## Resolution

root_cause: computeNodesPerFrame uses a linear formula `Math.max(1, Math.round(7 * multiplier))`. At the minimum slider value (0.5) it returns 4 nodes/frame. With requestAnimationFrame running at ~60fps, that is ~240 nodes/second — far too fast to observe step-by-step. The fast end (5.0 → 35 nodes/frame, ~2100 nodes/sec) must stay unchanged.

fix: |
  Redesign speed to use an exponential curve so the slow end is ~10x slower than the current slow end while the fast end is identical.
  Strategy: introduce a "frames-to-skip" approach. Instead of always calling frame() on every RAF tick, only advance the cursor every N ticks where N is derived from the speed setting.

  New design:
  - At speed=5.0 (max): nodesPerFrame=35, frameSkip=1 (every tick) — same as today (35 nodes/frame * 60fps ≈ 2100/s)
  - At speed=0.5 (min): nodesPerFrame=1, frameSkip=10 — processes 1 node every 10 frames ≈ 6 nodes/sec (10x slower than current ~60/s at 1 node/frame)

  Implementation: export computeFrameParams(multiplier) returning {nodesPerFrame, frameSkip}.
  useAnimation maintains a tickCounter that increments each RAF call; only advances cursor when tickCounter % frameSkip === 0.

files_changed:
  - src/lib/animationUtils.ts
  - src/hooks/useAnimation.ts
verification: All 152 tests pass including 6 new computeFrameParams tests. Human confirmed fix works correctly in browser.
