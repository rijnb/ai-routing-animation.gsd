import { describe, it, expect } from 'vitest'
import { buildRoadGeoJson } from '../lib/graphBuilder'

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
