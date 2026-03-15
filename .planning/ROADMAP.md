# Roadmap: OSM Routing Animator

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-03-14)
- 🚧 **v1.1 UI Overhaul** — Phases 6–9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Data Pipeline and Map Foundation (3/3 plans) — completed 2026-03-12
- [x] Phase 2: Routing Engine (4/4 plans) — completed 2026-03-13
- [x] Phase 3: Search Animation (3/3 plans) — completed 2026-03-13
- [x] Phase 4: Stats and Marker Interaction (3/3 plans) — completed 2026-03-14
- [x] Phase 5: One-way Streets and Access Restrictions (2/2 plans) — completed 2026-03-14

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

### 🚧 v1.1 UI Overhaul (In Progress)

**Milestone Goal:** Redesign the UI into a polished dark/techy portfolio piece — unified control panel, futuristic stats HUD, and consistent visual theme.

- [x] **Phase 6: Dark Theme Foundation** — Establish the visual design system: dark color scheme, distinctive sans-serif typography, and custom-styled form elements replacing all browser defaults (completed 2026-03-15)
- [x] **Phase 7: Unified Control Panel** — Assemble all controls into a single floating dark-themed panel with adaptive state and intentional fixed positioning (completed 2026-03-15)
- [x] **Phase 8: Custom Control Widgets** — Replace each individual control with bespoke styled versions: icon-based mode toggle, custom speed slider, media-player playback buttons (completed 2026-03-15)
- [ ] **Phase 9: Stats HUD Overlay** — Build the futuristic technical-readout HUD that displays route stats and only appears when a route is active

## Phase Details

### Phase 6: Dark Theme Foundation
**Goal**: Users see a consistent dark/techy visual theme across the entire app
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: THEME-01, THEME-02, THEME-03
**Success Criteria** (what must be TRUE):
  1. The app background, panels, and overlays all use a dark color palette with light text and accent colors — no light or unstyled surfaces visible
  2. All labels, values, and UI text render in a distinctive sans-serif typeface (not Arial or system defaults)
  3. No browser-default form elements (dropdowns, checkboxes, range inputs, buttons) are visible anywhere in the app
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Color token system and Space Grotesk typography (THEME-01, THEME-02)
- [ ] 06-02-PLAN.md — Custom Slider component replacing native range input (THEME-03)

### Phase 7: Unified Control Panel
**Goal**: Users interact with all controls through a single, purposefully placed floating panel
**Depends on**: Phase 6
**Requirements**: PANEL-01, PANEL-02, PANEL-03
**Success Criteria** (what must be TRUE):
  1. Drop zone, mode selector, speed slider, and playback controls all appear together in one dark-themed floating panel — not scattered across the page
  2. When a file is loaded, the drop zone collapses and routing controls (mode, speed, playback) become visible in its place
  3. The panel stays in a fixed, visually intentional position over the map regardless of map pan or zoom
**Plans**: 1 plan

Plans:
- [ ] 07-01-PLAN.md — Unified ControlPanel component: drop zone + routing controls in one fixed panel

### Phase 8: Custom Control Widgets
**Goal**: Users operate bespoke styled controls that match the dark/techy aesthetic
**Depends on**: Phase 7
**Requirements**: CTRL-01, CTRL-02, CTRL-03
**Success Criteria** (what must be TRUE):
  1. The mode selector shows distinct icon buttons for car, bicycle, and pedestrian — tapping one visually highlights the active mode; no dropdown is present
  2. The speed slider is custom-styled (track, thumb, and fill all match the dark theme) with no browser-default appearance
  3. Play, pause, and step controls are styled as media player buttons — recognizable transport icons, consistent with the dark theme
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — ModeSelector horizontal icon strip + SpeedPanel flush restyle (CTRL-01, CTRL-02)
- [ ] 08-02-PLAN.md — PlaybackControls component + useAnimation pause/resume/step (CTRL-03)

### Phase 9: Stats HUD Overlay
**Goal**: Users see route statistics presented as a futuristic technical readout, only when relevant
**Depends on**: Phase 8
**Requirements**: HUD-01, HUD-02, HUD-03
**Success Criteria** (what must be TRUE):
  1. Distance, travel time, and nodes explored are displayed in a separate overlay element positioned independently from the control panel
  2. The HUD visual style reads as a sci-fi or terminal data display — not generic card or tooltip styling
  3. The HUD is invisible before a route is calculated and becomes visible only once a route is active
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — StatsHud component: sci-fi 3-column instrument readout (HUD-01, HUD-02, HUD-03)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Pipeline and Map Foundation | v1.0 | 3/3 | Complete | 2026-03-12 |
| 2. Routing Engine | v1.0 | 4/4 | Complete | 2026-03-13 |
| 3. Search Animation | v1.0 | 3/3 | Complete | 2026-03-13 |
| 4. Stats and Marker Interaction | v1.0 | 3/3 | Complete | 2026-03-14 |
| 5. One-way Streets and Access Restrictions | v1.0 | 2/2 | Complete | 2026-03-14 |
| 6. Dark Theme Foundation | 2/2 | Complete   | 2026-03-15 | - |
| 7. Unified Control Panel | 1/1 | Complete   | 2026-03-15 | - |
| 8. Custom Control Widgets | 2/2 | Complete    | 2026-03-15 | - |
| 9. Stats HUD Overlay | v1.1 | 0/1 | Not started | - |
