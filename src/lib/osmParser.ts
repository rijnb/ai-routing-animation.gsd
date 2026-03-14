// Relations not parsed — Phase 1 ways-only.
// NOTE: DOMParser is not available in Web Worker scope. This parser uses
// regex-based extraction compatible with Workers, Node, and browser main thread.

const ROAD_TYPES = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
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
  /** Nodes that carry a barrier tag: nodeId → barrier value (e.g. 'pole', 'bollard') */
  barrierNodes: Map<string, string>
}

/**
 * Extract a named XML attribute value from a tag string.
 * e.g. extractAttr('id="42" lat="52.3"', 'lat') → '52.3'
 * Returns null if attribute is not present.
 */
function extractAttr(tagStr: string, name: string): string | null {
  // Match both single and double quotes; attribute name is word-boundary matched.
  const re = new RegExp(`\\b${name}=["']([^"']*)["']`)
  const m = re.exec(tagStr)
  return m ? m[1] : null
}

/**
 * parseOsmXml — accepts an OSM XML string (or Uint8Array decoded externally).
 * Nodes are stored as [lon, lat] — GeoJSON order (longitude first).
 *
 * Uses regex-based parsing (no DOMParser) so it runs safely inside Web Workers.
 */
export function parseOsmXml(xml: string | Uint8Array): OsmGraph {
  const xmlString =
    xml instanceof Uint8Array ? new TextDecoder().decode(xml) : xml

  // Index nodes: id → [lon, lat]
  const nodes = new Map<string, [number, number]>()

  // Index barrier nodes: nodeId → barrier value (e.g. 'pole', 'bollard')
  // In OSM, barriers are almost always tagged on nodes, not on ways.
  const barrierNodes = new Map<string, string>()

  // Match all OSM node elements. Two forms exist in OSM XML:
  //   1. Self-closing:  <node id="1" lat="52.3" lon="4.9"/>
  //   2. Block:         <node id="2" lat="52.3" lon="4.9"><tag k="barrier" v="pole"/></node>
  //
  // Strategy: use a single regex that captures the opening tag attributes AND optional body.
  // The opening tag always ends with either "/>", "><tag...", or ">".
  // We use a two-phase match: first find each <node...> opening tag to get coordinates,
  // then if not self-closing, find the matching </node> to extract child tags.
  const nodeOpenRe = /<node(\s[^>]*?)(\/>|>)/g
  let m: RegExpExecArray | null

  while ((m = nodeOpenRe.exec(xmlString)) !== null) {
    const attrs = m[1]
    const closing = m[2]
    const id = extractAttr(attrs, 'id')
    const latStr = extractAttr(attrs, 'lat')
    const lonStr = extractAttr(attrs, 'lon')
    if (!id || !latStr || !lonStr) continue

    nodes.set(id, [parseFloat(lonStr), parseFloat(latStr)]) // GeoJSON order

    // Self-closing nodes have no child tags — skip barrier scan
    if (closing === '/>') continue

    // Block node: scan forward for </node> to extract child <tag> elements
    const bodyStart = m.index + m[0].length
    const bodyEnd = xmlString.indexOf('</node>', bodyStart)
    if (bodyEnd === -1) continue

    const body = xmlString.slice(bodyStart, bodyEnd)

    // Check for barrier tag in body
    const tagRe = /<tag\s([^>]*?)(?:\/>|>)/g
    let tm: RegExpExecArray | null
    while ((tm = tagRe.exec(body)) !== null) {
      const k = extractAttr(tm[1], 'k')
      const v = extractAttr(tm[1], 'v')
      if (k === 'barrier' && v) {
        barrierNodes.set(id, v)
        break
      }
    }
  }

  // Parse road ways — match <way ...>...</way> blocks
  const ways: OsmWay[] = []
  const wayBlockRe = /<way\s([^>]*?)>([\s\S]*?)<\/way>/g
  while ((m = wayBlockRe.exec(xmlString)) !== null) {
    const wayAttrs = m[1]
    const body = m[2]
    const id = extractAttr(wayAttrs, 'id')
    if (!id) continue

    // Collect tags from body
    const tags: Record<string, string> = {}
    const tagRe = /<tag\s([^>]*?)(?:\/>|>)/g
    let tm: RegExpExecArray | null
    while ((tm = tagRe.exec(body)) !== null) {
      const k = extractAttr(tm[1], 'k')
      const v = extractAttr(tm[1], 'v')
      if (k && v) tags[k] = v
    }

    // Only keep road types
    const highway = tags['highway']
    if (!highway || !ROAD_TYPES.has(highway)) continue

    // Collect node refs
    const nodeRefs: string[] = []
    const ndRe = /<nd\s([^>]*?)(?:\/>|>)/g
    let nm: RegExpExecArray | null
    while ((nm = ndRe.exec(body)) !== null) {
      const ref = extractAttr(nm[1], 'ref')
      if (ref && nodes.has(ref)) {
        nodeRefs.push(ref)
      }
    }

    // Only keep ways with at least 2 resolved node refs
    if (nodeRefs.length < 2) continue

    ways.push({ id, nodeRefs, tags })
  }

  return { nodes, ways, barrierNodes }
}
