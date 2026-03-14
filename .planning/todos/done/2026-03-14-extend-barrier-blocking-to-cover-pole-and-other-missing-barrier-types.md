---
created: 2026-03-14T12:23:00.000Z
title: Extend barrier blocking to cover pole and other missing barrier types
area: ui
files:
  - src/lib/router.ts
---

## Problem

Phase 5 added barrier blocking in `canUseEdge` (router.ts) for a specific set of OSM barrier types:
- `bollard` → blocks car + bike
- `gate`, `lift_gate` → blocks car
- `cycle_barrier` → blocks bike only
- `kissing_gate` → blocks car + bike
- `wall`, `fence`, `hedge` → blocks all modes

However, other common OSM barrier types that physically block cars are not handled:
- `barrier=pole` — a pole in the ground, blocks car (but not bike/pedestrian)
- `barrier=jersey_barrier` — concrete road barrier, blocks all modes
- `barrier=stile` — step-over barrier, blocks car + bike, pedestrian passes
- `barrier=turnstile` — rotating gate, blocks car + bike, pedestrian passes
- `barrier=block` — large concrete/stone block, blocks car (sometimes bike too)
- `barrier=chain` — chain across road, blocks car (bike/pedestrian can pass)
- `barrier=planter` — planter box, blocks car + bike

User report: "Some road restrictions (like a pole in the ground) that block cars are not taken into account as a road restriction."

Without these, car routes may be routed through physically impassable barriers, producing unrealistic paths.

## Solution

In `canUseEdge` in `router.ts`, extend the barrier check block to include:

```ts
// Pole, block, chain, planter — block car only
case 'pole':
case 'block':
case 'chain':
case 'planter':
  if (mode === 'car') return false
  break

// Jersey barrier — blocks all
case 'jersey_barrier':
  return false

// Stile, turnstile — block car + bike, pedestrian passes
case 'stile':
case 'turnstile':
  if (mode === 'car' || mode === 'bicycle') return false
  break
```

Add corresponding unit tests in `router.test.ts` for each new barrier type × mode combination. Follow the existing `edge()` fixture pattern used in Phase 5 tests.
