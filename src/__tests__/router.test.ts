import { describe, it, expect } from 'vitest'
import { canUseEdge, aStar } from '../lib/router'
import type { AdjacencyList, AdjacencyEdge } from '../lib/router'

// Fixture helper — builds a minimal AdjacencyEdge for canUseEdge tests
const edge = (tags: Record<string, string>, onewayReversed?: boolean): AdjacencyEdge =>
  ({ to: '', weight: 0, tags, onewayReversed })

// ──────────────────────────────────────────────────────────────────────────────
// canUseEdge — OSM access matrix (source: RESEARCH.md Highway Type Access Matrix)
// ──────────────────────────────────────────────────────────────────────────────

describe('canUseEdge', () => {
  describe('motorway', () => {
    it('is accessible for car', () => {
      expect(canUseEdge(edge({ highway: 'motorway' }), 'car')).toBe(true)
    })

    it('is NOT accessible for bicycle', () => {
      expect(canUseEdge(edge({ highway: 'motorway' }), 'bicycle')).toBe(false)
    })

    it('is NOT accessible for pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'motorway' }), 'pedestrian')).toBe(false)
    })
  })

  describe('footway', () => {
    it('is NOT accessible for car', () => {
      expect(canUseEdge(edge({ highway: 'footway' }), 'car')).toBe(false)
    })

    it('is NOT accessible for bicycle', () => {
      expect(canUseEdge(edge({ highway: 'footway' }), 'bicycle')).toBe(false)
    })

    it('is accessible for pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'footway' }), 'pedestrian')).toBe(true)
    })
  })

  describe('cycleway', () => {
    it('is NOT accessible for car', () => {
      expect(canUseEdge(edge({ highway: 'cycleway' }), 'car')).toBe(false)
    })

    it('is accessible for bicycle', () => {
      expect(canUseEdge(edge({ highway: 'cycleway' }), 'bicycle')).toBe(true)
    })

    it('is NOT accessible for pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'cycleway' }), 'pedestrian')).toBe(false)
    })
  })

  describe('access=no override', () => {
    it('blocks car even on primary road', () => {
      expect(canUseEdge(edge({ highway: 'primary', access: 'no' }), 'car')).toBe(false)
    })

    it('blocks bicycle even on cycleway', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', access: 'no' }), 'bicycle')).toBe(false)
    })

    it('blocks pedestrian even on footway', () => {
      expect(canUseEdge(edge({ highway: 'footway', access: 'no' }), 'pedestrian')).toBe(false)
    })
  })

  describe('oneway direction enforcement', () => {
    it('blocks car on onewayReversed=true edge', () => {
      expect(canUseEdge(edge({ highway: 'primary' }, true), 'car')).toBe(false)
    })

    it('blocks bicycle on onewayReversed=true edge (no contraflow tag)', () => {
      expect(canUseEdge(edge({ highway: 'primary' }, true), 'bicycle')).toBe(false)
    })

    it('allows bicycle on onewayReversed=true edge when oneway:bicycle=no (contraflow lane)', () => {
      expect(canUseEdge(edge({ highway: 'primary', 'oneway:bicycle': 'no' }, true), 'bicycle')).toBe(true)
    })

    it('allows pedestrian on onewayReversed=true edge (always bidirectional)', () => {
      expect(canUseEdge(edge({ highway: 'primary' }, true), 'pedestrian')).toBe(true)
    })
  })

  describe('construction blocking', () => {
    it('blocks car on highway=construction', () => {
      expect(canUseEdge(edge({ highway: 'construction' }), 'car')).toBe(false)
    })

    it('blocks bicycle on highway=construction', () => {
      expect(canUseEdge(edge({ highway: 'construction' }), 'bicycle')).toBe(false)
    })

    it('blocks pedestrian on highway=construction', () => {
      expect(canUseEdge(edge({ highway: 'construction' }), 'pedestrian')).toBe(false)
    })

    it('blocks car on construction=yes', () => {
      expect(canUseEdge(edge({ highway: 'residential', construction: 'yes' }), 'car')).toBe(false)
    })
  })

  describe('barrier blocking', () => {
    describe('bollard — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'bollard' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'bollard' }), 'bicycle')).toBe(true)
      })

      it('allows pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'bollard' }), 'pedestrian')).toBe(true)
      })
    })

    describe('wall — blocks all modes', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'wall' }), 'car')).toBe(false)
      })

      it('blocks pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'wall' }), 'pedestrian')).toBe(false)
      })
    })

    describe('fence — blocks all modes', () => {
      it('blocks bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'fence' }), 'bicycle')).toBe(false)
      })
    })

    describe('hedge — blocks all modes', () => {
      it('blocks pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'hedge' }), 'pedestrian')).toBe(false)
      })
    })

    describe('gate — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'gate' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'gate' }), 'bicycle')).toBe(true)
      })
    })

    describe('lift_gate — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'lift_gate' }), 'car')).toBe(false)
      })
    })

    describe('kissing_gate — blocks car and bicycle, allows pedestrian', () => {
      it('allows pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'kissing_gate' }), 'pedestrian')).toBe(true)
      })

      it('blocks bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'kissing_gate' }), 'bicycle')).toBe(false)
      })
    })

    describe('cycle_barrier — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'cycle_barrier' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'cycle_barrier' }), 'bicycle')).toBe(true)
      })
    })

    describe('jersey_barrier — blocks all modes', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'jersey_barrier' }), 'car')).toBe(false)
      })

      it('blocks bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'jersey_barrier' }), 'bicycle')).toBe(false)
      })

      it('blocks pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'jersey_barrier' }), 'pedestrian')).toBe(false)
      })
    })

    describe('pole — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'pole' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'pole' }), 'bicycle')).toBe(true)
      })

      it('allows pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'pole' }), 'pedestrian')).toBe(true)
      })
    })

    describe('block — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'block' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'block' }), 'bicycle')).toBe(true)
      })
    })

    describe('chain — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'chain' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'chain' }), 'bicycle')).toBe(true)
      })

      it('allows pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'chain' }), 'pedestrian')).toBe(true)
      })
    })

    describe('planter — blocks car only', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'planter' }), 'car')).toBe(false)
      })

      it('allows bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'planter' }), 'bicycle')).toBe(true)
      })
    })

    describe('stile — blocks car and bicycle, allows pedestrian', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'stile' }), 'car')).toBe(false)
      })

      it('blocks bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'stile' }), 'bicycle')).toBe(false)
      })

      it('allows pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'stile' }), 'pedestrian')).toBe(true)
      })
    })

    describe('turnstile — blocks car and bicycle, allows pedestrian', () => {
      it('blocks car', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'turnstile' }), 'car')).toBe(false)
      })

      it('blocks bicycle', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'turnstile' }), 'bicycle')).toBe(false)
      })

      it('allows pedestrian', () => {
        expect(canUseEdge(edge({ highway: 'residential', barrier: 'turnstile' }), 'pedestrian')).toBe(true)
      })
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
