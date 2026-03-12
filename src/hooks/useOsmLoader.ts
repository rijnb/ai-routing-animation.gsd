import { useRef, useState, useEffect } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import { handleFile } from '../lib/osmLoader'

export interface OsmLoaderState {
  stage: string
  percent: number
  geojson: FeatureCollection<LineString> | null
  error: string | null
  loadFile: (file: File) => void
}

export function useOsmLoader(): OsmLoaderState {
  const workerRef = useRef<Worker | null>(null)

  const [stage, setStage] = useState<string>('')
  const [percent, setPercent] = useState<number>(0)
  const [geojson, setGeojson] = useState<FeatureCollection<LineString> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Create the Worker once on mount
    const worker = new Worker(
      new URL('../workers/osmWorker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data
      if (data.type === 'progress') {
        setStage(data.stage)
        setPercent(data.pct)
      } else if (data.type === 'done') {
        setStage('')
        setPercent(100)
        setGeojson(data.geojson)
      } else if (data.type === 'error') {
        setError(data.message)
        setStage('')
      }
    }

    worker.onerror = (event: ErrorEvent) => {
      setError(event.message)
      setStage('')
    }

    workerRef.current = worker

    // Clean up Worker on unmount
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const loadFile = (file: File) => {
    if (!workerRef.current) return
    // Reset state for new load
    setStage('Decompressing\u2026')
    setPercent(0)
    setGeojson(null)
    setError(null)
    handleFile(file, workerRef.current)
  }

  return { stage, percent, geojson, error, loadFile }
}
