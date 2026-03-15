# Phase 7: Unified Control Panel - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Consolidate all user-facing controls (drop zone, mode selector, speed slider, and future playback controls) into a single dark-themed floating panel. The panel replaces the current scattered layout — DropZone at z-index 300 and SpeedPanel/ModeSelector at z-index 400 — with one unified component at a fixed screen position. Phase 8 will add icon-based mode toggle and playback buttons into this same panel; this phase wires in what currently exists.

</domain>

<decisions>
## Implementation Decisions

### Panel position & anchoring
- Fixed position: **bottom-right**, 16px from both bottom and right edges
- **Fixed width**: ~280–320px — panel does not resize horizontally as content changes
- z-index: sufficient to float above the map (at least 400, consistent with current SpeedPanel)

### Drop zone → controls transition
- When a file loads: drop zone **fades out**, routing controls **fade in** (CSS opacity transition)
- Panel **height shrinks** after file loads — smooth CSS height/max-height transition, not instant
- When routing controls are showing: a small **"Load new file"** link or button is shown below the controls, allowing the user to reload without a page refresh. Clicking it restores the drop zone state.

### Panel content layout
- **Two-column grid** for routing controls:
  - Row 1: Mode selector — spans full panel width
  - Row 2: Speed slider (left column) + playback controls (right column, Phase 8 will fill)
- **No section labels** — controls speak for themselves, no 'MODE' / 'SPEED' headers
- Phase 7 shows current `ModeSelector` + `Slider` (via `SpeedPanel`) only — no placeholders for Phase 8 controls
- **Tight internal padding**: 8–12px

### Panel visual style
- Background: **solid `#1a1a2e`** (opaque dark card — consistent with existing panel surfaces)
- Border: **1px solid rgba(255,255,255,0.1)** or `#2e2e4a` — subtle edge definition
- Shadow: **`0 4px 16px rgba(0,0,0,0.4)`** — lifts panel off map without drama
- Corner radius: **4px** — sharp/technical, HUD-like

### Claude's Discretion
- Whether to build a new `ControlPanel.tsx` component or restructure `App.tsx` layout
- Exact CSS transition duration and easing (suggested: ~200–300ms ease)
- How to handle the "Load new file" link styling (e.g. small muted text link vs icon button)
- Exact drop zone collapse trigger — whether `isLoading` or `geojson !== null` gates the transition

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/DropZone.tsx`: Current drop zone — position absolute, z-index 300. Will be embedded in or replaced by unified panel.
- `src/components/SpeedPanel.tsx`: Wraps `Slider.tsx` (built in Phase 6) — already uses custom dark slider. Direct reuse inside panel.
- `src/components/ModeSelector.tsx`: 77-line dropdown-style selector — will be placed in the panel's top row for now; Phase 8 replaces it with icon toggle.
- `src/components/Slider.tsx`: Custom range slider from Phase 6 — thumb accent color `#2255cc`/`#4488ff`, dark track. Ready to embed.

### Established Patterns
- **Inline styles via React `style` prop**: All component styling uses `style={{...}}` objects — no Tailwind, no CSS modules. New panel follows the same pattern.
- **Color tokens (CSS vars + JS)**: `--color-*` tokens defined in `:root` (Phase 6). Panel uses `#1a1a2e`, `rgba(255,255,255,0.1)`, `#2e2e4a` from the established palette.
- **Absolute positioning layer**: App root is `position: relative, 100vw x 100vh`. All floating UI uses `position: absolute` within it.

### Integration Points
- `src/App.tsx` line ~155: current `<div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 400 }}>` wraps SpeedPanel + ModeSelector — this wrapper becomes (or is replaced by) the unified panel
- `App.tsx` line ~144: `{!isLoading && <DropZone onFile={loadFile} disabled={isLoading} />}` — DropZone currently conditionally rendered separately; Phase 7 brings it inside the panel
- `geojson` state in App.tsx: gates whether routing controls are visible — panel reads this to switch display state

</code_context>

<specifics>
## Specific Ideas

- The panel should feel like a purposeful instrument panel, not a floating toolbar — the sharp 4px radius and solid dark background reinforce this
- The height-shrink transition when a file loads is meant to feel intentional, not jarring — smooth easing matters here

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-unified-control-panel*
*Context gathered: 2026-03-15*
