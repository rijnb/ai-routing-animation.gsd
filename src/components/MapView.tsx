import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import type { SnapResult } from '../lib/segmentSnap'
import {
  addRoadLayer,
  updateRoadData,
  fitRoadBounds,
  addRouteLayers,
  updateRouteLayer,
  updateMarkersLayer,
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
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  // Keep a stable ref to onMapClick so the click listener always calls the latest version
  const onMapClickRef = useRef(onMapClick)
  useEffect(() => {
    onMapClickRef.current = onMapClick
  })

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
      addRouteLayers(map)
      loadedRef.current = true
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
    updateMarkersLayer(map, sourceSnap ?? null, destSnap ?? null)
    updateSnapIndicatorLayer(map, lastClickPoint ?? null, lastSnapPoint ?? null)
  }, [routePath, sourceSnap, destSnap, lastClickPoint, lastSnapPoint])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh' }}
    />
  )
}
