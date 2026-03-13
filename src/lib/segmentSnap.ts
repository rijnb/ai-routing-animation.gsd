/**
 * segmentSnap.ts — point-to-segment snapping for OSM road networks.
 *
 * Given a raw click lon/lat, finds the nearest road segment edge permitted for
 * the current routing mode within maxDistanceMeters, and projects the click
 * onto it (returning the interpolated point on the segment).
 */

import type { OsmGraph } from './osmParser'
import { haversineMeters, canUseEdge } from './router'
import type { RoutingMode } from './router'

export interface SnapResult {
  snappedPoint: [number, number] // lon/lat of projected point on segment
  segmentNodeA: string
  segmentNodeB: string
  t: number // [0,1] along segment
  distanceMeters: number
}

/**
 * projectPointOnSegment — projects point p onto the line segment [a, b].
 * Uses flat-Earth approximation with cosine correction for longitude.
 *
 * Returns the projected point and parameter t ∈ [0, 1] along the segment.
 */
function projectPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): { projected: [number, number]; t: number } {
  // Use the latitude midpoint for cosine correction
  const latMid = ((a[1] + b[1]) / 2 * Math.PI) / 180
  const cosLat = Math.cos(latMid)

  // Scaled coordinates (treating each degree as equal in "flat" space)
  const px = p[0] * cosLat
  const py = p[1]
  const ax = a[0] * cosLat
  const ay = a[1]
  const bx = b[0] * cosLat
  const by = b[1]

  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy

  let t: number
  if (lenSq === 0) {
    t = 0
  } else {
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
  }

  const projLon = a[0] + t * (b[0] - a[0])
  const projLat = a[1] + t * (b[1] - a[1])

  return { projected: [projLon, projLat], t }
}

/**
 * snapToNearestSegment — projects clickPoint onto the nearest accessible road
 * segment within maxDistanceMeters, filtered by routing mode.
 *
 * Returns null if no road segment is within range or all nearby segments are
 * inaccessible for the given mode.
 */
export function snapToNearestSegment(
  clickPoint: [number, number],
  graph: OsmGraph,
  mode: RoutingMode,
  maxDistanceMeters: number,
): SnapResult | null {
  let best: SnapResult | null = null

  for (const way of graph.ways) {
    // Filter by routing mode
    if (!canUseEdge(way.tags, mode)) continue

    for (let i = 0; i < way.nodeRefs.length - 1; i++) {
      const idA = way.nodeRefs[i]
      const idB = way.nodeRefs[i + 1]
      const coordA = graph.nodes.get(idA)
      const coordB = graph.nodes.get(idB)
      if (!coordA || !coordB) continue

      const { projected, t } = projectPointOnSegment(clickPoint, coordA, coordB)
      const dist = haversineMeters(clickPoint, projected)

      if (dist <= maxDistanceMeters) {
        if (best === null || dist < best.distanceMeters) {
          best = {
            snappedPoint: projected,
            segmentNodeA: idA,
            segmentNodeB: idB,
            t,
            distanceMeters: dist,
          }
        }
      }
    }
  }

  return best
}
