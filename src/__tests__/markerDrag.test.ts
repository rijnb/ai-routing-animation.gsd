import { describe, it, expect, vi, beforeEach } from 'vitest'
// buildHandleMarkerDrag factory does not exist yet — RED until Plan 03 exports it.
// Plan 03 must export `buildHandleMarkerDrag` from useRouter.ts as a named export.
import { buildHandleMarkerDrag } from '../hooks/useRouter'
import type { SnapResult } from '../lib/segmentSnap'

vi.mock('../lib/segmentSnap', () => ({
  snapToNearestSegment: vi.fn(),
}))

import { snapToNearestSegment } from '../lib/segmentSnap'

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

const mockSourceSnap: SnapResult = {
  snappedPoint: [4.89, 52.37],
  segmentNodeA: 'nodeA',
  segmentNodeB: 'nodeB',
  t: 0.5,
  distanceMeters: 10,
}

const mockDestSnap: SnapResult = {
  snappedPoint: [4.91, 52.38],
  segmentNodeA: 'nodeC',
  segmentNodeB: 'nodeD',
  t: 0.3,
  distanceMeters: 15,
}

const mockNewSnap: SnapResult = {
  snappedPoint: [4.90, 52.375],
  segmentNodeA: 'nodeE',
  segmentNodeB: 'nodeF',
  t: 0.7,
  distanceMeters: 8,
}

// Minimal mock graph — buildHandleMarkerDrag receives graph as a parameter
const mockGraph = {
  nodes: new Map(),
  ways: [],
}

// ──────────────────────────────────────────────────────────────────────────────
// MAP-04: handleMarkerDrag — drag callback pipeline
//
// buildHandleMarkerDrag factory signature (Plan 03 must implement):
//   buildHandleMarkerDrag(deps: {
//     graph: OsmGraph | null,
//     mode: RoutingMode,
//     sourceSnap: SnapResult | null,
//     destSnap: SnapResult | null,
//     triggerRoute: (src: SnapResult, dst: SnapResult, mode: RoutingMode) => void,
//     setSourceSnap: (snap: SnapResult) => void,
//     setDestSnap: (snap: SnapResult) => void,
//   }) => (which: 'source' | 'destination', lngLat: [number, number]) => void
// ──────────────────────────────────────────────────────────────────────────────

describe('handleMarkerDrag', () => {
  const triggerRoute = vi.fn()
  const setSourceSnap = vi.fn()
  const setDestSnap = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(snapToNearestSegment).mockReturnValue(mockNewSnap)
  })

  it('drags source: calls triggerRoute with new snap as source and existing destSnap', () => {
    const handleMarkerDrag = buildHandleMarkerDrag({
      graph: mockGraph as any,
      mode: 'car',
      sourceSnap: mockSourceSnap,
      destSnap: mockDestSnap,
      triggerRoute,
      setSourceSnap,
      setDestSnap,
    })

    handleMarkerDrag('source', [4.9, 52.3])

    expect(triggerRoute).toHaveBeenCalledOnce()
    expect(triggerRoute).toHaveBeenCalledWith(mockNewSnap, mockDestSnap, 'car')
  })

  it('drags destination: calls triggerRoute with existing sourceSnap and new snap as dest', () => {
    const handleMarkerDrag = buildHandleMarkerDrag({
      graph: mockGraph as any,
      mode: 'car',
      sourceSnap: mockSourceSnap,
      destSnap: mockDestSnap,
      triggerRoute,
      setSourceSnap,
      setDestSnap,
    })

    handleMarkerDrag('destination', [4.9, 52.3])

    expect(triggerRoute).toHaveBeenCalledOnce()
    expect(triggerRoute).toHaveBeenCalledWith(mockSourceSnap, mockNewSnap, 'car')
  })

  it('does NOT call triggerRoute when snapToNearestSegment returns null (no road within 200m)', () => {
    vi.mocked(snapToNearestSegment).mockReturnValue(null)

    const handleMarkerDrag = buildHandleMarkerDrag({
      graph: mockGraph as any,
      mode: 'car',
      sourceSnap: mockSourceSnap,
      destSnap: mockDestSnap,
      triggerRoute,
      setSourceSnap,
      setDestSnap,
    })

    handleMarkerDrag('source', [4.9, 52.3])

    expect(triggerRoute).not.toHaveBeenCalled()
  })

  it('does NOT call triggerRoute when only source is set and source marker is dragged (need both endpoints)', () => {
    const handleMarkerDrag = buildHandleMarkerDrag({
      graph: mockGraph as any,
      mode: 'car',
      sourceSnap: mockSourceSnap,
      destSnap: null, // no destination yet
      triggerRoute,
      setSourceSnap,
      setDestSnap,
    })

    handleMarkerDrag('source', [4.9, 52.3])

    expect(triggerRoute).not.toHaveBeenCalled()
  })
})
