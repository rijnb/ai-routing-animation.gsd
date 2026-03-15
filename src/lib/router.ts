/**
 * router.ts — A* pathfinding engine for mode-aware routing on OSM road graphs.
 */

export type RoutingMode = 'car' | 'bicycle' | 'pedestrian'

export interface AdjacencyEdge {
  to: string
  weight: number // meters (haversine)
  tags: Record<string, string>
  onewayReversed?: boolean
}

export type AdjacencyList = Record<string, AdjacencyEdge[]>

export interface RouteResult {
  path: [number, number][] // lon/lat coordinates of optimal path
  searchHistory: string[] // node IDs in exploration order (for Phase 3)
  distance: number // total meters
  found: boolean
}

/**
 * haversineMeters — computes great-circle distance in meters between two [lon, lat] points.
 * R = 6371e3 meters (Earth radius).
 */
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371e3
  const lonA = a[0]
  const latA = a[1]
  const lonB = b[0]
  const latB = b[1]
  const phi1 = (latA * Math.PI) / 180
  const phi2 = (latB * Math.PI) / 180
  const dPhi = ((latB - latA) * Math.PI) / 180
  const dLambda = ((lonB - lonA) * Math.PI) / 180
  const sinPhi = Math.sin(dPhi / 2)
  const sinLambda = Math.sin(dLambda / 2)
  const hav = sinPhi * sinPhi + Math.cos(phi1) * Math.cos(phi2) * sinLambda * sinLambda
  return 2 * R * Math.asin(Math.sqrt(hav))
}

// OSM highway access matrix
// Each entry lists which modes are allowed by default for that highway type.
const HIGHWAY_ACCESS: Record<string, Set<RoutingMode>> = {
  motorway: new Set(['car']),
  motorway_link: new Set(['car']),
  trunk: new Set(['car']),
  trunk_link: new Set(['car']),
  primary: new Set(['car', 'bicycle', 'pedestrian']),
  primary_link: new Set(['car', 'bicycle', 'pedestrian']),
  secondary: new Set(['car', 'bicycle', 'pedestrian']),
  secondary_link: new Set(['car', 'bicycle', 'pedestrian']),
  tertiary: new Set(['car', 'bicycle', 'pedestrian']),
  tertiary_link: new Set(['car', 'bicycle', 'pedestrian']),
  unclassified: new Set(['car', 'bicycle', 'pedestrian']),
  residential: new Set(['car', 'bicycle', 'pedestrian']),
  service: new Set(['car', 'bicycle', 'pedestrian']),
  living_street: new Set(['car', 'bicycle', 'pedestrian']),
  pedestrian: new Set(['pedestrian']),
  footway: new Set(['pedestrian']),
  cycleway: new Set(['bicycle', 'pedestrian']),
  path: new Set(['bicycle', 'pedestrian']),
  steps: new Set(['pedestrian']),
  track: new Set(['bicycle', 'pedestrian']),
  bridleway: new Set(['pedestrian']),
}

/**
 * canUseEdge — determines if a road edge is accessible for the specified
 * routing mode. Checks construction blocking, highway access matrix, tag
 * overrides, barrier blocking, and oneway direction enforcement.
 */
export function canUseEdge(
  edge: AdjacencyEdge,
  mode: RoutingMode,
): boolean {
  const { tags, onewayReversed } = edge
  const highway = tags['highway'] ?? ''

  // 1. Construction — block all modes
  if (highway === 'construction' || tags['construction'] === 'yes') return false

  // 2. access=no — blocks all modes regardless of other tags
  const access = tags['access']
  if (access === 'no') return false

  // 3. Positive tag grants — explicit OSM permission overrides the highway matrix.
  // If a road is tagged foot=yes or foot=designated, pedestrians may use it regardless
  // of the highway type (e.g. a cycleway with foot=yes is a shared path).
  // If a road is tagged bicycle=yes or bicycle=designated, cyclists may use it regardless.
  const foot = tags['foot']
  const bicycle = tags['bicycle']
  if (mode === 'pedestrian' && (foot === 'yes' || foot === 'designated')) {
    // Still enforce foot=no (checked later) — but grant passes the highway matrix.
    // Fall through to barrier/oneway checks below.
  } else if (mode === 'bicycle' && (bicycle === 'yes' || bicycle === 'designated')) {
    // Same: grant passes the highway matrix; fall through to barrier/oneway checks.
  } else {
    // 4. Highway type access matrix (only applied when no positive grant)
    const allowed = HIGHWAY_ACCESS[highway]
    if (allowed !== undefined && !allowed.has(mode)) return false
  }

  // 5. Remaining mode-specific tag overrides (negative)
  // Private/restricted access: block motorised vehicle routing.
  // access=private, access=destination, access=permit, access=customers all
  // indicate roads that should not be used as general through-routes by cars.
  if (mode === 'car' && (access === 'private' || access === 'destination' || access === 'permit' || access === 'customers')) return false
  if (tags['vehicle'] === 'no' && mode !== 'pedestrian') return false
  if (tags['foot'] === 'no' && mode === 'pedestrian') return false
  if (tags['bicycle'] === 'no' && mode === 'bicycle') return false
  if (tags['motor_vehicle'] === 'no' && mode === 'car') return false
  if (tags['motorcar'] === 'no' && mode === 'car') return false

  // 6. Barrier check
  const barrier = tags['barrier']
  if (barrier) {
    const blocksAll = barrier === 'wall' || barrier === 'fence' || barrier === 'hedge'
                   || barrier === 'jersey_barrier'
    const blocksCar = barrier === 'bollard' || barrier === 'gate' || barrier === 'lift_gate'
                   || barrier === 'cycle_barrier' || barrier === 'pole' || barrier === 'block'
                   || barrier === 'chain' || barrier === 'planter'
    const blocksCarAndBike = barrier === 'kissing_gate' || barrier === 'stile'
                          || barrier === 'turnstile'
    if (blocksAll) return false
    if (blocksCarAndBike && (mode === 'car' || mode === 'bicycle')) return false
    if (blocksCar && mode === 'car') return false
  }

  // 7. Oneway direction check
  if (onewayReversed) {
    if (mode === 'car') return false
    if (mode === 'bicycle' && tags['oneway:bicycle'] !== 'no') return false
    // pedestrian: always allowed regardless of onewayReversed
  }

  return true
}

/**
 * ROAD_COST_FACTOR — mode-specific edge cost multipliers for A* routing.
 *
 * Multipliers discourage routing modes from using infrastructure that is
 * technically accessible but not preferred. A factor of 1.0 means the edge
 * is ideal for the given mode; higher values make A* prefer other routes.
 *
 * Pedestrian: strongly prefers footways / pedestrian streets / paths over
 *   car-class roads. Car roads are accessible (pedestrians can walk along them)
 *   but are penalised so that parallel footways are chosen instead.
 *
 * Bicycle: moderately prefers cycling infrastructure over car roads.
 *
 * Car: flat 1.0 — routing purely by distance.
 */
const ROAD_COST_FACTOR: Record<string, Partial<Record<RoutingMode, number>>> = {
  // Dedicated pedestrian/shared infrastructure — ideal for pedestrians
  footway:          { pedestrian: 1.0, bicycle: 10.0 },
  pedestrian:       { pedestrian: 1.0, bicycle: 10.0 },
  steps:            { pedestrian: 1.2 },
  bridleway:        { pedestrian: 1.0 },
  // Shared cycling/pedestrian infrastructure
  cycleway:         { bicycle: 1.0, pedestrian: 1.2 }, // only reachable by pedestrian if foot=yes
  path:             { pedestrian: 1.0, bicycle: 1.0 },
  track:            { pedestrian: 1.0, bicycle: 1.0 },
  // Low-traffic streets — usable but mildly penalised for pedestrians
  living_street:    { pedestrian: 1.2, bicycle: 1.0, car: 1.0 },
  residential:      { pedestrian: 2.0, bicycle: 1.2, car: 1.0 },
  service:          { pedestrian: 2.0, bicycle: 1.2, car: 1.0 },
  unclassified:     { pedestrian: 2.5, bicycle: 1.3, car: 1.0 },
  // Car-class roads — accessible to pedestrians and cyclists but heavily penalised
  tertiary:         { pedestrian: 3.0, bicycle: 1.5, car: 1.0 },
  tertiary_link:    { pedestrian: 3.0, bicycle: 1.5, car: 1.0 },
  secondary:        { pedestrian: 4.0, bicycle: 2.0, car: 1.0 },
  secondary_link:   { pedestrian: 4.0, bicycle: 2.0, car: 1.0 },
  primary:          { pedestrian: 5.0, bicycle: 2.5, car: 1.0 },
  primary_link:     { pedestrian: 5.0, bicycle: 2.5, car: 1.0 },
  // Motorway/trunk: inaccessible to pedestrians and cyclists (enforced by canUseEdge)
  motorway:         { car: 1.0 },
  motorway_link:    { car: 1.0 },
  trunk:            { car: 1.0 },
  trunk_link:       { car: 1.0 },
}

/**
 * edgeCost — returns the mode-specific effective cost for traversing an edge.
 * Multiplies haversine distance by a preference factor so A* routes pedestrians
 * and cyclists through appropriate infrastructure even when car roads are shorter.
 *
 * Virtual edges (no highway tag) use raw distance — they are always passable.
 */
export function edgeCost(edge: AdjacencyEdge, mode: RoutingMode): number {
  const highway = edge.tags['highway']
  if (!highway) return edge.weight // virtual edge

  const factors = ROAD_COST_FACTOR[highway]
  const factor = factors?.[mode] ?? 1.0
  return edge.weight * factor
}

/**
 * aStar — finds the shortest path between two nodes in an adjacency list using
 * the A* algorithm with a haversine heuristic. Records the full search history
 * for animation.
 */
export function aStar(
  adjacency: AdjacencyList,
  startId: string,
  goalId: string,
  nodes: Map<string, [number, number]>,
  mode: RoutingMode,
): RouteResult {
  const goalCoord = nodes.get(goalId)
  if (!goalCoord) {
    return { path: [], searchHistory: [], distance: 0, found: false }
  }

  const startCoord = nodes.get(startId)
  if (!startCoord) {
    return { path: [], searchHistory: [], distance: 0, found: false }
  }

  const openSet = new Set<string>([startId])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[startId, 0]])
  const fScore = new Map<string, number>([
    [startId, haversineMeters(startCoord, goalCoord)],
  ])
  const searchHistory: string[] = []

  while (openSet.size > 0) {
    // Pick node with lowest fScore from open set
    let current: string | null = null
    let lowestF = Infinity
    for (const node of openSet) {
      const f = fScore.get(node) ?? Infinity
      if (f < lowestF) {
        lowestF = f
        current = node
      }
    }

    if (current === null) break

    searchHistory.push(current)
    openSet.delete(current)

    if (current === goalId) {
      // Reconstruct path
      const path: [number, number][] = []
      let node: string | undefined = current
      while (node !== undefined) {
        const coord = nodes.get(node)
        if (coord) path.unshift(coord)
        node = cameFrom.get(node)
      }
      // Compute physical distance (sum of haversine between consecutive path coords).
      // gScore uses cost-weighted values for pathfinding; physical distance is separate.
      let physicalDistance = 0
      for (let i = 1; i < path.length; i++) {
        physicalDistance += haversineMeters(path[i - 1], path[i])
      }
      return {
        path,
        searchHistory,
        distance: physicalDistance,
        found: true,
      }
    }

    const neighbors = adjacency[current] ?? []
    const currentG = gScore.get(current) ?? Infinity

    for (const edge of neighbors) {
      if (!canUseEdge(edge, mode)) continue

      const tentativeG = currentG + edgeCost(edge, mode)
      const neighborG = gScore.get(edge.to) ?? Infinity

      if (tentativeG < neighborG) {
        cameFrom.set(edge.to, current)
        gScore.set(edge.to, tentativeG)
        const neighborCoord = nodes.get(edge.to)
        const h = neighborCoord ? haversineMeters(neighborCoord, goalCoord) : 0
        fScore.set(edge.to, tentativeG + h)
        openSet.add(edge.to)
      }
    }
  }

  return { path: [], searchHistory, distance: 0, found: false }
}
