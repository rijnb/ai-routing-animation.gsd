# Phase 8: Custom Control Widgets - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the three remaining placeholder/default controls with custom dark-themed widgets: (1) mode selector becomes a horizontal icon-only toggle strip, (2) speed slider wrapper is cleaned up to sit flush inside the unified panel, and (3) play/pause/step playback controls are added as media player buttons. This phase operates entirely within the existing ControlPanel component built in Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Mode selector layout
- **Horizontal strip** — 3 equal-width buttons side-by-side, spanning the full panel width
- **Icon-only** — no text labels; emoji are universally recognizable
- **Icons**: keep existing emoji — 🚗 (car), 🚲 (bicycle), 🚶 (pedestrian)
- **Active state**: filled accent background (`#2255cc`) on the active button; inactive buttons use dark/transparent background
- Replaces the current vertical emoji+text stack in `ModeSelector.tsx`

### Speed slider wrapping
- Keep turtle 🐢 / rabbit 🐇 emoji flanking the slider — personality fits the vibe
- **Flush / no inner card** — remove SpeedPanel's own `background` and `border` wrapper; slider + emoji render directly on the panel's dark surface
- The `Slider.tsx` component itself is unchanged (built in Phase 6)

### Claude's Discretion
- Playback button design (play/pause/step): icon source, button shape, size — Claude decides. Unicode transport symbols (▶ ⏸ ⏭) are appropriate; consistent with dark theme and no new dependencies
- Step granularity: advancing one animation "tick" (a single RAF frame's worth of nodes) is a reasonable default
- `useAnimation` hook extension for pause/resume/step state — implementation approach is Claude's call
- Exact button dimensions, padding, and icon sizing for mode toggle buttons
- Whether to extend or replace `ModeSelector.tsx` — extending is preferred to avoid regressions

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ModeSelector.tsx`: 77-line component with `MODES` array (value/label/icon). Needs layout changed from vertical to horizontal, text label removed. Active state logic already correct (`#2255cc` fill).
- `src/components/SpeedPanel.tsx`: Wraps `Slider.tsx` with turtle/rabbit emoji. Remove its own `background`/`border`/`borderRadius` wrapper styles — pass through to panel surface.
- `src/components/Slider.tsx`: Custom range slider — no changes needed. Already dark-themed, accent thumb.
- `src/components/ControlPanel.tsx`: Phase 7 output. Panel rows: ModeSelector (top), SpeedPanel + future playback controls (bottom row).
- `src/hooks/useAnimation.ts`: Currently exposes `startAnimation`, `cancelAnimation`, `nodesExplored`. Needs pause/resume/step state added for CTRL-03.

### Established Patterns
- **Inline styles via React `style` prop**: All components use `style={{...}}` — no CSS modules or Tailwind
- **Color tokens**: `#2255cc` (active/accent), `#4488ff` (primary), `#1a1a2e` (panel bg), `#2e2e4a` (borders), `#e0e0f0` (text), `rgba(255,255,255,0.1)` (subtle borders)
- **Existing active state**: `ModeSelector` already uses `#2255cc` for active button — keep consistent

### Integration Points
- `ControlPanel.tsx`: Phase 7 rendered `<ModeSelector>` and `<SpeedPanel>` in the routing controls section. Phase 8 modifies those components and adds playback buttons in the same row as SpeedPanel (per Phase 7's two-column grid decision: speed slider left, playback controls right)
- `src/App.tsx`: Will need to wire play/pause/step handlers from updated `useAnimation` into `ControlPanel` props

</code_context>

<specifics>
## Specific Ideas

- The mode toggle should feel like a segmented control / button group — all three buttons share the same height, with no visible separation between them (or very subtle 1px dividers)
- Panel layout for bottom row: `[🐢] slider [🐇]` (left, flex: 1) | `[▶] [⏸] [⏭]` (right, fixed width) — as established in Phase 7's two-column grid intent

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-custom-control-widgets*
*Context gathered: 2026-03-15*
