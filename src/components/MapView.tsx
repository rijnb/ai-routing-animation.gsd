import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import type { SnapResult } from '../lib/segmentSnap'
import type { OsmGraph } from '../lib/osmParser'
import {
  addRoadLayer,
  updateRoadData,
  fitRoadBounds,
  addFrontierLayers,
  addRouteLayers,
  updateRouteLayer,
  updateSnapIndicatorLayer,
} from '../lib/mapHelpers'

interface MapViewProps {
  apiKey: string
  geojson: FeatureCollection<LineString> | null
  onMapClick?: (lngLat: [number, number]) => void
  routePath?: [number, number][]
  sourceSnap?: SnapResult | null
  destSnap?: SnapResult | null
  lastClickPoint?: [number, number] | null
  lastSnapPoint?: [number, number] | null
  graph?: OsmGraph | null
  onMapReady?: (map: maplibregl.Map) => void
  onMarkerDrag?: (which: 'source' | 'destination', lngLat: [number, number]) => void
}

export function MapView({
  apiKey,
  geojson,
  onMapClick,
  routePath,
  sourceSnap,
  destSnap,
  lastClickPoint,
  lastSnapPoint,
  // graph and onMapReady are passed from App.tsx but not used inside MapView directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graph: _graph,
  onMapReady,
  onMarkerDrag,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  // Keep a stable ref to onMapClick so the click listener always calls the latest version
  const onMapClickRef = useRef(onMapClick)
  useEffect(() => {
    onMapClickRef.current = onMapClick
  })
  const onMapReadyRef = useRef(onMapReady)
  useEffect(() => {
    onMapReadyRef.current = onMapReady
  })
  // Stable ref for onMarkerDrag — same stale-closure prevention pattern as onMapClickRef
  const onMarkerDragRef = useRef(onMarkerDrag)
  useEffect(() => {
    onMarkerDragRef.current = onMarkerDrag
  })
  // Refs for draggable marker instances
  const sourceMarkerRef = useRef<maplibregl.Marker | null>(null)
  const destMarkerRef = useRef<maplibregl.Marker | null>(null)

  // Create map once (re-mounts if apiKey changes)
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.tomtom.com/style/1/style/*?key=${apiKey}&map=basic_night`,
      center: [4.9, 52.3],
      zoom: 10,
    })

    map.on('load', () => {
      addRoadLayer(map)
      addFrontierLayers(map)   // must be before addRouteLayers for z-order
      addRouteLayers(map)
      loadedRef.current = true
      onMapReadyRef.current?.(map)
    })

    map.on('click', (e) => {
      onMapClickRef.current?.([e.lngLat.lng, e.lngLat.lat])
    })

    mapRef.current = map

    return () => {
      loadedRef.current = false
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  // React to geojson changes
  useEffect(() => {
    if (!geojson || !mapRef.current || !loadedRef.current) return
    updateRoadData(mapRef.current, geojson)
    fitRoadBounds(mapRef.current, geojson)
  }, [geojson])

  // React to routing prop changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    updateRouteLayer(map, routePath ?? [])
    updateSnapIndicatorLayer(map, lastClickPoint ?? null, lastSnapPoint ?? null)
  }, [routePath, lastClickPoint, lastSnapPoint])

  // Manage draggable source marker
  useEffect(() => {
    if (!mapRef.current || !loadedRef.current) return
    if (!sourceSnap) {
      sourceMarkerRef.current?.remove()
      sourceMarkerRef.current = null
      return
    }
    if (!sourceMarkerRef.current) {
      const marker = new maplibregl.Marker({ draggable: true, color: '#22bb44' })
        .setLngLat(sourceSnap.snappedPoint)
        .addTo(mapRef.current)
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        onMarkerDragRef.current?.('source', [lngLat.lng, lngLat.lat])
      })
      sourceMarkerRef.current = marker
    } else {
      sourceMarkerRef.current.setLngLat(sourceSnap.snappedPoint)
    }
  }, [sourceSnap])

  // Manage draggable destination marker
  useEffect(() => {
    if (!mapRef.current || !loadedRef.current) return
    if (!destSnap) {
      destMarkerRef.current?.remove()
      destMarkerRef.current = null
      return
    }
    if (!destMarkerRef.current) {
      const marker = new maplibregl.Marker({ draggable: true, color: '#ee4444' })
        .setLngLat(destSnap.snappedPoint)
        .addTo(mapRef.current)
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        onMarkerDragRef.current?.('destination', [lngLat.lng, lngLat.lat])
      })
      destMarkerRef.current = marker
    } else {
      destMarkerRef.current.setLngLat(destSnap.snappedPoint)
    }
  }, [destSnap])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh' }}
    />
  )
}
