---
created: 2026-03-13T12:01:32.179Z
title: Improve routing to respect OSM road restrictions
area: general
files:
  - src/lib/router.ts
  - src/lib/graphBuilder.ts
---

## Problem

The current routing algorithm (`canUseEdge` + A*) handles basic mode filtering (motorway=car only, footway=pedestrian only, etc.) but does not fully respect OSM road restriction tags. Missing cases include:

- **One-way streets for cars** — `oneway=yes` / `oneway=-1` should block reverse traversal for car mode, but NOT for bicycle or pedestrian (cyclists/pedestrians can legally use one-way streets in both directions in many jurisdictions, or this should at least be configurable)
- **Blocked/closed roads** — `access=no`, `barrier=*`, `road=closed`, `construction=*`
- **Turn restrictions** — OSM relation type `restriction` (e.g. `no_left_turn`, `only_straight_on`) — these affect edge traversal at junctions
- **Conditional restrictions** — `oneway:conditional`, `access:conditional` (lower priority, complex to implement)

Without these, routes for car mode may go the wrong way down one-way streets, making the animation misleading.

## Solution

1. In `graphBuilder.ts` — when building the adjacency list, parse `oneway` tag and only add the directed edge (or both edges) based on mode. For car: respect `oneway`. For bike/pedestrian: add both directions regardless.
2. In `canUseEdge` in `router.ts` — add checks for `access=no`, `barrier`, `construction` tags.
3. Optionally: parse OSM turn restriction relations and encode them as edge penalties or removal during graph build.

Key OSM tags to handle:
- `oneway=yes` → car: forward only; bike/pedestrian: both directions
- `oneway=-1` → car: reverse only; bike/pedestrian: both directions
- `oneway:bicycle=no` → bicycle always bidirectional regardless of `oneway`
- `access=no` → block all modes unless overridden by mode-specific tag
