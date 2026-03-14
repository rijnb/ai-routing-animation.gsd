import { describe, it, expect } from 'vitest'
import { buildRoadGeoJson, buildAdjacency } from '../lib/graphBuilder'

describe('buildRoadGeoJson', () => {
  const mockNodes = new Map<string, [number, number]>([
    ['1', [4.9, 52.3]],
    ['2', [4.91, 52.31]],
    ['3', [4.92, 52.32]],
  ])

  const mockWays = [
    { id: '10', nodeRefs: ['1', '2'], tags: { highway: 'primary' } },
    { id: '11', nodeRefs: ['2', '3'], tags: { highway: 'secondary' } },
  ]

  it('returns GeoJSON FeatureCollection', () => {
    const result = buildRoadGeoJson(mockWays, mockNodes)
    expect(result.type).toBe('FeatureCollection')
    expect(Array.isArray(result.features)).toBe(true)
  })

  it('each Feature has geometry.type === LineString', () => {
    const result = buildRoadGeoJson(mockWays, mockNodes)
    for (const feature of result.features) {
      expect(feature.geometry.type).toBe('LineString')
    }
  })

  it('each Feature has properties.highway set to the OSM highway value', () => {
    const result = buildRoadGeoJson(mockWays, mockNodes)
    expect(result.features[0].properties?.highway).toBe('primary')
    expect(result.features[1].properties?.highway).toBe('secondary')
  })

  it('empty ways input produces FeatureCollection with zero features', () => {
    const result = buildRoadGeoJson([], mockNodes)
    expect(result.type).toBe('FeatureCollection')
    expect(result.features).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// buildAdjacency — component detection (PIPE-03)
// These tests fail with a compile error until Plan 02-02 adds buildAdjacency.
// That is correct Wave 0 behavior — tests go GREEN in Plan 02-02.
// ──────────────────────────────────────────────────────────────────────────────

describe('buildAdjacency', () => {
  describe('disconnected component detection', () => {
    // Two completely disconnected road components:
    //   Component A: node1 — node2 (primary road)
    //   Component B: node3 — node4 (residential road, separate island)
    const disconnectedNodes = new Map<string, [number, number]>([
      ['node1', [4.9000, 52.3700]],
      ['node2', [4.9010, 52.3700]],
      ['node3', [5.0000, 53.0000]], // far away, separate component
      ['node4', [5.0010, 53.0000]],
    ])

    const disconnectedWays = [
      { id: 'w1', nodeRefs: ['node1', 'node2'], tags: { highway: 'primary' } },
      { id: 'w2', nodeRefs: ['node3', 'node4'], tags: { highway: 'residential' } },
    ]

    it('sameComponent returns false for nodes in disconnected subgraphs', () => {
      const { sameComponent } = buildAdjacency(disconnectedWays, disconnectedNodes)
      expect(sameComponent('node1', 'node3')).toBe(false)
      expect(sameComponent('node2', 'node4')).toBe(false)
    })

    it('sameComponent returns true for nodes within the same connected component', () => {
      const { sameComponent } = buildAdjacency(disconnectedWays, disconnectedNodes)
      expect(sameComponent('node1', 'node2')).toBe(true)
      expect(sameComponent('node3', 'node4')).toBe(true)
    })
  })

  describe('single connected graph', () => {
    const connectedNodes = new Map<string, [number, number]>([
      ['A', [4.9000, 52.3700]],
      ['B', [4.9010, 52.3700]],
      ['C', [4.9005, 52.3710]],
    ])

    const connectedWays = [
      { id: 'w1', nodeRefs: ['A', 'B'], tags: { highway: 'primary' } },
      { id: 'w2', nodeRefs: ['B', 'C'], tags: { highway: 'secondary' } },
      { id: 'w3', nodeRefs: ['A', 'C'], tags: { highway: 'tertiary' } },
    ]

    it('sameComponent returns true for any two nodes in a fully connected graph', () => {
      const { sameComponent } = buildAdjacency(connectedWays, connectedNodes)
      expect(sameComponent('A', 'B')).toBe(true)
      expect(sameComponent('B', 'C')).toBe(true)
      expect(sameComponent('A', 'C')).toBe(true)
    })
  })

  describe('adjacency list structure', () => {
    const simpleNodes = new Map<string, [number, number]>([
      ['X', [4.9000, 52.3700]],
      ['Y', [4.9010, 52.3700]],
    ])

    const simpleWays = [
      { id: 'w1', nodeRefs: ['X', 'Y'], tags: { highway: 'primary' } },
    ]

    it('adjacency list contains edges for all node pairs in ways', () => {
      const { adjacency } = buildAdjacency(simpleWays, simpleNodes)
      // Should have bidirectional edges X↔Y
      expect(adjacency['X']).toBeDefined()
      expect(adjacency['Y']).toBeDefined()
      expect(adjacency['X'].some((e) => e.to === 'Y')).toBe(true)
      expect(adjacency['Y'].some((e) => e.to === 'X')).toBe(true)
    })
  })

  describe('buildAdjacency — barrier node propagation', () => {
    // Graph: A — B(pole) — C
    // Node B has barrier=pole in barrierNodes.
    // Expected: edges leading INTO B carry barrier=pole.
    //   A→B edge has barrier=pole (entering B)
    //   C→B edge has barrier=pole (entering B)
    // Edges leading OUT OF B do not carry a barrier from B:
    //   B→A and B→C carry no extra barrier (no barrier at A or C)
    const barrierNodes = new Map<string, [number, number]>([
      ['A', [4.9000, 52.3700]],
      ['B', [4.9005, 52.3700]], // barrier=pole node
      ['C', [4.9010, 52.3700]],
    ])

    const barrierWays = [
      { id: 'w1', nodeRefs: ['A', 'B'], tags: { highway: 'residential' } },
      { id: 'w2', nodeRefs: ['B', 'C'], tags: { highway: 'residential' } },
    ]

    const poleBarrierMap = new Map<string, string>([['B', 'pole']])

    it('edge A→B carries barrier=pole from node B', () => {
      const { adjacency } = buildAdjacency(barrierWays, barrierNodes, poleBarrierMap)
      const edgeAB = adjacency['A'].find((e) => e.to === 'B')
      expect(edgeAB).toBeDefined()
      expect(edgeAB!.tags['barrier']).toBe('pole')
    })

    it('edge C→B carries barrier=pole from node B', () => {
      const { adjacency } = buildAdjacency(barrierWays, barrierNodes, poleBarrierMap)
      const edgeCB = adjacency['C'].find((e) => e.to === 'B')
      expect(edgeCB).toBeDefined()
      expect(edgeCB!.tags['barrier']).toBe('pole')
    })

    it('edge B→A does not carry barrier (no barrier at A)', () => {
      const { adjacency } = buildAdjacency(barrierWays, barrierNodes, poleBarrierMap)
      const edgeBA = adjacency['B'].find((e) => e.to === 'A')
      expect(edgeBA).toBeDefined()
      expect(edgeBA!.tags['barrier']).toBeUndefined()
    })

    it('edge B→C does not carry barrier (no barrier at C)', () => {
      const { adjacency } = buildAdjacency(barrierWays, barrierNodes, poleBarrierMap)
      const edgeBC = adjacency['B'].find((e) => e.to === 'C')
      expect(edgeBC).toBeDefined()
      expect(edgeBC!.tags['barrier']).toBeUndefined()
    })

    it('without barrierNodes argument, edges have no barrier tag', () => {
      const { adjacency } = buildAdjacency(barrierWays, barrierNodes)
      const edgeAB = adjacency['A'].find((e) => e.to === 'B')
      expect(edgeAB).toBeDefined()
      expect(edgeAB!.tags['barrier']).toBeUndefined()
    })

    it('barrier node does not block component connectivity', () => {
      const { sameComponent } = buildAdjacency(barrierWays, barrierNodes, poleBarrierMap)
      // The barrier is enforced at routing time (canUseEdge), not at graph build time
      expect(sameComponent('A', 'C')).toBe(true)
    })
  })

  describe('buildAdjacency — oneway detection', () => {
    const onewayNodes = new Map<string, [number, number]>([
      ['A', [4.9000, 52.3700]],
      ['B', [4.9010, 52.3700]],
    ])

    it('oneway=yes: B→A edge has onewayReversed: true; A→B edge does not', () => {
      const ways = [
        { id: 'w1', nodeRefs: ['A', 'B'], tags: { highway: 'residential', oneway: 'yes' } },
      ]
      const { adjacency } = buildAdjacency(ways, onewayNodes)

      // edgeBA (B→A) must have onewayReversed: true
      const edgeBA = adjacency['B'].find((e) => e.to === 'A')
      expect(edgeBA).toBeDefined()
      expect(edgeBA!.onewayReversed).toBe(true)

      // edgeAB (A→B) must NOT have onewayReversed set to true
      const edgeAB = adjacency['A'].find((e) => e.to === 'B')
      expect(edgeAB).toBeDefined()
      expect(edgeAB!.onewayReversed).toBeFalsy()
    })

    it('oneway=-1: A→B edge has onewayReversed: true; B→A edge does not', () => {
      const ways = [
        { id: 'w1', nodeRefs: ['A', 'B'], tags: { highway: 'residential', oneway: '-1' } },
      ]
      const { adjacency } = buildAdjacency(ways, onewayNodes)

      // edgeAB (A→B) must have onewayReversed: true
      const edgeAB = adjacency['A'].find((e) => e.to === 'B')
      expect(edgeAB).toBeDefined()
      expect(edgeAB!.onewayReversed).toBe(true)

      // edgeBA (B→A) must NOT have onewayReversed set to true
      const edgeBA = adjacency['B'].find((e) => e.to === 'A')
      expect(edgeBA).toBeDefined()
      expect(edgeBA!.onewayReversed).toBeFalsy()
    })

    it('no oneway tag: neither edge has onewayReversed set to true', () => {
      const ways = [
        { id: 'w1', nodeRefs: ['A', 'B'], tags: { highway: 'residential' } },
      ]
      const { adjacency } = buildAdjacency(ways, onewayNodes)

      const edgeAB = adjacency['A'].find((e) => e.to === 'B')
      const edgeBA = adjacency['B'].find((e) => e.to === 'A')
      expect(edgeAB).toBeDefined()
      expect(edgeBA).toBeDefined()
      expect(edgeAB!.onewayReversed).toBeFalsy()
      expect(edgeBA!.onewayReversed).toBeFalsy()
    })
  })
})
