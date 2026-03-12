import { describe, it, expect } from 'vitest'
import { gzipSync, gunzipSync } from 'fflate'
import { parseOsmXml } from '../lib/osmParser'

const SMALL_OSM = `<?xml version="1.0"?>
<osm>
  <node id="1" lat="52.3" lon="4.9"/>
  <node id="2" lat="52.31" lon="4.91"/>
  <way id="10">
    <nd ref="1"/><nd ref="2"/>
    <tag k="highway" v="residential"/>
  </way>
</osm>`

describe('osmPipeline', () => {
  it('gunzipSync on a gzip-encoded Uint8Array returns decompressed bytes', () => {
    const encoder = new TextEncoder()
    const originalBytes = encoder.encode(SMALL_OSM)
    const compressed = gzipSync(originalBytes)
    const decompressed = gunzipSync(compressed)
    const decoder = new TextDecoder()
    const result = decoder.decode(decompressed)
    expect(result).toBe(SMALL_OSM)
  })

  it('full pipeline (gunzip → parseOsmXml) on a synthetic .osm.gz fixture produces at least one highway way', () => {
    const encoder = new TextEncoder()
    const originalBytes = encoder.encode(SMALL_OSM)
    const compressed = gzipSync(originalBytes)
    const decompressed = gunzipSync(compressed)
    const decoder = new TextDecoder()
    const xmlString = decoder.decode(decompressed)
    const { ways } = parseOsmXml(xmlString)
    expect(ways.length).toBeGreaterThanOrEqual(1)
  })
})
