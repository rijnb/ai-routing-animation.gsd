import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'

const EMPTY_FC: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] }

export function addRoadLayer(map: maplibregl.Map): void {
  map.addSource('roads', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'roads-layer',
    type: 'line',
    source: 'roads',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': [
        'match',
        ['get', 'highway'],
        ['motorway', 'trunk'], '#4488ff',
        ['primary', 'secondary'], '#2255cc',
        '#1a3d99',
      ],
      'line-width': [
        'match',
        ['get', 'highway'],
        ['motorway', 'trunk'], 4,
        ['primary'], 2.5,
        ['secondary', 'tertiary'], 2,
        1.2,
      ],
      'line-opacity': 0,
    },
  })
}

export function updateRoadData(
  map: maplibregl.Map,
  geojson: FeatureCollection<LineString>,
): void {
  const source = map.getSource('roads') as GeoJSONSource | undefined
  if (!source) return
  source.setData(geojson)
  // Fade in — locked decision
  map.setPaintProperty('roads-layer', 'line-opacity', 0.85)
}

export function fitRoadBounds(
  map: maplibregl.Map,
  geojson: FeatureCollection<LineString>,
): void {
  if (geojson.features.length === 0) return

  const bounds = new maplibregl.LngLatBounds()
  for (const feature of geojson.features) {
    for (const coord of feature.geometry.coordinates) {
      bounds.extend(coord as [number, number])
    }
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 40, duration: 600 })
  }
}
