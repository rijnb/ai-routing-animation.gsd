import { describe, it, expect } from 'vitest'
import { canUseEdge, aStar } from '../lib/router'
import type { AdjacencyList } from '../lib/router'

// ──────────────────────────────────────────────────────────────────────────────
// canUseEdge — OSM access matrix (source: RESEARCH.md Highway Type Access Matrix)
// ──────────────────────────────────────────────────────────────────────────────

describe('canUseEdge', () => {
  describe('motorway', () => {
    it('is accessible for car', () => {
      expect(canUseEdge({ highway: 'motorway' }, 'car')).toBe(true)
    })

    it('is NOT accessible for bicycle', () => {
      expect(canUseEdge({ highway: 'motorway' }, 'bicycle')).toBe(false)
    })

    it('is NOT accessible for pedestrian', () => {
      expect(canUseEdge({ highway: 'motorway' }, 'pedestrian')).toBe(false)
    })
  })

  describe('footway', () => {
    it('is NOT accessible for car', () => {
      expect(canUseEdge({ highway: 'footway' }, 'car')).toBe(false)
    })

    it('is NOT accessible for bicycle', () => {
      expect(canUseEdge({ highway: 'footway' }, 'bicycle')).toBe(false)
    })

    it('is accessible for pedestrian', () => {
      expect(canUseEdge({ highway: 'footway' }, 'pedestrian')).toBe(true)
    })
  })

  describe('cycleway', () => {
    it('is NOT accessible for car', () => {
      expect(canUseEdge({ highway: 'cycleway' }, 'car')).toBe(false)
    })

    it('is accessible for bicycle', () => {
      expect(canUseEdge({ highway: 'cycleway' }, 'bicycle')).toBe(true)
    })

    it('is NOT accessible for pedestrian', () => {
      expect(canUseEdge({ highway: 'cycleway' }, 'pedestrian')).toBe(false)
    })
  })

  describe('access=no override', () => {
    it('blocks car even on primary road', () => {
      expect(canUseEdge({ highway: 'primary', access: 'no' }, 'car')).toBe(false)
    })

    it('blocks bicycle even on cycleway', () => {
      expect(canUseEdge({ highway: 'cycleway', access: 'no' }, 'bicycle')).toBe(false)
    })

    it('blocks pedestrian even on footway', () => {
      expect(canUseEdge({ highway: 'footway', access: 'no' }, 'pedestrian')).toBe(false)
    })
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// aStar — pathfinding on simple synthetic graphs
// ──────────────────────────────────────────────────────────────────────────────

describe('aStar', () => {
  // 3-node triangle graph: A — B — C, all accessible to car
  // Nodes at approximate Amsterdam coordinates (lon/lat)
  const nodes = new Map<string, [number, number]>([
    ['A', [4.9000, 52.3700]], // ~origin
    ['B', [4.9010, 52.3700]], // ~750m east
    ['C', [4.9005, 52.3710]], // ~north-east
  ])

  const carTags = { highway: 'primary' }

  const triangleAdjacency: AdjacencyList = {
    A: [
      { to: 'B', weight: 743, tags: carTags },
      { to: 'C', weight: 890, tags: carTags },
    ],
    B: [
      { to: 'A', weight: 743, tags: carTags },
      { to: 'C', weight: 560, tags: carTags },
    ],
    C: [
      { to: 'A', weight: 890, tags: carTags },
      { to: 'B', weight: 560, tags: carTags },
    ],
  }

  it('finds a path from A to C on a 3-node triangle graph', () => {
    const result = aStar(triangleAdjacency, 'A', 'C', nodes, 'car')
    expect(result.found).toBe(true)
    expect(result.path.length).toBeGreaterThan(0)
  })

  it('path includes start and end coordinates', () => {
    const result = aStar(triangleAdjacency, 'A', 'C', nodes, 'car')
    expect(result.found).toBe(true)
    // Path must be non-empty array of [lon, lat] tuples
    expect(result.path.length).toBeGreaterThanOrEqual(2)
    for (const point of result.path) {
      expect(point).toHaveLength(2)
      expect(typeof point[0]).toBe('number')
      expect(typeof point[1]).toBe('number')
    }
  })

  it('searchHistory contains node IDs in exploration order', () => {
    const result = aStar(triangleAdjacency, 'A', 'C', nodes, 'car')
    expect(result.found).toBe(true)
    expect(result.searchHistory.length).toBeGreaterThan(0)
    // All history entries must be valid node IDs in the graph
    for (const nodeId of result.searchHistory) {
      expect(['A', 'B', 'C']).toContain(nodeId)
    }
  })

  it('returns found=false on a disconnected graph (no path A→Z)', () => {
    const disconnectedAdjacency: AdjacencyList = {
      A: [{ to: 'B', weight: 743, tags: carTags }],
      B: [{ to: 'A', weight: 743, tags: carTags }],
      // Z exists in nodes but has no edges connecting it to A or B
    }
    const disconnectedNodes = new Map<string, [number, number]>([
      ['A', [4.9000, 52.3700]],
      ['B', [4.9010, 52.3700]],
      ['Z', [5.0000, 53.0000]], // far away, isolated
    ])
    const result = aStar(disconnectedAdjacency, 'A', 'Z', disconnectedNodes, 'car')
    expect(result.found).toBe(false)
    expect(result.path).toEqual([])
  })

  it('searchHistory is non-empty even when no path found (explored some nodes)', () => {
    const disconnectedAdjacency: AdjacencyList = {
      A: [{ to: 'B', weight: 743, tags: carTags }],
      B: [{ to: 'A', weight: 743, tags: carTags }],
    }
    const disconnectedNodes = new Map<string, [number, number]>([
      ['A', [4.9000, 52.3700]],
      ['B', [4.9010, 52.3700]],
      ['Z', [5.0000, 53.0000]],
    ])
    const result = aStar(disconnectedAdjacency, 'A', 'Z', disconnectedNodes, 'car')
    expect(result.found).toBe(false)
    // A* must have explored at least the start node
    expect(result.searchHistory.length).toBeGreaterThan(0)
  })
})
