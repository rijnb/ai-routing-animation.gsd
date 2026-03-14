---
created: 2026-03-14T12:17:10.000Z
title: Add Phase 5 requirements to REQUIREMENTS.md
area: planning
files:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
---

## Problem

Phase 5 (one-way streets and access restrictions) introduced 6 new requirement IDs that are referenced in ROADMAP.md and plan frontmatters but were never formally added to REQUIREMENTS.md:

- ONEWAY-01: AdjacencyEdge interface includes `onewayReversed?: boolean`
- ONEWAY-02: buildAdjacency detects `oneway=yes`/`-1` and flags the blocked-direction edge
- ONEWAY-03: Cars cannot traverse a `onewayReversed=true` edge
- ONEWAY-04: Bikes blocked on `onewayReversed=true` unless `oneway:bicycle=no`; pedestrians always pass
- BARRIER-01: Mode-specific barrier blocking (bollard/gate block car; wall/fence block all; kissing_gate blocks car+bike)
- CONSTRUCTION-01: All modes blocked on `highway=construction` or `construction=yes`

All 6 are fully implemented (router.ts, graphBuilder.ts) and verified (Phase 5 VERIFICATION.md: passed, 8/8). The gap is documentation only.

Found during v1.0 milestone audit (2026-03-14).

## Solution

Add a new "One-Way and Access Restrictions" section under the v1 requirements in REQUIREMENTS.md with all 6 IDs marked `[x]`. Add them to the traceability table pointing to Phase 5 with status "Complete". Update the coverage count from 17 to 23.
