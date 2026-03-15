import { useState, useRef, useCallback, useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import { filterHistory, computeFrameParams } from '../lib/animationUtils'
import { updateFrontierLayers, updateRouteLayer, clearFrontierDots } from '../lib/mapHelpers'
import type { RouteResult } from '../lib/router'
import type { OsmGraph } from '../lib/osmParser'

export function useAnimation(): {
  speed: number
  setSpeed: (v: number) => void
  startAnimation: (map: maplibregl.Map, route: RouteResult, graph: OsmGraph) => void
  cancelAnimation: () => void
  nodesExplored: number
} {
  const [speed, setSpeed] = useState<number>(1.0)
  const [nodesExplored, setNodesExplored] = useState<number>(0)
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

      setNodesExplored(0)

      // Pre-build edge map: nodeId → list of { neighborId, segment coords }
      type EdgeEntry = { neighborId: string; coords: [[number, number], [number, number]] }
      const nodeEdges = new Map<string, EdgeEntry[]>()
      for (const way of graph.ways) {
        for (let i = 0; i < way.nodeRefs.length - 1; i++) {
          const idA = way.nodeRefs[i]
          const idB = way.nodeRefs[i + 1]
          const coordA = graph.nodes.get(idA)
          const coordB = graph.nodes.get(idB)
          if (!coordA || !coordB) continue
          if (!nodeEdges.has(idA)) nodeEdges.set(idA, [])
          if (!nodeEdges.has(idB)) nodeEdges.set(idB, [])
          nodeEdges.get(idA)!.push({ neighborId: idB, coords: [coordA, coordB] })
          nodeEdges.get(idB)!.push({ neighborId: idA, coords: [coordB, coordA] })
        }
      }

      let cursor = 0
      let tickCounter = 0
      const visitedSet = new Set<string>()
      const visitedEdges: [number, number][][] = []
      const seenEdges = new Set<string>()

      function frame() {
        const { nodesPerFrame, frameSkip } = computeFrameParams(speedRef.current)

        // Frame-skipping: only advance the cursor every `frameSkip` RAF ticks.
        // This makes the slow end of the slider dramatically slower without
        // changing behaviour at the fast end (where frameSkip === 1).
        tickCounter += 1
        if (tickCounter % frameSkip !== 0) {
          if (cursor < total) {
            rafHandleRef.current = requestAnimationFrame(frame)
          }
          return
        }

        const batch = history.slice(cursor, cursor + nodesPerFrame)
        cursor += nodesPerFrame
        setNodesExplored(cursor)

        for (const id of batch) {
          visitedSet.add(id)
          const edges = nodeEdges.get(id)
          if (edges) {
            for (const { neighborId, coords } of edges) {
              if (visitedSet.has(neighborId)) {
                const key = id < neighborId ? `${id}|${neighborId}` : `${neighborId}|${id}`
                if (!seenEdges.has(key)) {
                  seenEdges.add(key)
                  visitedEdges.push(coords)
                }
              }
            }
          }
        }

        const frontierCoords = batch
          .map(id => graph.nodes.get(id))
          .filter((c): c is [number, number] => c !== undefined)

        updateFrontierLayers(map, visitedEdges, frontierCoords)

        // Always show the full route path in red throughout the animation
        updateRouteLayer(map, route.path)

        if (cursor < total) {
          rafHandleRef.current = requestAnimationFrame(frame)
        } else {
          rafHandleRef.current = null
          clearFrontierDots(map)
        }
      }

      rafHandleRef.current = requestAnimationFrame(frame)
    },
    [cancelAnimation],
  )

  return { speed, setSpeed, startAnimation, cancelAnimation, nodesExplored }
}
