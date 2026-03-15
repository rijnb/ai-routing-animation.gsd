import { useRef, useState } from 'react'
import type { RoutingMode } from '../lib/router'
import { ModeSelector } from './ModeSelector'
import { SpeedPanel } from './SpeedPanel'

interface ControlPanelProps {
  // File loading
  onFile: (file: File) => void
  isLoading: boolean
  // Routing controls
  geojson: unknown | null
  mode: RoutingMode
  onModeChange: (mode: RoutingMode) => void
  speed: number
  onSpeedChange: (v: number) => void
  route: unknown | null
  onReload: () => void
}

const BUNDLED_MAPS = [
  { label: 'Load Leiden', filename: 'leiden.osm.gz' },
  { label: 'Load Amsterdam', filename: 'amsterdam.osm.gz' },
]

export function ControlPanel({
  onFile,
  isLoading,
  geojson,
  mode,
  onModeChange,
  speed,
  onSpeedChange,
  route,
  onReload,
}: ControlPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const showDropZone = geojson === null && !isLoading
  const showRouting = geojson !== null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isLoading) setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (isLoading) return
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  const handleBundled = async (filename: string) => {
    if (isLoading) return
    const res = await fetch(`/maps/${filename}`)
    const buffer = await res.arrayBuffer()
    const file = new File([buffer], filename, { type: 'application/gzip' })
    onFile(file)
  }

  const maxHeight = showDropZone ? 260 : 180

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 500,
        width: 300,
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        borderRadius: 4,
        padding: '10px 12px',
        overflow: 'hidden',
        maxHeight,
        transition: 'max-height 0.3s ease',
      }}
    >
      {/* Loading state */}
      {isLoading && (
        <div style={{ color: 'rgba(170,187,255,0.5)', fontSize: 13, padding: '8px 0' }}>
          Loading...
        </div>
      )}

      {/* Drop zone state */}
      <div
        style={{
          opacity: showDropZone ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: showDropZone ? 'auto' : 'none',
        }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && inputRef.current?.click()}
          style={{
            padding: '14px 16px',
            borderRadius: 8,
            border: `2px dashed ${dragging ? '#4488ff' : 'rgba(170,187,255,0.35)'}`,
            background: dragging ? 'rgba(68,136,255,0.12)' : 'transparent',
            color: '#aabbff',
            textAlign: 'center',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            transition: 'border-color 0.15s, background 0.15s',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>📂</span>
          Drop an <code style={{ fontSize: 13 }}>.osm.gz</code> file here
          <br />
          <span style={{ fontSize: 12, color: 'rgba(170,187,255,0.5)' }}>
            or click to browse
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".osm.gz"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={isLoading}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
          {BUNDLED_MAPS.map(({ label, filename }) => (
            <button
              key={filename}
              onClick={() => handleBundled(filename)}
              disabled={isLoading}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                border: '1px solid rgba(68,136,255,0.5)',
                background: 'rgba(10,10,30,0.85)',
                color: isLoading ? 'rgba(68,136,255,0.3)' : '#4488ff',
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Routing controls state */}
      <div
        style={{
          opacity: showRouting ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: showRouting ? 'auto' : 'none',
        }}
      >
        <ModeSelector mode={mode} onModeChange={onModeChange} />
        <SpeedPanel speed={speed} onSpeedChange={onSpeedChange} visible={route !== null} />
        <button
          onClick={onReload}
          style={{
            color: 'rgba(170,187,255,0.5)',
            fontSize: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0 0 0',
            display: 'block',
          }}
        >
          Load new file
        </button>
      </div>
    </div>
  )
}
