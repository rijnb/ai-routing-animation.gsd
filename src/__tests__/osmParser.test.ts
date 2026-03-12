import { describe, it, expect } from 'vitest'
import { parseOsmXml } from '../lib/osmParser'

const FIXTURE = `<?xml version="1.0"?>
<osm>
  <node id="1" lat="52.3" lon="4.9"/>
  <node id="2" lat="52.31" lon="4.91"/>
  <way id="10">
    <nd ref="1"/><nd ref="2"/>
    <tag k="highway" v="primary"/>
  </way>
</osm>`

describe('parseOsmXml', () => {
  it('returns nodes Map with correct lon/lat (GeoJSON order: longitude first)', () => {
    const { nodes } = parseOsmXml(FIXTURE)
    const node1 = nodes.get('1')
    expect(node1).toBeDefined()
    // GeoJSON order: [lon, lat] — NOT [lat, lon]
    expect(node1![0]).toBeCloseTo(4.9)   // longitude at index 0
    expect(node1![1]).toBeCloseTo(52.3)  // latitude at index 1
  })

  it('longitude stored as index 0 — guard against lat/lon swap', () => {
    const { nodes } = parseOsmXml(FIXTURE)
    const node2 = nodes.get('2')
    expect(node2).toBeDefined()
    // If swapped, index 0 would be 52.31 which is > 10. lon=4.91 < 10.
    expect(node2![0]).toBeLessThan(10)
  })

  it('filters only highway ways from ROAD_TYPES set', () => {
    const xmlWithNonHighway = `<?xml version="1.0"?>
<osm>
  <node id="1" lat="52.3" lon="4.9"/>
  <node id="2" lat="52.31" lon="4.91"/>
  <way id="10">
    <nd ref="1"/><nd ref="2"/>
    <tag k="highway" v="primary"/>
  </way>
  <way id="11">
    <nd ref="1"/><nd ref="2"/>
    <tag k="railway" v="rail"/>
  </way>
</osm>`
    const { ways } = parseOsmXml(xmlWithNonHighway)
    expect(ways.length).toBe(1)
    expect(ways[0].tags['highway']).toBe('primary')
  })

  it('way with fewer than 2 nodes is excluded', () => {
    const xmlSingleNode = `<?xml version="1.0"?>
<osm>
  <node id="1" lat="52.3" lon="4.9"/>
  <way id="10">
    <nd ref="1"/>
    <tag k="highway" v="primary"/>
  </way>
</osm>`
    const { ways } = parseOsmXml(xmlSingleNode)
    expect(ways.length).toBe(0)
  })
})
