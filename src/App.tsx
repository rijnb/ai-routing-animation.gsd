import { useCallback, useEffect, useRef, useState } from 'react'
import { MapView } from './components/MapView'
import { ApiKeyModal } from './components/ApiKeyModal'
import { SettingsPanel } from './components/SettingsPanel'
import { ControlPanel } from './components/ControlPanel'
import { LoadingOverlay } from './components/LoadingOverlay'
import { StatsPanel } from './components/StatsPanel'
import { getApiKey, clearApiKey } from './lib/apiKeyStore'
import { useOsmLoader } from './hooks/useOsmLoader'
import { useRouter } from './hooks/useRouter'
import { useAnimation } from './hooks/useAnimation'
import { clearFrontierLayers } from './lib/mapHelpers'
import { filterHistory } from './lib/animationUtils'
import { estimateTravelTime } from './lib/routeStats'
import type { RouteResult } from './lib/router'
import maplibregl from 'maplibre-gl'

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(getApiKey())
  const { stage, percent, geojson, graph, componentMap, error, loadFile, workerRef } = useOsmLoader()

  const {
    mode,
    setMode,
    sourceSnap,
    destSnap,
    lastSnapPoint,
    route,
    routeError,
    handleMapClick,
    resetRouting,
    handleMarkerDrag,
  } = useRouter(workerRef, graph, componentMap)

  const { speed, setSpeed, startAnimation, cancelAnimation, nodesExplored } = useAnimation()
  const mapRef = useRef<maplibregl.Map | null>(null)

  const isLoading = stage !== '' && geojson === null

  // Track raw click point for snap indicator
  const [lastClickPoint, setLastClickPoint] = useState<[number, number] | null>(null)

  // Allows "Load new file" to return to drop zone state even when geojson is loaded
  const [showDropZone, setShowDropZone] = useState(false)

  // Auto-dismiss OSM load error toast after 5 seconds
  const [visibleError, setVisibleError] = useState<string | null>(null)
  useEffect(() => {
    if (!error) return
    setVisibleError(error)
    const timer = setTimeout(() => setVisibleError(null), 5000)
    return () => clearTimeout(timer)
  }, [error])

  // Auto-dismiss routing error toast after 4 seconds
  const [routingError, setRoutingError] = useState<string | null>(null)
  useEffect(() => {
    if (!routeError) return
    setRoutingError(routeError)
    const timer = setTimeout(() => setRoutingError(null), 4000)
    return () => clearTimeout(timer)
  }, [routeError])

  // Auto-start animation when route changes
  const prevRouteRef = useRef<RouteResult | null>(null)
  useEffect(() => {
    if (route && route !== prevRouteRef.current && graph && mapRef.current) {
      prevRouteRef.current = route
      if (!route.found) {
        setRoutingError('No route found between these points')
        return
      }
      startAnimation(mapRef.current, route, graph)
    }
  }, [route, graph, startAnimation])

  // Track previous geojson to detect new file load
  const prevGeojsonRef = useRef<typeof geojson>(null)
  useEffect(() => {
    if (geojson !== null && prevGeojsonRef.current === null) {
      // New OSM file loaded — cancel any in-flight animation, clear ghost layers, reset routing state
      cancelAnimation()
      if (mapRef.current) clearFrontierLayers(mapRef.current)
      resetRouting()
      setLastClickPoint(null)
    }
    prevGeojsonRef.current = geojson
  }, [geojson, cancelAnimation, resetRouting])

  // Cancel animation and clear frontier layers on new map click
  const handleMapClickWithCancel = useCallback((lngLat: [number, number]) => {
    cancelAnimation()
    if (mapRef.current) clearFrontierLayers(mapRef.current)
    setLastClickPoint(lngLat)
    handleMapClick(lngLat)
  }, [cancelAnimation, handleMapClick])

  // Cancel animation and clear frontier layers on marker drag (same pattern as map click)
  const handleMarkerDragWithCancel = useCallback(
    (which: 'source' | 'destination', lngLat: [number, number]) => {
      cancelAnimation()
      if (mapRef.current) clearFrontierLayers(mapRef.current)
      handleMarkerDrag(which, lngLat)
    },
    [cancelAnimation, handleMarkerDrag],
  )

  // Derived stats values
  const totalNodes = route ? filterHistory(route.searchHistory).length : 0
  const distanceKm = route?.found ? route.distance / 1000 : null
  const travelTimeSeconds = route?.found ? estimateTravelTime(route.distance, mode) : null

  // Show ApiKeyModal if no key stored
  if (!apiKey) {
    return <ApiKeyModal onSave={(key) => setApiKey(key)} />
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ cursor: geojson ? 'crosshair' : 'default', width: '100%', height: '100%' }}>
        <MapView
          apiKey={apiKey}
          geojson={geojson}
          onMapClick={handleMapClickWithCancel}
          onMarkerDrag={handleMarkerDragWithCancel}
          routePath={route?.path ?? []}
          sourceSnap={sourceSnap}
          destSnap={destSnap}
          lastClickPoint={lastClickPoint}
          lastSnapPoint={lastSnapPoint}
          graph={graph}
          onMapReady={m => { mapRef.current = m }}
        />
        <StatsPanel
          nodesExplored={nodesExplored}
          totalNodes={totalNodes}
          distanceKm={distanceKm}
          travelTimeSeconds={travelTimeSeconds}
          visible={route !== null}
        />
      </div>

      <LoadingOverlay stage={stage} percent={percent} visible={isLoading} />

      <SettingsPanel
        onClear={() => {
          clearApiKey()
          setApiKey(null)
        }}
      />

      <ControlPanel
        onFile={(file) => { loadFile(file); setShowDropZone(false) }}
        isLoading={isLoading}
        geojson={showDropZone ? null : geojson}
        mode={mode}
        onModeChange={setMode}
        speed={speed}
        onSpeedChange={setSpeed}
        route={route}
        onReload={() => setShowDropZone(true)}
      />

      {visibleError && (
        <div className="error-toast">{visibleError}</div>
      )}

      {routingError && (
        <div className="error-toast">{routingError}</div>
      )}
    </div>
  )
}
