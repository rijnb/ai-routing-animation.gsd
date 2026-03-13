import { useState, useRef, useCallback, useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import { filterHistory, computeNodesPerFrame } from '../lib/animationUtils'
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

        // Always show the full route path in red throughout the animation
        updateRouteLayer(map, route.path)

        if (cursor < total) {
          rafHandleRef.current = requestAnimationFrame(frame)
        } else {
          rafHandleRef.current = null
        }
      }

      rafHandleRef.current = requestAnimationFrame(frame)
    },
    [cancelAnimation],
  )

  return { speed, setSpeed, startAnimation, cancelAnimation }
}
