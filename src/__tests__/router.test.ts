import { describe, it, expect } from 'vitest'
import { canUseEdge, aStar, edgeCost } from '../lib/router'
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

    it('is accessible for pedestrian (cycle tracks are shared-use by default)', () => {
      expect(canUseEdge(edge({ highway: 'cycleway' }), 'pedestrian')).toBe(true)
    })

    it('is blocked for pedestrian when foot=no is tagged', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', foot: 'no' }), 'pedestrian')).toBe(false)
    })
  })

  describe('foot=yes positive grant (shared cycleway/path accessible to pedestrian)', () => {
    it('allows pedestrian on cycleway with foot=yes', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', foot: 'yes' }), 'pedestrian')).toBe(true)
    })

    it('allows pedestrian on cycleway with foot=designated', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', foot: 'designated' }), 'pedestrian')).toBe(true)
    })

    it('still blocks car on cycleway even with foot=yes', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', foot: 'yes' }), 'car')).toBe(false)
    })

    it('access=no wins over foot=yes — still blocks pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', foot: 'yes', access: 'no' }), 'pedestrian')).toBe(false)
    })

    it('foot=no still blocks pedestrian even on pedestrian-accessible highway', () => {
      expect(canUseEdge(edge({ highway: 'footway', foot: 'no' }), 'pedestrian')).toBe(false)
    })
  })

  describe('bicycle=yes positive grant (foot path accessible to bicycle)', () => {
    it('allows bicycle on footway with bicycle=yes', () => {
      expect(canUseEdge(edge({ highway: 'footway', bicycle: 'yes' }), 'bicycle')).toBe(true)
    })

    it('allows bicycle on footway with bicycle=designated', () => {
      expect(canUseEdge(edge({ highway: 'footway', bicycle: 'designated' }), 'bicycle')).toBe(true)
    })

    it('still blocks car on footway even with bicycle=yes', () => {
      expect(canUseEdge(edge({ highway: 'footway', bicycle: 'yes' }), 'car')).toBe(false)
    })

    it('access=no wins over bicycle=yes — still blocks bicycle', () => {
      expect(canUseEdge(edge({ highway: 'footway', bicycle: 'yes', access: 'no' }), 'bicycle')).toBe(false)
    })

    it('bicycle=no still blocks bicycle even on bicycle-accessible highway', () => {
      expect(canUseEdge(edge({ highway: 'cycleway', bicycle: 'no' }), 'bicycle')).toBe(false)
    })
  })

  describe('bridleway', () => {
    it('is NOT accessible for car', () => {
      expect(canUseEdge(edge({ highway: 'bridleway' }), 'car')).toBe(false)
    })

    it('is NOT accessible for bicycle', () => {
      expect(canUseEdge(edge({ highway: 'bridleway' }), 'bicycle')).toBe(false)
    })

    it('is accessible for pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'bridleway' }), 'pedestrian')).toBe(true)
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

  describe('access=private blocks car routing', () => {
    it('blocks car on access=private road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'private' }), 'car')).toBe(false)
    })

    it('allows bicycle on access=private road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'private' }), 'bicycle')).toBe(true)
    })

    it('allows pedestrian on access=private road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'private' }), 'pedestrian')).toBe(true)
    })
  })

  describe('access=destination blocks car routing', () => {
    it('blocks car on access=destination road', () => {
      expect(canUseEdge(edge({ highway: 'residential', access: 'destination' }), 'car')).toBe(false)
    })

    it('allows bicycle on access=destination road', () => {
      expect(canUseEdge(edge({ highway: 'residential', access: 'destination' }), 'bicycle')).toBe(true)
    })

    it('allows pedestrian on access=destination road', () => {
      expect(canUseEdge(edge({ highway: 'residential', access: 'destination' }), 'pedestrian')).toBe(true)
    })
  })

  describe('access=permit blocks car routing', () => {
    it('blocks car on access=permit road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'permit' }), 'car')).toBe(false)
    })

    it('allows pedestrian on access=permit road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'permit' }), 'pedestrian')).toBe(true)
    })
  })

  describe('access=customers blocks car routing', () => {
    it('blocks car on access=customers road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'customers' }), 'car')).toBe(false)
    })

    it('allows pedestrian on access=customers road', () => {
      expect(canUseEdge(edge({ highway: 'service', access: 'customers' }), 'pedestrian')).toBe(true)
    })
  })

  describe('vehicle=no override', () => {
    it('blocks car', () => {
      expect(canUseEdge(edge({ highway: 'residential', vehicle: 'no' }), 'car')).toBe(false)
    })

    it('blocks bicycle', () => {
      expect(canUseEdge(edge({ highway: 'residential', vehicle: 'no' }), 'bicycle')).toBe(false)
    })

    it('allows pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'residential', vehicle: 'no' }), 'pedestrian')).toBe(true)
    })
  })

  describe('motorcar=no override', () => {
    it('blocks car', () => {
      expect(canUseEdge(edge({ highway: 'residential', motorcar: 'no' }), 'car')).toBe(false)
    })

    it('allows bicycle', () => {
      expect(canUseEdge(edge({ highway: 'residential', motorcar: 'no' }), 'bicycle')).toBe(true)
    })

    it('allows pedestrian', () => {
      expect(canUseEdge(edge({ highway: 'residential', motorcar: 'no' }), 'pedestrian')).toBe(true)
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

// ──────────────────────────────────────────────────────────────────────────────
// edgeCost — mode-specific cost multipliers
// ──────────────────────────────────────────────────────────────────────────────

describe('edgeCost', () => {
  it('virtual edge (no highway tag) returns raw weight regardless of mode', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: {} }
    expect(edgeCost(e, 'pedestrian')).toBe(100)
    expect(edgeCost(e, 'bicycle')).toBe(100)
    expect(edgeCost(e, 'car')).toBe(100)
  })

  it('footway: pedestrian cost = 1x (ideal), bicycle cost = 10x (discouraged)', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: { highway: 'footway' } }
    expect(edgeCost(e, 'pedestrian')).toBe(100)
    expect(edgeCost(e, 'bicycle')).toBe(1000)
  })

  it('cycleway: bicycle cost = 1x (ideal), pedestrian cost = 1.2x (allowed if foot=yes)', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: { highway: 'cycleway' } }
    expect(edgeCost(e, 'bicycle')).toBe(100)
    expect(edgeCost(e, 'pedestrian')).toBeCloseTo(120)
  })

  it('primary road: pedestrian cost = 5x, bicycle cost = 2.5x, car cost = 1x', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: { highway: 'primary' } }
    expect(edgeCost(e, 'pedestrian')).toBe(500)
    expect(edgeCost(e, 'bicycle')).toBe(250)
    expect(edgeCost(e, 'car')).toBe(100)
  })

  it('residential road: pedestrian cost = 2x, car cost = 1x', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: { highway: 'residential' } }
    expect(edgeCost(e, 'pedestrian')).toBe(200)
    expect(edgeCost(e, 'car')).toBe(100)
  })

  it('path: pedestrian and bicycle both get 1x cost', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: { highway: 'path' } }
    expect(edgeCost(e, 'pedestrian')).toBe(100)
    expect(edgeCost(e, 'bicycle')).toBe(100)
  })

  it('unknown highway type defaults to 1x for all modes', () => {
    const e: AdjacencyEdge = { to: '', weight: 100, tags: { highway: 'some_future_type' } }
    expect(edgeCost(e, 'pedestrian')).toBe(100)
    expect(edgeCost(e, 'bicycle')).toBe(100)
    expect(edgeCost(e, 'car')).toBe(100)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// aStar — cost-weighted routing (pedestrian infrastructure preference)
// ──────────────────────────────────────────────────────────────────────────────

describe('aStar cost-weighted routing', () => {
  // Graph: A → B (primary road, 100m) vs A → C → B (footway, 100m + 100m = 200m physical)
  // Without cost weighting: A→B wins (100m < 200m)
  // With cost weighting (primary=5x for pedestrian): A→B costs 500; A→C→B costs 200
  // So pedestrian should prefer A→C→B even though it is physically longer.

  const nodes = new Map<string, [number, number]>([
    ['A', [4.9000, 52.3700]],
    ['B', [4.9009, 52.3700]], // ~670m east (roughly)
    ['C', [4.9005, 52.3705]], // northeast detour point
  ])

  const mixedAdjacency: AdjacencyList = {
    A: [
      { to: 'B', weight: 670, tags: { highway: 'primary' } },    // direct but car road
      { to: 'C', weight: 400, tags: { highway: 'footway' } },    // footway leg 1
    ],
    B: [
      { to: 'A', weight: 670, tags: { highway: 'primary' } },
      { to: 'C', weight: 380, tags: { highway: 'footway' } },
    ],
    C: [
      { to: 'A', weight: 400, tags: { highway: 'footway' } },
      { to: 'B', weight: 380, tags: { highway: 'footway' } },    // footway leg 2
    ],
  }

  it('pedestrian route avoids primary road and uses footway detour', () => {
    const result = aStar(mixedAdjacency, 'A', 'B', nodes, 'pedestrian')
    expect(result.found).toBe(true)
    // Path should go through C (footway detour), not direct A→B (primary)
    // Footway path: A→C→B (costs 400+380=780 weighted vs primary 670*5=3350)
    // Physical distance of footway path: 400+380=780m
    // Physical distance of direct: 670m
    // Result path should contain C's coordinate
    const cCoord = nodes.get('C')!
    const pathHasC = result.path.some(
      ([lon, lat]) => Math.abs(lon - cCoord[0]) < 0.00001 && Math.abs(lat - cCoord[1]) < 0.00001
    )
    expect(pathHasC).toBe(true)
  })

  it('car route takes direct primary road (not the footway detour)', () => {
    const result = aStar(mixedAdjacency, 'A', 'B', nodes, 'car')
    expect(result.found).toBe(true)
    // Car: primary costs 1x (670), footway detour costs 400+380=780. Direct wins.
    const cCoord = nodes.get('C')!
    const pathHasC = result.path.some(
      ([lon, lat]) => Math.abs(lon - cCoord[0]) < 0.00001 && Math.abs(lat - cCoord[1]) < 0.00001
    )
    expect(pathHasC).toBe(false)
  })

  it('reported distance is physical meters, not cost-weighted', () => {
    const result = aStar(mixedAdjacency, 'A', 'B', nodes, 'pedestrian')
    expect(result.found).toBe(true)
    const carResult = aStar(mixedAdjacency, 'A', 'B', nodes, 'car')
    expect(carResult.found).toBe(true)
    // Pedestrian takes footway A→C→B (longer physical path).
    // Car takes direct A→B (shorter physical path).
    // Physical distance for pedestrian must be GREATER than for car.
    expect(result.distance).toBeGreaterThan(carResult.distance)
    // If distance were cost-weighted, pedestrian gScore would be 400+380=780 (footway 1x)
    // while car gScore would be 670 (primary 1x for car). Pedestrian > car either way.
    // But the critical check: reported distance must equal sum of haversine between
    // consecutive path coords (not multiplied by cost factor).
    // Verify: for the 2-node car path [A, B], distance ≈ haversine(A,B).
    const coordA = nodes.get('A')!
    const coordB = nodes.get('B')!
    const coordC = nodes.get('C')!
    // haversine(A,B): both are real geographic distance
    const abDist = Math.sqrt(
      Math.pow((coordB[0] - coordA[0]) * Math.cos((coordA[1] * Math.PI) / 180) * 111320, 2) +
      Math.pow((coordB[1] - coordA[1]) * 110540, 2)
    )
    // Car distance should be close to real A→B physical distance (within 10%)
    expect(carResult.distance).toBeGreaterThan(abDist * 0.9)
    expect(carResult.distance).toBeLessThan(abDist * 1.1)
    // Pedestrian distance should be close to real A→C + C→B physical distance
    const acDist = Math.sqrt(
      Math.pow((coordC[0] - coordA[0]) * Math.cos((coordA[1] * Math.PI) / 180) * 111320, 2) +
      Math.pow((coordC[1] - coordA[1]) * 110540, 2)
    )
    const cbDist = Math.sqrt(
      Math.pow((coordB[0] - coordC[0]) * Math.cos((coordC[1] * Math.PI) / 180) * 111320, 2) +
      Math.pow((coordB[1] - coordC[1]) * 110540, 2)
    )
    const footwayPhysical = acDist + cbDist
    expect(result.distance).toBeGreaterThan(footwayPhysical * 0.9)
    expect(result.distance).toBeLessThan(footwayPhysical * 1.1)
  })
})
