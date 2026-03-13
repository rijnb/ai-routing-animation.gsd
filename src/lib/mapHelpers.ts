import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection, LineString, Point } from 'geojson'
import type { SnapResult } from './segmentSnap'

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] }
const EMPTY_LINE_FC: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] }

export function addRoadLayer(map: maplibregl.Map): void {
  map.addSource('roads', { type: 'geojson', data: EMPTY_LINE_FC })
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

/**
 * addRouteLayers — adds route, snap-indicator, and markers sources + layers to the map.
 * Layer ordering (bottom to top): roads-layer, snap-indicator-layer, markers-layer, route-layer.
 * All sources are initialised with an empty FeatureCollection.
 */
export function addRouteLayers(map: maplibregl.Map): void {
  // snap-indicator: dashed orange line connecting raw click to snapped point
  map.addSource('snap-indicator', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'snap-indicator-layer',
    type: 'line',
    source: 'snap-indicator',
    paint: {
      'line-color': '#ffaa00',
      'line-width': 1.5,
      'line-dasharray': [4, 4],
    },
  })

  // markers: source and destination circle markers
  map.addSource('markers', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'markers-layer',
    type: 'circle',
    source: 'markers',
    paint: {
      'circle-radius': 8,
      'circle-color': ['match', ['get', 'markerType'], 'source', '#22bb44', '#ee4444'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })

  // route: bold red line for the A* path (on top of all other layers)
  map.addSource('route', { type: 'geojson', data: EMPTY_FC })
  map.addLayer({
    id: 'route-layer',
    type: 'line',
    source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#e63012',
      'line-width': 5,
      'line-opacity': 0.9,
    },
  })
}

/**
 * updateRouteLayer — sets the route source data from a path coordinate array.
 * Clears the layer when path is empty.
 */
export function updateRouteLayer(map: maplibregl.Map, path: [number, number][]): void {
  const source = map.getSource('route') as GeoJSONSource | undefined
  if (!source) return

  if (path.length === 0) {
    source.setData(EMPTY_FC)
    return
  }

  const fc: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: path },
        properties: {},
      },
    ],
  }
  source.setData(fc)
}

/**
 * updateMarkersLayer — updates the markers source with source and destination snap points.
 * Each non-null snap produces a Point feature with markerType 'source' or 'destination'.
 */
export function updateMarkersLayer(
  map: maplibregl.Map,
  sourceSnap: SnapResult | null,
  destSnap: SnapResult | null,
): void {
  const source = map.getSource('markers') as GeoJSONSource | undefined
  if (!source) return

  const features: FeatureCollection<Point>['features'] = []

  if (sourceSnap) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: sourceSnap.snappedPoint },
      properties: { markerType: 'source' },
    })
  }

  if (destSnap) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: destSnap.snappedPoint },
      properties: { markerType: 'destination' },
    })
  }

  source.setData({ type: 'FeatureCollection', features })
}

/**
 * updateSnapIndicatorLayer — draws a dashed line from the raw click point to the snapped point.
 * Clears the layer if either point is null.
 */
export function updateSnapIndicatorLayer(
  map: maplibregl.Map,
  rawClick: [number, number] | null,
  snapped: [number, number] | null,
): void {
  const source = map.getSource('snap-indicator') as GeoJSONSource | undefined
  if (!source) return

  if (!rawClick || !snapped) {
    source.setData(EMPTY_FC)
    return
  }

  const fc: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [rawClick, snapped] },
        properties: {},
      },
    ],
  }
  source.setData(fc)
}

/**
 * clearRouteLayers — resets all route-related sources to empty FeatureCollections.
 */
export function clearRouteLayers(map: maplibregl.Map): void {
  for (const sourceId of ['route', 'snap-indicator', 'markers']) {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined
    source?.setData(EMPTY_FC)
  }
}
