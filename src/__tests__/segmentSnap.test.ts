import { describe, it, expect } from 'vitest'
import { snapToNearestSegment } from '../lib/segmentSnap'
import type { OsmGraph } from '../lib/osmParser'

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

// Three nodes along a primary road segment (approximate Amsterdam coords)
// Laid out west-to-east: nodeA → nodeB → nodeC
// Plus a motorway segment (nodeM1 → nodeM2) to the north
const testGraph: OsmGraph = {
  nodes: new Map<string, [number, number]>([
    ['nodeA', [4.8990, 52.3700]], // west end of primary road
    ['nodeB', [4.9000, 52.3700]], // midpoint of primary road
    ['nodeC', [4.9010, 52.3700]], // east end of primary road
    ['nodeM1', [4.9000, 52.3800]], // west end of motorway (to the north)
    ['nodeM2', [4.9010, 52.3800]], // east end of motorway (to the north)
  ]),
  ways: [
    {
      id: 'way1',
      nodeRefs: ['nodeA', 'nodeB', 'nodeC'],
      tags: { highway: 'primary' },
    },
    {
      id: 'way2',
      nodeRefs: ['nodeM1', 'nodeM2'],
      tags: { highway: 'motorway' },
    },
  ],
}

// ──────────────────────────────────────────────────────────────────────────────
// snapToNearestSegment tests (MAP-01, MAP-02)
// ──────────────────────────────────────────────────────────────────────────────

describe('snapToNearestSegment', () => {
  it('returns a non-null SnapResult when clicking near a primary road', () => {
    // Click point slightly north of the primary road midpoint (~50m away)
    const clickPoint: [number, number] = [4.9000, 52.3705]
    const result = snapToNearestSegment(clickPoint, testGraph, 'car', 200)
    expect(result).not.toBeNull()
  })

  it('snappedPoint is different from both segment endpoints (interpolated point)', () => {
    // Click near the middle of nodeA→nodeB segment
    const clickPoint: [number, number] = [4.8995, 52.3704]
    const result = snapToNearestSegment(clickPoint, testGraph, 'car', 200)
    expect(result).not.toBeNull()
    if (result) {
      const nodeACoords = testGraph.nodes.get('nodeA')!
      const nodeBCoords = testGraph.nodes.get('nodeB')!
      // Snapped point should not be identical to either endpoint
      expect(result.snappedPoint).not.toEqual(nodeACoords)
      expect(result.snappedPoint).not.toEqual(nodeBCoords)
    }
  })

  it('returns null when no road is within 200m of the click point', () => {
    // Click far away from all roads (~5km north)
    const farPoint: [number, number] = [4.9000, 52.4200]
    const result = snapToNearestSegment(farPoint, testGraph, 'car', 200)
    expect(result).toBeNull()
  })

  it('filters by mode: returns null when only motorway nearby and mode is bicycle', () => {
    // Click near the motorway (should be excluded for bicycle mode)
    const nearMotorway: [number, number] = [4.9005, 52.3803]
    // Snap with bicycle mode — motorway not accessible for bicycle
    const result = snapToNearestSegment(nearMotorway, testGraph, 'bicycle', 200)
    // The motorway is the only road within 200m here; bicycle cannot use it
    // The primary road is ~110m south — if it's within range it might return it,
    // but with a tight radius the result should be null
    const resultWithSmallRadius = snapToNearestSegment(nearMotorway, testGraph, 'bicycle', 50)
    expect(resultWithSmallRadius).toBeNull()
  })

  it('segmentNodeA and segmentNodeB match expected node IDs from test graph', () => {
    // Click very close to the nodeA→nodeB segment midpoint
    const clickPoint: [number, number] = [4.8995, 52.3701]
    const result = snapToNearestSegment(clickPoint, testGraph, 'car', 200)
    expect(result).not.toBeNull()
    if (result) {
      // The snap should be to the nodeA-nodeB or nodeB-nodeC segment
      const validNodes = ['nodeA', 'nodeB', 'nodeC']
      expect(validNodes).toContain(result.segmentNodeA)
      expect(validNodes).toContain(result.segmentNodeB)
      // The two node IDs should be different (they are segment endpoints)
      expect(result.segmentNodeA).not.toBe(result.segmentNodeB)
    }
  })
})
