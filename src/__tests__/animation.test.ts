import { describe, it, expect } from 'vitest'
import { filterHistory, slicePath, computeNodesPerFrame } from '../../src/lib/animationUtils'

describe('filterHistory', () => {
  it('removes __vs__ and __ve__ entries from array', () => {
    expect(filterHistory(['__vs__', 'A', 'B', '__ve__'])).toEqual(['A', 'B'])
  })

  it('leaves clean arrays untouched', () => {
    expect(filterHistory(['A', 'B', 'C'])).toEqual(['A', 'B', 'C'])
  })

  it('handles empty array', () => {
    expect(filterHistory([])).toEqual([])
  })

  it('removes only virtual node IDs, preserving other entries', () => {
    expect(filterHistory(['__vs__', '__ve__'])).toEqual([])
  })

  it('handles array with only real nodes', () => {
    expect(filterHistory(['node1', 'node2'])).toEqual(['node1', 'node2'])
  })
})

describe('slicePath', () => {
  const coords: [number, number][] = [
    [1, 2], [3, 4], [5, 6], [7, 8], [9, 10],
    [11, 12], [13, 14], [15, 16], [17, 18], [19, 20],
  ]

  it('cursor=0 returns empty array (fraction 0)', () => {
    expect(slicePath(coords, 0, 10)).toEqual([])
  })

  it('cursor=total returns full path (fraction 1.0)', () => {
    expect(slicePath(coords, 10, 10)).toEqual(coords)
  })

  it('cursor=5/total=10 returns first 50% (ceil(10*0.5)=5 coords)', () => {
    const result = slicePath(coords, 5, 10)
    expect(result).toHaveLength(5)
    expect(result).toEqual(coords.slice(0, 5))
  })

  it('cursor >= total always returns full path', () => {
    expect(slicePath(coords, 15, 10)).toEqual(coords)
  })

  it('empty path returns []', () => {
    expect(slicePath([], 5, 10)).toEqual([])
  })

  it('uses ceil for fractional results', () => {
    // 3 coords, cursor=1, total=3 → ceil(3 * 1/3) = ceil(1) = 1
    const threeCoords: [number, number][] = [[1, 2], [3, 4], [5, 6]]
    expect(slicePath(threeCoords, 1, 3)).toHaveLength(1)
  })

  it('handles total=0 edge case by returning []', () => {
    expect(slicePath(coords, 0, 0)).toEqual([])
  })
})

describe('computeNodesPerFrame', () => {
  it('multiplier=0.5 → max(1, round(3.5)) = 4', () => {
    expect(computeNodesPerFrame(0.5)).toBe(4)
  })

  it('multiplier=1.0 → max(1, round(7)) = 7', () => {
    expect(computeNodesPerFrame(1.0)).toBe(7)
  })

  it('multiplier=5.0 → max(1, round(35)) = 35', () => {
    expect(computeNodesPerFrame(5.0)).toBe(35)
  })

  it('very low multiplier floors at 1', () => {
    expect(computeNodesPerFrame(0.1)).toBe(1)
  })

  it('multiplier=0 floors at 1', () => {
    expect(computeNodesPerFrame(0)).toBe(1)
  })
})
