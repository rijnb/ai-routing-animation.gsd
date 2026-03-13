import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Vite serves .gz files from public/ with Content-Encoding: gzip, causing the
 * browser to transparently decompress them before JavaScript sees the response.
 * Our OSM worker expects raw gzip bytes to call gunzipSync() on. This plugin
 * intercepts requests for .gz files and serves them as raw application/gzip
 * without Content-Encoding so the browser delivers the compressed bytes as-is.
 */
function rawGzipStaticPlugin(): Plugin {
  return {
    name: 'raw-gz-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.endsWith('.gz')) return next()

        // Resolve against the public directory
        const publicDir = path.resolve(__dirname, 'public')
        // Strip query string if any
        const urlPath = req.url.split('?')[0]
        const filePath = path.join(publicDir, urlPath)

        if (!fs.existsSync(filePath)) return next()

        const data = fs.readFileSync(filePath)
        res.writeHead(200, {
          'Content-Type': 'application/gzip',
          'Content-Length': data.byteLength,
          'Cache-Control': 'no-cache',
        })
        res.end(data)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rawGzipStaticPlugin()],
  // @ts-expect-error - vitest adds test config, types resolved via vitest reference
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
