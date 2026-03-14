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
  cycleway: new Set(['bicycle']),
  path: new Set(['bicycle', 'pedestrian']),
  steps: new Set(['pedestrian']),
  track: new Set(['bicycle', 'pedestrian']),
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

  // 2. Highway type access matrix
  const allowed = HIGHWAY_ACCESS[highway]
  if (allowed !== undefined && !allowed.has(mode)) return false

  // 3. access=no and mode-specific tag overrides
  if (tags['access'] === 'no') return false
  if (tags['foot'] === 'no' && mode === 'pedestrian') return false
  if (tags['bicycle'] === 'no' && mode === 'bicycle') return false
  if (tags['motor_vehicle'] === 'no' && mode === 'car') return false

  // 4. Barrier check
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

  // 5. Oneway direction check
  if (onewayReversed) {
    if (mode === 'car') return false
    if (mode === 'bicycle' && tags['oneway:bicycle'] !== 'no') return false
    // pedestrian: always allowed regardless of onewayReversed
  }

  return true
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
      return {
        path,
        searchHistory,
        distance: gScore.get(goalId) ?? 0,
        found: true,
      }
    }

    const neighbors = adjacency[current] ?? []
    const currentG = gScore.get(current) ?? Infinity

    for (const edge of neighbors) {
      if (!canUseEdge(edge, mode)) continue

      const tentativeG = currentG + edge.weight
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
