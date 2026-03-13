import { useRef, useState, useEffect, useCallback } from 'react'
import type React from 'react'
import type { OsmGraph } from '../lib/osmParser'
import type { ComponentMap } from '../lib/graphBuilder'
import type { RoutingMode, RouteResult } from '../lib/router'
import type { SnapResult } from '../lib/segmentSnap'
import { snapToNearestSegment } from '../lib/segmentSnap'

export interface RouterState {
  mode: RoutingMode
  setMode: (m: RoutingMode) => void
  sourceSnap: SnapResult | null
  destSnap: SnapResult | null
  route: RouteResult | null
  routeError: string | null
  handleMapClick: (lngLat: [number, number]) => void
  resetRouting: () => void
}

export function useRouter(
  workerRef: React.RefObject<Worker | null>,
  graph: OsmGraph | null,
  componentMap: ComponentMap | null,
): RouterState {
  const [mode, setModeState] = useState<RoutingMode>('car')
  // clickCount cycles: 0 = next click sets source, 1 = next click sets dest, 2+ wraps
  const clickCountRef = useRef<number>(0)
  const [sourceSnap, setSourceSnap] = useState<SnapResult | null>(null)
  const [destSnap, setDestSnap] = useState<SnapResult | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  // Keep stable refs to snaps for use in triggerRoute without stale closures
  const sourceSnapRef = useRef<SnapResult | null>(null)
  const destSnapRef = useRef<SnapResult | null>(null)
  const modeRef = useRef<RoutingMode>('car')

  // Subscribe to worker messages for route results
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return

    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (data.type === 'route-done') {
        setRoute({
          path: data.path,
          searchHistory: data.searchHistory,
          distance: data.distance,
          found: data.found,
        })
        setRouteError(null)
      } else if (data.type === 'route-error') {
        setRouteError(data.message)
      }
    }

    worker.addEventListener('message', handleMessage)
    return () => {
      worker.removeEventListener('message', handleMessage)
    }
    // Re-subscribe if workerRef.current changes (it won't in normal use but be safe)
  }, [workerRef])

  const triggerRoute = useCallback(
    (src: SnapResult, dst: SnapResult, routeMode: RoutingMode) => {
      if (!componentMap) return

      // Connectivity check: use segmentNodeA as representative
      const srcComponent = componentMap[src.segmentNodeA]
      const dstComponent = componentMap[dst.segmentNodeA]
      if (srcComponent !== dstComponent) {
        setRouteError('No route \u2014 points are on disconnected road segments')
        return
      }

      workerRef.current?.postMessage({
        type: 'route',
        source: src.snappedPoint,
        destination: dst.snappedPoint,
        mode: routeMode,
      })
    },
    [componentMap, workerRef],
  )

  const handleMapClick = useCallback(
    (lngLat: [number, number]) => {
      if (!graph) return

      const snapResult = snapToNearestSegment(lngLat, graph, modeRef.current, 200)
      if (!snapResult) {
        setRouteError('No road within 200m')
        return
      }

      setRouteError(null)
      const count = clickCountRef.current

      if (count % 2 === 0) {
        // Even click count → set source
        setSourceSnap(snapResult)
        sourceSnapRef.current = snapResult
        clickCountRef.current = count + 1

        // If dest already set, trigger re-route with new source
        if (destSnapRef.current) {
          triggerRoute(snapResult, destSnapRef.current, modeRef.current)
        }
      } else {
        // Odd click count → set dest
        setDestSnap(snapResult)
        destSnapRef.current = snapResult
        clickCountRef.current = count + 1

        // If source already set, trigger route
        if (sourceSnapRef.current) {
          triggerRoute(sourceSnapRef.current, snapResult, modeRef.current)
        }
      }
    },
    [graph, triggerRoute],
  )

  const setMode = useCallback(
    (newMode: RoutingMode) => {
      setModeState(newMode)
      modeRef.current = newMode

      // If both snaps exist, auto re-route with new mode
      if (sourceSnapRef.current && destSnapRef.current) {
        triggerRoute(sourceSnapRef.current, destSnapRef.current, newMode)
      }
    },
    [triggerRoute],
  )

  const resetRouting = useCallback(() => {
    setModeState('car')
    modeRef.current = 'car'
    clickCountRef.current = 0
    setSourceSnap(null)
    setDestSnap(null)
    sourceSnapRef.current = null
    destSnapRef.current = null
    setRoute(null)
    setRouteError(null)
  }, [])

  return {
    mode,
    setMode,
    sourceSnap,
    destSnap,
    route,
    routeError,
    handleMapClick,
    resetRouting,
  }
}
