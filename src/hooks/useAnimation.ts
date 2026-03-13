import { useState, useRef, useCallback, useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import { filterHistory, slicePath, computeNodesPerFrame } from '../lib/animationUtils'
import { updateFrontierLayers, updateRouteLayer } from '../lib/mapHelpers'
import type { RouteResult } from '../lib/router'
import type { OsmGraph } from '../lib/osmParser'

export function useAnimation(): {
  speed: number
  setSpeed: (v: number) => void
  startAnimation: (map: maplibregl.Map, route: RouteResult, graph: OsmGraph) => void
  cancelAnimation: () => void
} {
  const [speed, setSpeed] = useState<number>(1.0)
  const speedRef = useRef<number>(1.0)
  const rafHandleRef = useRef<number | null>(null)

  // Keep speedRef in sync with speed state so in-flight frames pick up slider changes
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const cancelAnimation = useCallback(() => {
    if (rafHandleRef.current !== null) {
      cancelAnimationFrame(rafHandleRef.current)
      rafHandleRef.current = null
    }
  }, [])

  const startAnimation = useCallback(
    (map: maplibregl.Map, route: RouteResult, graph: OsmGraph) => {
      cancelAnimation()

      const history = filterHistory(route.searchHistory)
      const total = history.length
      if (total === 0) return

      let cursor = 0
      const visited: [number, number][] = []

      function frame() {
        const nodesPerFrame = computeNodesPerFrame(speedRef.current)
        const batch = history.slice(cursor, cursor + nodesPerFrame)
        cursor += nodesPerFrame

        for (const id of batch) {
          const coord = graph.nodes.get(id)
          if (coord) visited.push(coord)
        }

        const frontierCoords = batch
          .map(id => graph.nodes.get(id))
          .filter((c): c is [number, number] => c !== undefined)

        updateFrontierLayers(map, visited, frontierCoords)

        const pathSlice = slicePath(route.path, cursor, total)
        updateRouteLayer(map, pathSlice)

        if (cursor < total) {
          rafHandleRef.current = requestAnimationFrame(frame)
        } else {
          // Ensure full path is shown when animation completes
          updateRouteLayer(map, route.path)
          rafHandleRef.current = null
        }
      }

      rafHandleRef.current = requestAnimationFrame(frame)
    },
    [cancelAnimation],
  )

  return { speed, setSpeed, startAnimation, cancelAnimation }
}
