import { gunzipSync } from 'fflate'
import { parseOsmXml } from '../lib/osmParser'
import type { OsmGraph } from '../lib/osmParser'
import { buildRoadGeoJson, buildAdjacency } from '../lib/graphBuilder'
import type { AdjacencyList, RoutingMode } from '../lib/router'
import { aStar, haversineMeters } from '../lib/router'
import { snapToNearestSegment } from '../lib/segmentSnap'

// Worker-side state retained between messages
let osmGraph: OsmGraph | null = null
let adjacency: AdjacencyList | null = null

// Virtual node IDs for route injection
const VIRTUAL_START = '__vs__'
const VIRTUAL_END = '__ve__'

self.onmessage = (event: MessageEvent) => {
  const data = event.data

  // Backwards compatibility: if no type field, treat as 'load' with raw ArrayBuffer
  const type: string = data?.type ?? 'load'

  if (type === 'load') {
    const buffer = data?.buffer instanceof ArrayBuffer ? data.buffer : (data as ArrayBuffer)
    handleLoad(buffer)
  } else if (type === 'route') {
    handleRoute(
      data.source as [number, number],
      data.destination as [number, number],
      data.mode as RoutingMode,
    )
  }
}

function handleLoad(buffer: ArrayBuffer): void {
  try {
    self.postMessage({ type: 'progress', stage: 'Decompressing\u2026', pct: 0 })
    const decompressed = gunzipSync(new Uint8Array(buffer))

    self.postMessage({ type: 'progress', stage: 'Parsing nodes\u2026', pct: 30 })
    const decoder = new TextDecoder()
    const xmlString = decoder.decode(decompressed)
    const graph = parseOsmXml(xmlString)

    self.postMessage({ type: 'progress', stage: 'Building graph\u2026', pct: 70 })
    const geojson = buildRoadGeoJson(graph.ways, graph.nodes)

    self.postMessage({ type: 'progress', stage: 'Building routing graph\u2026', pct: 85 })
    const { adjacency: adj, componentMap } = buildAdjacency(graph.ways, graph.nodes, graph.barrierNodes)

    // Store worker-side state for routing
    osmGraph = graph
    adjacency = adj

    self.postMessage({ type: 'done', geojson, componentMap, graph: osmGraph })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'error', message })
  }
}

function handleRoute(
  source: [number, number],
  destination: [number, number],
  mode: RoutingMode,
): void {
  if (!adjacency || !osmGraph) {
    self.postMessage({ type: 'route-error', message: 'No graph loaded' })
    return
  }

  // Snap source and destination to nearest road segment
  const sourceSnap = snapToNearestSegment(source, osmGraph, mode, 200)
  if (!sourceSnap) {
    self.postMessage({ type: 'route-error', message: 'No road within 200m of source' })
    return
  }

  const destSnap = snapToNearestSegment(destination, osmGraph, mode, 200)
  if (!destSnap) {
    self.postMessage({ type: 'route-error', message: 'No road within 200m of destination' })
    return
  }

  // Shallow copy adjacency to avoid mutating shared state (Pitfall 3)
  const virtualAdjacency: AdjacencyList = { ...adjacency }

  const sourceNodeA = sourceSnap.segmentNodeA
  const sourceNodeB = sourceSnap.segmentNodeB
  const sourceCoord = sourceSnap.snappedPoint

  const destNodeA = destSnap.segmentNodeA
  const destNodeB = destSnap.segmentNodeB
  const destCoord = destSnap.snappedPoint

  const coordA = osmGraph.nodes.get(sourceNodeA)
  const coordB = osmGraph.nodes.get(sourceNodeB)
  const destCoordA = osmGraph.nodes.get(destNodeA)
  const destCoordB = osmGraph.nodes.get(destNodeB)

  // Virtual start: edges from VIRTUAL_START to the two source segment endpoints
  virtualAdjacency[VIRTUAL_START] = []
  if (coordA) {
    virtualAdjacency[VIRTUAL_START].push({
      to: sourceNodeA,
      weight: haversineMeters(sourceCoord, coordA),
      tags: {},
    })
  }
  if (coordB) {
    virtualAdjacency[VIRTUAL_START].push({
      to: sourceNodeB,
      weight: haversineMeters(sourceCoord, coordB),
      tags: {},
    })
  }

  // Virtual end: edges from the two dest segment endpoints to VIRTUAL_END
  // Use spread to avoid mutating existing arrays (shallow copy adjacency only copies the top-level object)
  virtualAdjacency[VIRTUAL_END] = []
  if (destCoordA) {
    virtualAdjacency[destNodeA] = [
      ...(virtualAdjacency[destNodeA] ?? []),
      { to: VIRTUAL_END, weight: haversineMeters(destCoordA, destCoord), tags: {} },
    ]
  }
  if (destCoordB) {
    virtualAdjacency[destNodeB] = [
      ...(virtualAdjacency[destNodeB] ?? []),
      { to: VIRTUAL_END, weight: haversineMeters(destCoordB, destCoord), tags: {} },
    ]
  }

  // Add virtual node coords so A* heuristic can compute distance to VIRTUAL_END
  const extendedNodes = new Map(osmGraph.nodes)
  extendedNodes.set(VIRTUAL_START, sourceCoord)
  extendedNodes.set(VIRTUAL_END, destCoord)

  // Run A*
  const result = aStar(virtualAdjacency, VIRTUAL_START, VIRTUAL_END, extendedNodes, mode)

  // Replace virtual node coords with actual snapped points
  let path = result.path
  if (result.found && path.length >= 2) {
    path = [sourceCoord, ...path.slice(1, -1), destCoord]
  }

  self.postMessage({
    type: 'route-done',
    path,
    searchHistory: result.searchHistory,
    distance: result.distance,
    found: result.found,
  })
}
