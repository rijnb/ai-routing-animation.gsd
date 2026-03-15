# Requirements: OSM Routing Animator

**Defined:** 2026-03-15
**Core Value:** A visually impressive, interactive A* pathfinding animation on real OpenStreetMap data with mode-aware routing — a portfolio-grade algorithm visualization demo.

## v1.1 Requirements

### Control Panel

- [ ] **PANEL-01**: User sees all controls in a single floating dark-themed panel (drop zone, mode selector, speed, playback)
- [ ] **PANEL-02**: Panel adapts when a file is loaded (drop zone collapses, routing controls appear)
- [ ] **PANEL-03**: Panel has a fixed, visually intentional position over the map

### Theme

- [x] **THEME-01**: App has a consistent dark color scheme (dark backgrounds, light text, accent colors)
- [x] **THEME-02**: Typography uses a distinctive sans-serif typeface (not Arial/system defaults) for labels and data
- [ ] **THEME-03**: All browser-default form elements are replaced with custom-styled versions

### Controls

- [ ] **CTRL-01**: Mode selector (car/bicycle/pedestrian) uses icon-based toggle buttons, not a dropdown
- [ ] **CTRL-02**: Speed slider is custom-styled to match the dark theme
- [ ] **CTRL-03**: Animation playback (play/pause/step) styled as media player controls

### Stats HUD

- [ ] **HUD-01**: Stats (distance, travel time, nodes explored) displayed in a separate HUD overlay
- [ ] **HUD-02**: HUD uses a futuristic/technical visual style (terminal readout or sci-fi data display)
- [ ] **HUD-03**: HUD only appears when a route is active

## Future Requirements

*(None identified — UI scope fully defined for v1.1)*

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile / touch UI | Desktop portfolio demo — v1.0 constraint unchanged |
| Dark/light theme toggle | Dark-only is the target aesthetic |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 6 | Complete |
| THEME-02 | Phase 6 | Complete |
| THEME-03 | Phase 6 | Pending |
| PANEL-01 | Phase 7 | Pending |
| PANEL-02 | Phase 7 | Pending |
| PANEL-03 | Phase 7 | Pending |
| CTRL-01 | Phase 8 | Pending |
| CTRL-02 | Phase 8 | Pending |
| CTRL-03 | Phase 8 | Pending |
| HUD-01 | Phase 9 | Pending |
| HUD-02 | Phase 9 | Pending |
| HUD-03 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
