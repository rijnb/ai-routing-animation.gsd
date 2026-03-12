import { useState } from 'react'
import { saveApiKey } from '../lib/apiKeyStore'

interface ApiKeyModalProps {
  onSave: (key: string) => void
}

export function ApiKeyModal({ onSave }: ApiKeyModalProps) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Please enter an API key.')
      return
    }
    saveApiKey(trimmed)
    onSave(trimmed)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #2e2e4a',
          borderRadius: 10,
          padding: '32px 40px',
          maxWidth: 440,
          width: '90%',
          color: '#e0e0f0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', color: '#aabbff', fontSize: 20 }}>
          TomTom API Key Required
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#8899cc', lineHeight: 1.5 }}>
          Enter your TomTom API key to load the map. The key is stored only in your browser.
        </p>
        <input
          type="text"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Paste your TomTom API key…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid #3a3a5a',
            background: '#0e0e1e',
            color: '#e0e0f0',
            fontSize: 14,
            outline: 'none',
            marginBottom: 8,
          }}
          autoFocus
        />
        {error && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#ff6666' }}>{error}</p>
        )}
        <button
          onClick={handleSave}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '10px 0',
            borderRadius: 6,
            border: 'none',
            background: '#4488ff',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save &amp; Open Map
        </button>
      </div>
    </div>
  )
}
