# Requirements: OSM Routing Animator

**Defined:** 2026-03-12
**Core Value:** A visually impressive A* pathfinding animation on real OpenStreetMap data with mode-aware routing — portfolio-grade algorithm visualization

## v1 Requirements

### Data Pipeline

- [ ] **PIPE-01**: User can upload a .osm.gz file via file picker or drag-and-drop
- [ ] **PIPE-02**: Browser decompresses and parses the OSM XML in a Web Worker (UI remains responsive during loading)
- [ ] **PIPE-03**: Graph builder detects disconnected components and warns user if selected source/destination cannot be connected
- [ ] **PIPE-04**: Parsed road network is rendered as a visible overlay layer on the MapLibre base map

### Map Interaction

- [ ] **MAP-01**: User can click the map to set a source point — snaps to the nearest road segment suitable for the selected routing mode within 200m, at the interpolated point on that segment
- [ ] **MAP-02**: User can click the map to set a destination point — snaps to the nearest suitable road segment within 200m, at the interpolated point on that segment
- [ ] **MAP-03**: User can pan and zoom the map at any time, including during animation
- [ ] **MAP-04**: User can drag the source or destination marker to a new position, triggering a full route recalculation

### Routing

- [ ] **ROUT-01**: A* pathfinding is computed with full search history recorded before animation begins; route starts and ends at the interpolated point on the source/destination road segment (not just at graph nodes)
- [ ] **ROUT-02**: User can select routing mode: car, bicycle, or pedestrian
- [ ] **ROUT-03**: Routing modes apply different estimated travel speeds and OSM access restrictions (e.g., motorways car-only, pedestrian paths walking-only)

### Animation

- [ ] **ANIM-01**: Search frontier expands node-by-node, rendering visited/frontier nodes visually distinct
- [ ] **ANIM-02**: Optimal path grows in red simultaneously with frontier expansion (pre-calculated, always visible)
- [ ] **ANIM-03**: User can adjust animation speed via a speed slider

### Stats

- [ ] **STAT-01**: Live counter shows nodes explored during animation
- [ ] **STAT-02**: Path distance in km is displayed after route is found
- [ ] **STAT-03**: Estimated travel time is displayed, derived from routing mode speeds

## v2 Requirements

### Animation Controls

- **CTRL-01**: User can pause and resume the animation
- **CTRL-02**: User can step through the animation one node at a time
- **CTRL-03**: User can reset animation and re-run with the same source/destination

### Comparison

- **COMP-01**: User can run the same route in multiple modes and compare results side by side
- **COMP-02**: Stats panel shows diff between modes (time, distance, nodes explored)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side routing or tile servers | Fully client-side — no backend |
| Real-time traffic or dynamic data | Static OSM snapshot only |
| Turn-by-turn directions or navigation | Visual demo, not GPS app |
| Multi-stop routing | Single source-to-destination only |
| Mobile / touch-first UI | Desktop browser demo |
| Backend API or user accounts | No persistence needed for portfolio demo |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase ? | Pending |
| PIPE-02 | Phase ? | Pending |
| PIPE-03 | Phase ? | Pending |
| PIPE-04 | Phase ? | Pending |
| MAP-01 | Phase ? | Pending |
| MAP-02 | Phase ? | Pending |
| MAP-03 | Phase ? | Pending |
| ROUT-01 | Phase ? | Pending |
| ROUT-02 | Phase ? | Pending |
| ROUT-03 | Phase ? | Pending |
| ANIM-01 | Phase ? | Pending |
| ANIM-02 | Phase ? | Pending |
| ANIM-03 | Phase ? | Pending |
| STAT-01 | Phase ? | Pending |
| STAT-02 | Phase ? | Pending |
| STAT-03 | Phase ? | Pending |
| MAP-04 | Phase ? | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 0
- Unmapped: 17 ⚠️

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
