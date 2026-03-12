import { useRef, useState } from 'react'

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

const BUNDLED_MAPS = [
  { label: 'Load Leiden', filename: 'leiden.osm.gz' },
  { label: 'Load Amsterdam', filename: 'amsterdam.osm.gz' },
]

export function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleBundled = async (filename: string) => {
    if (disabled) return
    const res = await fetch(`/maps/${filename}`)
    const buffer = await res.arrayBuffer()
    const file = new File([buffer], filename, { type: 'application/gzip' })
    onFile(file)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        zIndex: 300,
      }}
    >
      {/* Drop zone area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          width: 320,
          padding: '18px 24px',
          borderRadius: 10,
          border: `2px dashed ${dragging ? '#4488ff' : 'rgba(170,187,255,0.35)'}`,
          background: dragging
            ? 'rgba(68,136,255,0.12)'
            : 'rgba(10,10,30,0.75)',
          color: disabled ? 'rgba(170,187,255,0.3)' : '#aabbff',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 14,
          backdropFilter: 'blur(6px)',
          transition: 'border-color 0.15s, background 0.15s',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>📂</span>
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
        disabled={disabled}
      />

      {/* Bundled map quick-start buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        {BUNDLED_MAPS.map(({ label, filename }) => (
          <button
            key={filename}
            onClick={() => handleBundled(filename)}
            disabled={disabled}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: '1px solid rgba(68,136,255,0.5)',
              background: 'rgba(10,10,30,0.85)',
              color: disabled ? 'rgba(68,136,255,0.3)' : '#4488ff',
              fontSize: 13,
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'opacity 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
