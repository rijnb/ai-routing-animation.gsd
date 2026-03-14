---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: [README.md]
autonomous: true
requirements: [QUICK-1]

must_haves:
  truths:
    - "README.md exists at the project root"
    - "README describes what the project does and how to run it"
    - "README includes how to obtain OSM data for input"
  artifacts:
    - path: "README.md"
      provides: "Project overview, setup instructions, usage guide"
  key_links: []
---

<objective>
Write README.md at the project root that explains what OSM Routing Animator is, how to set it up, and how to use it.

Purpose: Give any developer (or portfolio viewer) a clear entry point to understand and run the project.
Output: README.md covering project description, tech stack, setup, usage, and how to get OSM data.
</objective>

<execution_context>
@/Users/ribu/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ribu/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write README.md</name>
  <files>README.md</files>
  <action>
Create README.md at the project root with the following sections:

**Title and tagline:** "OSM Routing Animator" — Interactive A* pathfinding visualization on real OpenStreetMap data.

**What it does:** Explain that users upload a gzipped OSM file, click source and destination on the rendered map, choose a routing mode (car, bicycle, pedestrian), and watch the A* search frontier expand node-by-node while the optimal path is shown simultaneously. Emphasize this is a portfolio/demo project showing algorithm visualization on real road network data.

**Tech stack:** TypeScript, React 19, MapLibre GL JS (map rendering), fflate (in-browser gzip decompression), Vite, Vitest. Fully client-side — no backend.

**Prerequisites:** Node.js 18+, a MapLibre-compatible map tile API key (e.g. Maptiler — free tier works), a gzipped OSM extract (.osm.gz).

**Setup:**
```
npm install
cp .env.example .env    # add your map tile API key
npm run dev
```
Note: if .env.example doesn't exist yet, mention setting VITE_MAPTILER_API_KEY in a .env file.

**Getting OSM data:** Direct users to https://download.geofabrik.de for regional extracts or https://overpass-turbo.eu for custom area exports. They need a `.osm.gz` file. Small city extracts (under ~50MB compressed) work best for smooth animation.

**Usage:**
1. Open the app in a browser (defaults to http://localhost:5173)
2. Enter your map tile API key if prompted
3. Drag and drop a .osm.gz file onto the map (or use the file picker)
4. Wait for the road network to parse and render
5. Click a source point on the map, then a destination
6. Select routing mode: Car, Bicycle, or Pedestrian
7. Watch the A* search animate — frontier nodes expand in red, optimal path highlighted
8. Use the speed panel to pause, step, or fast-forward the animation
9. Drag markers to recompute a new route

**Scripts:** `npm run dev`, `npm run build`, `npm run lint`, `npx vitest run` (tests).

**Architecture note (brief):** OSM parsing and A* routing run in a Web Worker to keep the UI responsive. The routing graph is built from OSM way tags — different modes filter different highway types.

Keep the README concise and practical. No badges, no license section unless user adds one later. Use clear headings and code blocks for commands.
  </action>
  <verify>
    <automated>test -f /Users/ribu/source/rijnb/ai-routing-animation.gsd/README.md && echo "README.md exists" || echo "MISSING"</automated>
  </verify>
  <done>README.md exists at project root with all sections described above — setup instructions are copy-pasteable and OSM data sourcing is explained.</done>
</task>

</tasks>

<verification>
README.md present at project root. Contains: project description, tech stack, prerequisites, setup commands, how to get OSM data, usage walkthrough, npm scripts.
</verification>

<success_criteria>
A developer unfamiliar with the project can read README.md and know: what the project does, how to run it locally, and where to get OSM data to feed it.
</success_criteria>

<output>
After completion, create `.planning/quick/1-write-a-readme-md-at-the-top-level-direc/1-SUMMARY.md`
</output>
