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
})
