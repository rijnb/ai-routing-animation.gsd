# OSM Routing Animator

Interactive A* pathfinding visualization on real OpenStreetMap data.

Upload a gzipped OSM file, click source and destination on the rendered map, choose a routing mode (car, bicycle, or pedestrian), and watch the A* search frontier expand node-by-node while the optimal path is highlighted simultaneously. A portfolio/demo project showing algorithm visualization on real road network data — fully client-side, no backend.

## Tech Stack

- **TypeScript** — throughout, no JavaScript
- **React 19** — UI components
- **MapLibre GL JS** — tile-based map rendering
- **fflate** — in-browser gzip decompression
- **Vite** — build tool
- **Vitest** — unit tests

OSM parsing and A* routing run in a Web Worker to keep the UI responsive. The routing graph is built from OSM way tags — different modes filter different highway types and apply different access rules.

## Prerequisites

- Node.js 18+
- A MapLibre-compatible map tile API key (e.g. [Maptiler](https://www.maptiler.com/) — free tier works)
- A gzipped OSM extract (`.osm.gz`) — see [Getting OSM Data](#getting-osm-data) below

## Setup

```bash
npm install
```

Create a `.env` file in the project root and add your map tile API key:

```
VITE_MAPTILER_API_KEY=your_key_here
```

Then start the development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Getting OSM Data

You need a `.osm.gz` file to feed the app. Two good sources:

- **[Geofabrik](https://download.geofabrik.de)** — pre-packaged regional and country extracts. Navigate to your region and download a `.osm.gz` file. Small city or sub-region extracts work best.
- **[Overpass Turbo](https://overpass-turbo.eu)** — custom area exports. Query a specific bounding box, export as OSM, then gzip the result.

Small city extracts under ~50MB compressed give the smoothest animation experience. Larger files parse slower and produce denser graphs.

## Usage

1. Open the app at http://localhost:5173
2. Enter your map tile API key if prompted
3. Drag and drop a `.osm.gz` file onto the map, or use the file picker
4. Wait for the road network to parse and render (progress shown on screen)
5. Click a source point on the map, then a destination point
6. Select a routing mode: **Car**, **Bicycle**, or **Pedestrian**
7. Watch the A* search animate — frontier nodes expand in red, optimal path highlighted
8. Use the speed panel to pause, step through frames, or fast-forward the animation
9. Drag either marker to recompute a new route from the updated position

## Scripts

```bash
npm run dev       # start development server
npm run build     # production build
npm run lint      # lint TypeScript/React
npx vitest run    # run unit tests
```
