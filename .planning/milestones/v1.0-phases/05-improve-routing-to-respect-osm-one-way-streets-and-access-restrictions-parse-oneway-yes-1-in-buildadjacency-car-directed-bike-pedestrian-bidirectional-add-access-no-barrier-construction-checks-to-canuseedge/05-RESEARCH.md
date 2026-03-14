# Phase 5: One-way Streets and Access Restrictions — Research

**Researched:** 2026-03-14
**Domain:** OSM routing tags, graph edge direction, access control in A* traversal
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**One-way direction encoding**
- Add `onewayReversed?: boolean` to `AdjacencyEdge` interface
- `buildAdjacency` sets `onewayReversed: true` on the reverse edge when a way is tagged `oneway=yes` (or `oneway=-1`, which means directed from last node to first)
- `buildAdjacency` always adds both directions to the adjacency list — no mode logic at build time
- `canUseEdge` handles all mode + tag logic for directionality (single place for all access rules)

**Bicycle one-way handling**
- Bikes respect `oneway=yes`/`oneway=-1` by default (same restriction as cars)
- Exception: if the edge is tagged `oneway:bicycle=no`, bikes are allowed in both directions (contraflow lane)
- `oneway=-1` is symmetric with `oneway=yes` — the reversed edge is `onewayReversed=true` and the same rules apply
- Pedestrians always bidirectional — ignore `onewayReversed` entirely

**Construction blocking**
- Block all modes (car, bicycle, pedestrian) for `highway=construction` or `construction=yes`
- Check lives in `canUseEdge` — consistent with existing `access=no` pattern, no graph rebuild needed

**Barrier handling**
- Mode-aware, edge-level only (check `barrier=*` on way tags in `AdjacencyEdge.tags`)
- `barrier=bollard` — blocks car only (bollards let bikes and peds through)
- `barrier=wall` / `barrier=fence` / `barrier=hedge` — blocks all modes
- `barrier=gate` / `barrier=lift_gate` — blocks car by default; access tag overrides still apply
- Node-level barrier nodes not implemented (OSM barrier nodes require separate node tag data — out of scope)

### Claude's Discretion
- Exact set of barrier values to treat as "blocks all" vs "blocks car only" (follow common OSM practice)
- Whether `cycle_barrier` or `kissing_gate` need separate handling (can include if straightforward)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 5 is a pure logic enhancement to two existing functions: `buildAdjacency` in `graphBuilder.ts` and `canUseEdge` in `router.ts`. No UI changes, no new files, no data pipeline changes. The work is straightforward TypeScript: add one optional field to the `AdjacencyEdge` interface, detect `oneway` tags during graph build, and add guards in `canUseEdge` for direction, construction, and barrier tags.

The OSM data model for one-way streets is settled and stable. `oneway=yes` means travel in the way's node-sequence direction only; `oneway=-1` means travel in the reverse direction only (i.e., the forward edge `A→B` is the blocked direction, and the stored reverse edge `B→A` is the one that should be flagged `onewayReversed=true`). The architecture decision to build a full bidirectional graph and filter at traversal time (in `canUseEdge`) is the correct and canonical approach — it avoids rebuilding the graph when the routing mode changes.

The signature change to `canUseEdge` is the one integration risk: the function currently receives `tags` alone; it now needs `onewayReversed` to enforce directionality. The CONTEXT.md decision is to pass the full edge object rather than individual fields, which requires updating the call site in `aStar` at `router.ts:160`.

**Primary recommendation:** Implement in two sequential tasks — (1) `AdjacencyEdge` + `buildAdjacency` changes with tests, (2) `canUseEdge` signature update + all new tag checks (oneway direction, construction, barriers) with tests. The `aStar` call-site fix is part of task 2.

---

## Standard Stack

No new libraries needed. All work is within existing TypeScript/Vitest project.

### Core (existing)
| File | Current State | Phase 5 Change |
|------|--------------|----------------|
| `src/lib/router.ts` | `AdjacencyEdge`, `canUseEdge`, `aStar` | Add `onewayReversed?` to interface; update `canUseEdge` signature and body; update `aStar` call site |
| `src/lib/graphBuilder.ts` | `buildAdjacency` builds bidirectional edges | Detect `oneway=yes`/`oneway=-1`; set `onewayReversed: true` on the flagged reverse edge |
| `src/__tests__/router.test.ts` | Tests for `canUseEdge` and `aStar` | Add cases: oneway blocking, construction blocking, barrier blocking, bicycle contraflow |
| `src/__tests__/graphBuilder.test.ts` | Tests for `buildAdjacency` | Add cases: `onewayReversed` flag on correct edge for `oneway=yes` and `oneway=-1` |

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config | `vite.config.ts` (test block, jsdom environment) |
| Quick run | `npx vitest run src/__tests__/router.test.ts src/__tests__/graphBuilder.test.ts` |
| Full suite | `npx vitest run` |

---

## Architecture Patterns

### Pattern 1: `onewayReversed` Flag on the Reverse Edge

The key insight is which edge gets flagged. For `oneway=yes` on a way with node sequence `[A, B]`:
- Forward edge `A→B`: allowed for cars/bikes — `onewayReversed` absent (or `false`)
- Reverse edge `B→A`: blocked for cars/bikes — `onewayReversed: true`

For `oneway=-1` on the same way `[A, B]` (travel is B→A only):
- Forward edge `A→B`: blocked — `onewayReversed: true`
- Reverse edge `B→A`: allowed — `onewayReversed` absent (or `false`)

```typescript
// buildAdjacency — pseudocode for oneway detection
const isOneway = way.tags['oneway'] === 'yes'
const isOnewayReversed = way.tags['oneway'] === '-1'

const edgeAB: AdjacencyEdge = {
  to: idB, weight, tags: way.tags,
  onewayReversed: isOnewayReversed ? true : undefined,
}
const edgeBA: AdjacencyEdge = {
  to: idA, weight, tags: way.tags,
  onewayReversed: isOneway ? true : undefined,
}
```

### Pattern 2: `canUseEdge` Signature Update

CONTEXT.md decision: pass the full edge object to `canUseEdge` so it can read both `tags` and `onewayReversed`.

```typescript
// Before (current):
export function canUseEdge(tags: Record<string, string>, mode: RoutingMode): boolean

// After:
export function canUseEdge(edge: AdjacencyEdge, mode: RoutingMode): boolean
```

The single call site in `aStar`:
```typescript
// Before (router.ts:160):
if (!canUseEdge(edge.tags, mode)) continue

// After:
if (!canUseEdge(edge, mode)) continue
```

The test files also call `canUseEdge` directly. Existing test calls pass `{ highway: 'motorway' }` etc. These need updating to wrap in a minimal `AdjacencyEdge` shape, or the function can accept an object with at least `tags` and optional `onewayReversed`. The cleanest approach: accept `AdjacencyEdge` directly, since tests can construct `{ to: '', weight: 0, tags: {...} }`.

### Pattern 3: `canUseEdge` Body — New Check Order

All new checks follow the existing pattern (early-return `false`). Recommended order inside `canUseEdge`:

```typescript
export function canUseEdge(edge: AdjacencyEdge, mode: RoutingMode): boolean {
  const { tags, onewayReversed } = edge
  const highway = tags['highway'] ?? ''

  // 1. Construction — block all modes
  if (highway === 'construction' || tags['construction'] === 'yes') return false

  // 2. Highway type access matrix (existing)
  const allowed = HIGHWAY_ACCESS[highway]
  if (allowed !== undefined && !allowed.has(mode)) return false

  // 3. access=no (existing)
  if (tags['access'] === 'no') return false

  // 4. Mode-specific tag overrides (existing)
  if (tags['foot'] === 'no' && mode === 'pedestrian') return false
  if (tags['bicycle'] === 'no' && mode === 'bicycle') return false
  if (tags['motor_vehicle'] === 'no' && mode === 'car') return false

  // 5. Barrier check (new)
  const barrier = tags['barrier']
  if (barrier) {
    const blocksAll = barrier === 'wall' || barrier === 'fence' || barrier === 'hedge'
    const blocksCar = barrier === 'bollard' || barrier === 'gate' || barrier === 'lift_gate'
    if (blocksAll) return false
    if (blocksCar && mode === 'car') return false
  }

  // 6. Oneway direction check (new)
  if (onewayReversed) {
    if (mode === 'car') return false
    if (mode === 'bicycle' && tags['oneway:bicycle'] !== 'no') return false
    // pedestrian: always allowed regardless of onewayReversed
  }

  return true
}
```

### Anti-Patterns to Avoid

- **Mode logic in `buildAdjacency`:** The graph builder must remain mode-agnostic. Only `canUseEdge` knows about modes. If you add `if (mode === 'car')` to `buildAdjacency`, you either need a mode parameter (breaking the existing test contract) or build separate graphs per mode (expensive and unnecessary).
- **Mutating shared edge objects:** `buildAdjacency` already creates separate `edgeAB` and `edgeBA` objects, so setting `onewayReversed` on one does not affect the other. Verify this — do not assign the same object to both directions.
- **Passing `onewayReversed` in tags:** Do not encode this flag as a tag string (`tags['_onewayReversed'] = 'true'`). It belongs on the typed interface, not inside the untyped tag bag.
- **Updating existing passing tests:** The `canUseEdge` signature change will break existing test calls. The fix is mechanical — wrap test tag objects in minimal edge shapes. Do not suppress TypeScript errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Oneway direction graph | Directed-only graph with separate build per mode | `onewayReversed` flag + `canUseEdge` filter | Mode-agnostic graph is already built; rebuilding per mode is O(N) overhead every mode switch |
| Barrier node lookup | Node tag data pipeline | Edge-level `barrier=*` tag on way | Node barriers are out of scope; way-level barriers cover the common cases in OSM data |
| Construction zones | Separate "closed" edge type | `highway=construction` check in `canUseEdge` | Stays consistent with existing `access=no` pattern |

---

## Common Pitfalls

### Pitfall 1: `oneway=-1` Direction Confusion

**What goes wrong:** Developer flags the wrong edge. For `oneway=-1` on way `[A,B]`, travel is permitted B→A only. The edge that should be blocked is `A→B` (the forward edge), not `B→A`.

**Why it happens:** `oneway=yes` blocks the reverse edge `B→A`, so intuition says "`-1` also blocks the reverse edge." Wrong — `-1` reverses the entire meaning.

**How to avoid:** Write a dedicated test: for `oneway=-1` on way `[X, Y]`, verify that `adjacency['X']` contains an edge to `Y` with `onewayReversed: true`, and `adjacency['Y']` contains an edge to `X` with `onewayReversed` absent/false.

**Warning signs:** Car route from B to A still works (correct), but car route from A to B also works (incorrect).

### Pitfall 2: Existing `canUseEdge` Tests Break on Signature Change

**What goes wrong:** Current test calls are `canUseEdge({ highway: 'motorway' }, 'car')`. After the signature change to accept `AdjacencyEdge`, TypeScript will reject these calls (missing `to` and `weight` fields).

**Why it happens:** The signature change is intentional but the existing tests predate it.

**How to avoid:** Update all existing `canUseEdge` test calls to pass a full (or partial-but-typed) `AdjacencyEdge` object. Since `to` and `weight` are not read by `canUseEdge`, a minimal fixture `{ to: '', weight: 0, tags: {...} }` is sufficient. Do this in the same task as the signature change — do not leave tests broken between commits.

### Pitfall 3: `cycle_barrier` and `kissing_gate` Ambiguity

**What goes wrong:** `cycle_barrier` slows bikes but may not stop them; `kissing_gate` permits pedestrians but blocks bikes and cars. Mis-classifying either causes incorrect routing.

**Why it happens:** These are less common barrier types with nuanced access semantics.

**How to avoid (Claude's discretion):** Per CONTEXT.md, include these if straightforward:
- `cycle_barrier`: blocks car; does NOT block bicycle or pedestrian (it slows bikes but they can pass). Add to `blocksCar` set.
- `kissing_gate`: permits pedestrians only. Add: blocks car AND bicycle, allow pedestrian.

Add a test for each if included.

### Pitfall 4: `highway=construction` vs `construction=yes` Semantics

**What goes wrong:** `highway=construction` tags a way whose highway type is currently under construction (the whole way is closed). `construction=yes` is sometimes used as a supplementary tag. In practice `highway=construction` is the primary signal.

**How to avoid:** Check both as CONTEXT.md specifies, but note that `construction=yes` as a standalone tag (without `highway=construction`) is unusual. The check `highway === 'construction' || tags['construction'] === 'yes'` is correct and safe.

---

## Code Examples

Verified patterns from existing codebase:

### Existing `canUseEdge` call site in `aStar`
```typescript
// src/lib/router.ts:160 (current)
for (const edge of neighbors) {
  if (!canUseEdge(edge.tags, mode)) continue
  // ...
}
```

After signature update becomes:
```typescript
for (const edge of neighbors) {
  if (!canUseEdge(edge, mode)) continue
  // ...
}
```

### Existing `buildAdjacency` edge creation pattern
```typescript
// src/lib/graphBuilder.ts:112-115 (current)
const edgeAB: AdjacencyEdge = { to: idB, weight, tags: way.tags }
const edgeBA: AdjacencyEdge = { to: idA, weight, tags: way.tags }

adjacency[idA].push(edgeAB)
adjacency[idB].push(edgeBA)
```

These are separate objects — safe to set `onewayReversed` on one without affecting the other.

### Test fixture pattern for updated `canUseEdge` signature
```typescript
// Minimal AdjacencyEdge fixture for tests
const edge = (tags: Record<string, string>, onewayReversed?: boolean): AdjacencyEdge =>
  ({ to: '', weight: 0, tags, onewayReversed })

// Usage:
expect(canUseEdge(edge({ highway: 'motorway' }), 'car')).toBe(true)
expect(canUseEdge(edge({ highway: 'primary' }, true), 'car')).toBe(false)
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vite.config.ts` (test block) |
| Quick run command | `npx vitest run src/__tests__/router.test.ts src/__tests__/graphBuilder.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `buildAdjacency` sets `onewayReversed: true` on correct edge for `oneway=yes` | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ✅ (needs new cases) |
| `buildAdjacency` sets `onewayReversed: true` on correct edge for `oneway=-1` | unit | `npx vitest run src/__tests__/graphBuilder.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks car on `onewayReversed=true` edge | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks bicycle on `onewayReversed=true` when `oneway:bicycle` absent | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` allows bicycle on `onewayReversed=true` when `oneway:bicycle=no` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` allows pedestrian on `onewayReversed=true` edge | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks all modes for `highway=construction` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks all modes for `construction=yes` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks car for `barrier=bollard`, allows bike and ped | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks all modes for `barrier=wall` / `fence` / `hedge` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| `canUseEdge` blocks car for `barrier=gate` and `barrier=lift_gate` | unit | `npx vitest run src/__tests__/router.test.ts` | ✅ (needs new cases) |
| Existing `canUseEdge` and `aStar` tests still pass after signature change | regression | `npx vitest run src/__tests__/router.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/router.test.ts src/__tests__/graphBuilder.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure (Vitest, jsdom, setup.ts) covers all phase requirements. New test cases go into existing `router.test.ts` and `graphBuilder.test.ts` files.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Directed-only graph (omit reverse edges for one-ways) | Full bidirectional graph + filter at traversal | Current approach is standard; easier mode switching, correct for pedestrians |
| Encode direction in separate "direction" field | `onewayReversed?: boolean` optional flag | Minimal interface footprint; absent = no restriction |

**Canonical OSM oneway tag values (verified):**
- `oneway=yes` — travel in way's node-sequence direction
- `oneway=-1` — travel in reverse of node-sequence direction (prefer re-drawing way in OSM, but must handle in data)
- `oneway=no` — explicitly NOT a one-way (rare, ignore in routing)
- `oneway:bicycle=no` — bicycle contraflow exemption on a one-way street

---

## Open Questions

1. **`cycle_barrier` and `kissing_gate` inclusion**
   - What we know: `cycle_barrier` blocks car, slows but passes bikes; `kissing_gate` pedestrian-only
   - What's unclear: Frequency in real OSM data — uncommon enough that test ROI is low
   - Recommendation: Include both if the barrier check block stays clean (2 extra lines each). If it clutters the logic, defer to a follow-up.

2. **`access` tag overrides for `barrier=gate`**
   - What we know: CONTEXT.md says "access tag overrides still apply" for gate/lift_gate
   - What's unclear: Exact override priority — does `access=yes` on the edge override the gate block?
   - Recommendation: The existing `access=no` check already handles the "block" direction. For `access=yes` overriding a gate, that would require checking `access=yes` before the barrier check. Since this is a portfolio project and `access=yes` on a way-level barrier is rare, skip the override for now and document as known limitation.

---

## Sources

### Primary (HIGH confidence)
- OSM Wiki — Key:oneway (https://wiki.openstreetmap.org/wiki/Key:oneway): confirms `yes`, `-1`, `no` values and bicycle contraflow tagging
- OSM Wiki — Key:oneway:bicycle (https://wiki.openstreetmap.org/wiki/Key:oneway:bicycle): confirms `oneway:bicycle=no` for contraflow exemption
- OSM Wiki — Key:barrier (https://wiki.openstreetmap.org/wiki/Key:barrier): confirms bollard = car blocked, bikes/peds pass; wall/fence = all blocked; gate = mode-dependent
- Existing codebase — `router.ts`, `graphBuilder.ts`, test files: interface shapes, call sites, test patterns

### Secondary (MEDIUM confidence)
- OSM Wiki — Barriers page (https://wiki.openstreetmap.org/wiki/Barriers): bollard defaults `access=no, foot=yes, bicycle=yes`
- Tag:barrier=bollard (https://wiki.openstreetmap.org/wiki/Tag:barrier=bollard): confirms pedestrian and bicycle pass

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing TypeScript/Vitest project
- Architecture: HIGH — decisions locked in CONTEXT.md; call-site analysis done from actual source
- OSM tag semantics: HIGH — verified against OSM Wiki official pages
- Pitfalls: HIGH — derived from code analysis and OSM tag edge cases
- Barrier discretionary values (cycle_barrier, kissing_gate): MEDIUM — OSM Wiki confirms semantics but inclusion is discretionary

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (OSM tag semantics are stable; no external dependencies)
