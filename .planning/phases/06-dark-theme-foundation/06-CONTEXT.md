# Phase 6: Dark Theme Foundation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the visual design system for the v1.1 UI Overhaul: dark color tokens, Space Grotesk typography applied globally, and a custom range slider replacing the only browser-default form element (SpeedPanel). Color tokens and typography become the foundation all later phases build on.

</domain>

<decisions>
## Implementation Decisions

### Typography
- Typeface: **Space Grotesk** — clean/technical geometric sans-serif with distinctive character
- One font for everything — UI labels, values, controls (no separate monospace for data)
- Loading: Google Fonts CDN via `<link>` in index.html
- Weights to load: 300, 400, 500, 600, 700
- Apply globally via `body` in index.css — replaces `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`

### Range Slider (SpeedPanel)
- **Full replacement** — build a custom React slider component; do not CSS-hack the native input
- Phase 8 scope is now: mode icon toggle + playback buttons only (slider removed from Phase 8)
- Visual design: minimal dark track + accent-colored thumb; no fill from left
- No value label or tooltip — users tune by feel; track + thumb only
- Thumb: small, circular or rectangular, accent color (#2255cc or #4488ff)
- Track: dark background matching panel surfaces

### Claude's Discretion
- Exact color token naming convention (e.g., `--color-bg-panel` vs `--bg-panel`)
- Whether to define CSS variables in `:root` or export from a TypeScript constants module (or both)
- App.css has dead placeholder CSS variable references — Claude can wire these up or consolidate into index.css
- Exact thumb dimensions and border-radius for the custom slider

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/SpeedPanel.tsx`: Contains the native `<input type="range">` to be replaced — wraps the slider with a label and connects to animation speed state
- `index.css`: Global base styles — this is where Space Grotesk should be applied to `body`, `button`, `input`, etc.
- `App.css`: Contains dead CSS variable references (`--accent`, `--border`, `--text-h`, `--social-bg`, `--shadow`) — opportunity to define these as part of the color token system

### Established Patterns
- **Inline styles via React `style` prop**: All component styling uses inline style objects. No Tailwind, no CSS modules. Color tokens should be accessible as JS constants OR CSS variables
- **Existing color palette** (scattered across components):
  - Backgrounds: `#0a0a0a` (body), `#1a1a2e` (panels), `rgba(10,10,30,0.85)` (overlays)
  - Accent: `#2255cc` (active state), `#4488ff` (primary/buttons/links)
  - Text: `#e0e0f0` (default), `#aabbff` (secondary/labels), `#8899cc` (tertiary/hints)
  - Error: `#ff6666` / `#ff4466`
  - Borders: `#2e2e4a`, `#3a3a5a`, `rgba(255,255,255,0.15)`

### Integration Points
- `index.html`: Add `<link>` tag for Google Fonts (Space Grotesk)
- `index.css`: Update `font-family` on `body` and form elements; define CSS variable `:root` block
- `src/components/SpeedPanel.tsx`: Replace `<input type="range">` with custom slider component
- New file: `src/components/Slider.tsx` (or similar) — custom slider component

</code_context>

<specifics>
## Specific Ideas

- No specific design references given — open to Claude's judgment for color token naming and slider component structure
- The custom slider should feel at home next to the existing dark panels (`#1a1a2e` backgrounds, `#2255cc`/`#4488ff` accent)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-dark-theme-foundation*
*Context gathered: 2026-03-15*
