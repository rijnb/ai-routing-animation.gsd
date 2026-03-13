/**
 * router.ts — A* pathfinding engine for mode-aware routing on OSM road graphs.
 *
 * This file exports the types and stubs for Phase 2 (Plans 02-04 implement the logic).
 * Current state: RED stubs — all functions return empty/false values.
 */

export type RoutingMode = 'car' | 'bicycle' | 'pedestrian'

export interface AdjacencyEdge {
  to: string
  weight: number // meters (haversine)
  tags: Record<string, string>
}

export type AdjacencyList = Record<string, AdjacencyEdge[]>

export interface RouteResult {
  path: [number, number][] // lon/lat coordinates of optimal path
  searchHistory: string[] // node IDs in exploration order (for Phase 3)
  distance: number // total meters
  found: boolean
}

/**
 * canUseEdge — determines if a road edge with the given OSM tags is accessible
 * for the specified routing mode.
 *
 * Stub: always returns false (RED — to be implemented in Plan 02-02).
 */
export function canUseEdge(
  tags: Record<string, string>,
  mode: RoutingMode,
): boolean {
  void tags
  void mode
  return false
}

/**
 * aStar — finds the shortest path between two nodes in an adjacency list using
 * the A* algorithm with a haversine heuristic. Records the full search history
 * for Phase 3 animation.
 *
 * Stub: always returns not-found result (RED — to be implemented in Plan 02-02).
 */
export function aStar(
  adjacency: AdjacencyList,
  startId: string,
  goalId: string,
  nodes: Map<string, [number, number]>,
  mode: RoutingMode,
): RouteResult {
  void adjacency
  void startId
  void goalId
  void nodes
  void mode
  return { path: [], searchHistory: [], distance: 0, found: false }
}
