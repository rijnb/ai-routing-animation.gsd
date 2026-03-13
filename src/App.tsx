import { useCallback, useEffect, useRef, useState } from 'react'
import { MapView } from './components/MapView'
import { ApiKeyModal } from './components/ApiKeyModal'
import { SettingsPanel } from './components/SettingsPanel'
import { DropZone } from './components/DropZone'
import { LoadingOverlay } from './components/LoadingOverlay'
import { ModeSelector } from './components/ModeSelector'
import { SpeedPanel } from './components/SpeedPanel'
import { getApiKey, clearApiKey } from './lib/apiKeyStore'
import { useOsmLoader } from './hooks/useOsmLoader'
import { useRouter } from './hooks/useRouter'
import { useAnimation } from './hooks/useAnimation'
import { clearFrontierLayers } from './lib/mapHelpers'
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
  } = useRouter(workerRef, graph, componentMap)

  const { speed, setSpeed, startAnimation, cancelAnimation } = useAnimation()
  const mapRef = useRef<maplibregl.Map | null>(null)

  const isLoading = stage !== '' && geojson === null

  // Track raw click point for snap indicator
  const [lastClickPoint, setLastClickPoint] = useState<[number, number] | null>(null)

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
      startAnimation(mapRef.current, route, graph)
    }
  }, [route, graph, startAnimation])

  // Cancel animation and clear layers when OSM is reset (stage returns to idle)
  useEffect(() => {
    if (stage === 'idle') {
      cancelAnimation()
      if (mapRef.current) clearFrontierLayers(mapRef.current)
    }
  }, [stage, cancelAnimation])

  // Track previous geojson to detect new file load
  const prevGeojsonRef = useRef<typeof geojson>(null)
  useEffect(() => {
    if (geojson !== null && prevGeojsonRef.current === null) {
      // New OSM file loaded — reset routing state
      resetRouting()
      setLastClickPoint(null)
    }
    prevGeojsonRef.current = geojson
  }, [geojson, resetRouting])

  // Cancel animation and clear frontier layers on new map click
  const handleMapClickWithCancel = useCallback((lngLat: [number, number]) => {
    cancelAnimation()
    if (mapRef.current) clearFrontierLayers(mapRef.current)
    setLastClickPoint(lngLat)
    handleMapClick(lngLat)
  }, [cancelAnimation, handleMapClick])

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
          routePath={route?.path ?? []}
          sourceSnap={sourceSnap}
          destSnap={destSnap}
          lastClickPoint={lastClickPoint}
          lastSnapPoint={lastSnapPoint}
          graph={graph}
          onMapReady={m => { mapRef.current = m }}
        />
        <SpeedPanel speed={speed} onSpeedChange={setSpeed} visible={route !== null} />
      </div>

      <LoadingOverlay stage={stage} percent={percent} visible={isLoading} />

      {!isLoading && <DropZone onFile={loadFile} disabled={isLoading} />}

      <SettingsPanel
        onClear={() => {
          clearApiKey()
          setApiKey(null)
        }}
      />

      {geojson && (
        <ModeSelector
          mode={mode}
          onModeChange={setMode}
          visible={true}
        />
      )}

      {visibleError && (
        <div className="error-toast">{visibleError}</div>
      )}

      {routingError && (
        <div className="error-toast">{routingError}</div>
      )}
    </div>
  )
}
