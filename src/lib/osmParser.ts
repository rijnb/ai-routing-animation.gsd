// Relations not parsed — Phase 1 ways-only.

const ROAD_TYPES = new Set([
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'residential',
  'service',
  'living_street',
  'pedestrian',
  'footway',
  'cycleway',
  'path',
])

export interface OsmWay {
  id: string
  nodeRefs: string[]
  tags: Record<string, string>
}

export interface OsmGraph {
  nodes: Map<string, [number, number]>
  ways: OsmWay[]
}

/**
 * parseOsmXml — accepts an OSM XML string (or Uint8Array decoded externally).
 * Nodes are stored as [lon, lat] — GeoJSON order (longitude first).
 */
export function parseOsmXml(xml: string | Uint8Array): OsmGraph {
  const xmlString =
    xml instanceof Uint8Array ? new TextDecoder().decode(xml) : xml

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  // Index nodes: id → [lon, lat]
  const nodes = new Map<string, [number, number]>()
  const nodeElements = doc.getElementsByTagName('node')
  for (let i = 0; i < nodeElements.length; i++) {
    const el = nodeElements[i]
    const id = el.getAttribute('id')!
    const lat = parseFloat(el.getAttribute('lat')!)
    const lon = parseFloat(el.getAttribute('lon')!)
    nodes.set(id, [lon, lat]) // GeoJSON order: longitude first
  }

  // Parse road ways
  const ways: OsmWay[] = []
  const wayElements = doc.getElementsByTagName('way')
  for (let i = 0; i < wayElements.length; i++) {
    const el = wayElements[i]
    const id = el.getAttribute('id')!

    // Collect tags
    const tags: Record<string, string> = {}
    const tagElements = el.getElementsByTagName('tag')
    for (let j = 0; j < tagElements.length; j++) {
      const tag = tagElements[j]
      const k = tag.getAttribute('k')!
      const v = tag.getAttribute('v')!
      tags[k] = v
    }

    // Only keep road types
    const highway = tags['highway']
    if (!highway || !ROAD_TYPES.has(highway)) continue

    // Collect node refs
    const ndElements = el.getElementsByTagName('nd')
    const nodeRefs: string[] = []
    for (let j = 0; j < ndElements.length; j++) {
      const ref = ndElements[j].getAttribute('ref')
      if (ref && nodes.has(ref)) {
        nodeRefs.push(ref)
      }
    }

    // Only keep ways with at least 2 resolved node refs
    if (nodeRefs.length < 2) continue

    ways.push({ id, nodeRefs, tags })
  }

  return { nodes, ways }
}
