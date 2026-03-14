import type { FeatureCollection, LineString } from 'geojson'
import type { OsmWay } from './osmParser'
import type { AdjacencyList, AdjacencyEdge } from './router'
import { haversineMeters } from './router'

/**
 * buildRoadGeoJson — converts parsed OSM ways + nodes into a GeoJSON FeatureCollection.
 * Each Feature has a LineString geometry and properties.highway set from the OSM tag.
 */
export function buildRoadGeoJson(
  ways: OsmWay[],
  nodes: Map<string, [number, number]>,
): FeatureCollection<LineString> {
  const features = ways.map((way) => {
    const coords: [number, number][] = way.nodeRefs
      .map((ref) => nodes.get(ref))
      .filter(Boolean) as [number, number][]

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: coords,
      },
      properties: {
        highway: way.tags['highway'] ?? '',
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

/**
 * ComponentMap — maps each nodeId to the root representative ID (from union-find).
 */
export interface ComponentMap {
  [nodeId: string]: string
}

/**
 * UnionFind — path-compressed union-find (disjoint set) data structure.
 * Private to this module.
 */
class UnionFind {
  private parent = new Map<string, string>()

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
    }
    const p = this.parent.get(x)!
    if (p !== x) {
      const root = this.find(p)
      this.parent.set(x, root)
      return root
    }
    return x
  }

  union(a: string, b: string): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB)
    }
  }

  sameComponent(a: string, b: string): boolean {
    return this.find(a) === this.find(b)
  }
}

/**
 * buildAdjacency — builds an undirected weighted adjacency list from OSM ways + nodes,
 * and runs union-find component detection.
 *
 * Accepts (ways, nodes) as two separate arguments to match the test contract.
 * Optional barrierNodes maps nodeId → barrier value for nodes that carry a barrier
 * tag in OSM (barriers are almost always on nodes, not on ways).
 *
 * For each edge A→B, if node B has a barrier tag, that barrier is merged into the
 * edge's tags so canUseEdge() can enforce it. Similarly for edge B→A with node A.
 *
 * Returns:
 *   adjacency   — bidirectional edge list with haversine-distance weights
 *   componentMap — nodeId → root representative ID
 *   sameComponent — convenience function: (a, b) => boolean
 */
export function buildAdjacency(
  ways: OsmWay[],
  nodes: Map<string, [number, number]>,
  barrierNodes?: Map<string, string>,
): {
  adjacency: AdjacencyList
  componentMap: ComponentMap
  sameComponent: (a: string, b: string) => boolean
} {
  const adjacency: AdjacencyList = {}
  const uf = new UnionFind()

  for (const way of ways) {
    for (let i = 0; i < way.nodeRefs.length - 1; i++) {
      const idA = way.nodeRefs[i]
      const idB = way.nodeRefs[i + 1]
      const coordA = nodes.get(idA)
      const coordB = nodes.get(idB)
      if (!coordA || !coordB) continue

      const weight = haversineMeters(coordA, coordB)

      if (!adjacency[idA]) adjacency[idA] = []
      if (!adjacency[idB]) adjacency[idB] = []

      const isOneway = way.tags['oneway'] === 'yes'
      const isOnewayMinus1 = way.tags['oneway'] === '-1'

      // Merge node-level barrier tags into edge tags.
      // A barrier node blocks traversal across it: the edge leading INTO the barrier
      // node carries the barrier (A→B has barrier from B; B→A has barrier from A).
      const barrierAtB = barrierNodes?.get(idB)
      const barrierAtA = barrierNodes?.get(idA)

      const tagsAB: Record<string, string> = barrierAtB
        ? { ...way.tags, barrier: barrierAtB }
        : way.tags
      const tagsBA: Record<string, string> = barrierAtA
        ? { ...way.tags, barrier: barrierAtA }
        : way.tags

      const edgeAB: AdjacencyEdge = {
        to: idB,
        weight,
        tags: tagsAB,
        onewayReversed: isOnewayMinus1 ? true : undefined,
      }
      const edgeBA: AdjacencyEdge = {
        to: idA,
        weight,
        tags: tagsBA,
        onewayReversed: isOneway ? true : undefined,
      }

      adjacency[idA].push(edgeAB)
      adjacency[idB].push(edgeBA)

      uf.union(idA, idB)
    }
  }

  // Build componentMap for all nodes
  const componentMap: ComponentMap = {}
  for (const id of nodes.keys()) {
    componentMap[id] = uf.find(id)
  }

  return {
    adjacency,
    componentMap,
    sameComponent: (a: string, b: string) => uf.sameComponent(a, b),
  }
}
