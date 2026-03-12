import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { ApiKeyModal } from './components/ApiKeyModal'
import { SettingsPanel } from './components/SettingsPanel'
import { DropZone } from './components/DropZone'
import { LoadingOverlay } from './components/LoadingOverlay'
import { getApiKey, clearApiKey } from './lib/apiKeyStore'
import { useOsmLoader } from './hooks/useOsmLoader'

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(getApiKey())
  const { stage, percent, geojson, error, loadFile } = useOsmLoader()

  const isLoading = stage !== '' && geojson === null

  // Auto-dismiss error toast after 5 seconds
  const [visibleError, setVisibleError] = useState<string | null>(null)
  useEffect(() => {
    if (!error) return
    setVisibleError(error)
    const timer = setTimeout(() => setVisibleError(null), 5000)
    return () => clearTimeout(timer)
  }, [error])

  // Show ApiKeyModal if no key stored
  if (!apiKey) {
    return <ApiKeyModal onSave={(key) => setApiKey(key)} />
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <MapView apiKey={apiKey} geojson={geojson} />

      <LoadingOverlay stage={stage} percent={percent} visible={isLoading} />

      {!isLoading && <DropZone onFile={loadFile} disabled={isLoading} />}

      <SettingsPanel
        onClear={() => {
          clearApiKey()
          setApiKey(null)
        }}
      />

      {visibleError && (
        <div className="error-toast">{visibleError}</div>
      )}
    </div>
  )
}
