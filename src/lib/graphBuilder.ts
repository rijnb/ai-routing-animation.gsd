import type { FeatureCollection, LineString } from 'geojson'
import type { OsmWay } from './osmParser'

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
