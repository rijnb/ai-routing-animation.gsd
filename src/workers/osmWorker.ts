import { gunzipSync } from 'fflate'
import { parseOsmXml } from '../lib/osmParser'
import { buildRoadGeoJson } from '../lib/graphBuilder'

self.onmessage = (event: MessageEvent) => {
  try {
    const buffer: ArrayBuffer = event.data

    self.postMessage({ type: 'progress', stage: 'Decompressing\u2026', pct: 0 })
    const decompressed = gunzipSync(new Uint8Array(buffer))

    self.postMessage({ type: 'progress', stage: 'Parsing nodes\u2026', pct: 30 })
    const decoder = new TextDecoder()
    const xmlString = decoder.decode(decompressed)
    const graph = parseOsmXml(xmlString)

    self.postMessage({ type: 'progress', stage: 'Building graph\u2026', pct: 70 })
    const geojson = buildRoadGeoJson(graph.ways, graph.nodes)

    self.postMessage({ type: 'done', geojson })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'error', message })
  }
}
