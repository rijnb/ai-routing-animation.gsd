# Phase 9: Stats HUD Overlay - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the existing `StatsPanel.tsx` into a futuristic technical readout overlay — displayed only when a route is active, positioned independently from the bottom-right control panel. The component already exists with correct data and visibility logic; this phase is a visual overhaul to meet HUD-01, HUD-02, and HUD-03.

</domain>

<decisions>
## Implementation Decisions

### Visual aesthetic
- **Style:** Sci-fi data panel — sharp edges, accent-colored border, instrument readout feel
- **Background:** Solid dark container (`#1a1a2e`) — same surface as ControlPanel. Readable over map backgrounds.
- **Border:** 1px solid `#4488ff` (accent blue) — distinguishes HUD from the gray-border ControlPanel
- **Corner radius:** 4px — consistent with the "sharp/technical, HUD-like" decision from Phase 7
- **Font:** Space Grotesk throughout (Phase 6 locked decision — no monospace for data)

### HUD position
- **Position:** Fixed, top-right corner — `top: 16px, right: 16px` (current StatsPanel position)
- **Margin:** 16px from edges — matches ControlPanel spacing
- **Width:** Size to content (no fixed width) — adapts to longest value, appropriate for compact data readout
- Visually diagonal from bottom-right ControlPanel: instruments top-right, controls bottom-right

### Stats presentation format
- **Layout:** Horizontal 3-column grid — label above, value below
- **Labels:** `DIST` / `TIME` / `NODE` — abbreviated but readable (not full words, not single letters)
- **Label style:** Small, dim (`#aabbff` — secondary label color from palette), uppercase
- **Value style:** Larger, bright (`#e0e0f0` — primary text), prominent
- **Nodes stat:** `1234 / 4829` format (explored / total) — shows progress
- **Live updates:** Nodes count updates in real-time during animation; distance and travel time are static (pre-calculated)

### Visibility
- HUD appears when `route !== null` (already implemented in App.tsx `visible={route !== null}`)
- HUD is invisible before a route is calculated — satisfies HUD-03
- Reveal behavior: Claude's discretion (simple fade-in is appropriate)

### Claude's Discretion
- Exact padding, column gap, and font sizes within the HUD
- Whether to keep `StatsPanel.tsx` filename or rename to `StatsHud.tsx` (either is fine)
- Subtle fade-in reveal animation approach (opacity transition)
- Whether to add a thin separator line between label and value rows

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/StatsPanel.tsx`: Existing component to redesign. Already has correct props (`nodesExplored`, `totalNodes`, `distanceKm`, `travelTimeSeconds`, `visible`). Position and visual style need overhaul; data logic is correct.
- `src/lib/routeStats.ts`: `formatTime()` and `formatDistance()` utilities already format values correctly — reuse as-is.
- `src/App.tsx` line ~140: `<StatsPanel ... visible={route !== null}>` — visibility logic already correct, no App changes needed.

### Established Patterns
- **Inline styles via React `style` prop**: All components use `style={{...}}` — no CSS modules or Tailwind. StatsPanel redesign follows same pattern.
- **Color tokens**: `#1a1a2e` (panel bg), `#4488ff` (primary accent), `#e0e0f0` (primary text), `#aabbff` (secondary labels), `#2e2e4a` (gray borders)
- **4px corner radius**: Locked decision from Phase 7 — sharp/technical, HUD-like

### Integration Points
- `src/App.tsx`: No prop changes needed — existing `nodesExplored`, `totalNodes`, `distanceKm`, `travelTimeSeconds`, `visible` props are sufficient
- If renamed to `StatsHud.tsx`: update import in `App.tsx`

</code_context>

<specifics>
## Specific Ideas

- The horizontal 3-column layout with label-above/value-below echoes instrument cluster displays (aircraft MFD, game HUDs)
- The `#4488ff` border on the HUD creates a clear visual distinction from the ControlPanel's muted borders — even though both use `#1a1a2e` surfaces, the HUD reads as "data output" vs "user input"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-stats-hud-overlay*
*Context gathered: 2026-03-15*
