import { useState } from 'react'
import { getApiKey, clearApiKey } from '../lib/apiKeyStore'

interface SettingsPanelProps {
  onClear: () => void
}

function maskKey(key: string | null): string {
  if (!key) return '—'
  return key.slice(0, 4) + '****'
}

export function SettingsPanel({ onClear }: SettingsPanelProps) {
  const [open, setOpen] = useState(false)

  const handleClear = () => {
    clearApiKey()
    setOpen(false)
    onClear()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        aria-label="Settings"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(20,20,40,0.85)',
          color: '#aabbff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        ⚙
      </button>

      {open && (
        <div
          style={{
            background: 'rgba(20,20,40,0.95)',
            border: '1px solid #2e2e4a',
            borderRadius: 8,
            padding: '14px 18px',
            minWidth: 220,
            color: '#e0e0f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p style={{ margin: '0 0 4px', fontSize: 12, color: '#8899cc' }}>API Key</p>
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 14,
              fontFamily: 'monospace',
              color: '#c0d0ff',
              wordBreak: 'break-all',
            }}
          >
            {maskKey(getApiKey())}
          </p>
          <button
            onClick={handleClear}
            style={{
              width: '100%',
              padding: '7px 0',
              borderRadius: 5,
              border: '1px solid #ff4466',
              background: 'transparent',
              color: '#ff4466',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear key
          </button>
        </div>
      )}
    </div>
  )
}
