/**
 * segmentSnap.ts — point-to-segment snapping for OSM road networks.
 *
 * Given a raw click lon/lat, finds the nearest road segment edge permitted for
 * the current routing mode within maxDistanceMeters, and projects the click
 * onto it (returning the interpolated point on the segment).
 *
 * Current state: RED stubs — snapToNearestSegment always returns null.
 * Implementation in Plan 02-03.
 */

import type { OsmGraph } from './osmParser'
import type { RoutingMode } from './router'

export interface SnapResult {
  snappedPoint: [number, number] // lon/lat of projected point on segment
  segmentNodeA: string
  segmentNodeB: string
  t: number // [0,1] along segment
  distanceMeters: number
}

/**
 * snapToNearestSegment — projects clickPoint onto the nearest accessible road
 * segment within maxDistanceMeters, filtered by routing mode.
 *
 * Returns null if no road segment is within range or all nearby segments are
 * inaccessible for the given mode.
 *
 * Stub: always returns null (RED — to be implemented in Plan 02-03).
 */
export function snapToNearestSegment(
  clickPoint: [number, number],
  graph: OsmGraph,
  mode: RoutingMode,
  maxDistanceMeters: number,
): SnapResult | null {
  void clickPoint
  void graph
  void mode
  void maxDistanceMeters
  return null
}
