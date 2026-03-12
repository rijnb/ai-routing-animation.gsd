import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import { addRoadLayer, updateRoadData, fitRoadBounds } from '../lib/mapHelpers'

interface MapViewProps {
  apiKey: string
  geojson: FeatureCollection<LineString> | null
}

export function MapView({ apiKey, geojson }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)

  // Create map once
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
      loadedRef.current = true
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

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh' }}
    />
  )
}
