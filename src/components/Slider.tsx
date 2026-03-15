import { useRef } from 'react'

interface SliderProps {
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  width?: number
  ariaLabel?: string
}

function calcValue(clientX: number, rect: DOMRect, min: number, max: number, step: number): number {
  const ratio = (clientX - rect.left) / rect.width
  const raw = min + ratio * (max - min)
  const snapped = Math.round(raw / step) * step
  return Math.min(max, Math.max(min, snapped))
}

export function Slider({ min, max, step, value, onChange, width = 120, ariaLabel }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const thumbLeft = ((value - min) / (max - min)) * width - 8

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!trackRef.current) return
    draggingRef.current = true
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {
      // setPointerCapture may be unavailable in test environments
    }
    const rect = trackRef.current.getBoundingClientRect()
    onChange(calcValue(e.clientX, rect, min, max, step))
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    onChange(calcValue(e.clientX, rect, min, max, step))
  }

  function handlePointerUp() {
    draggingRef.current = false
  }

  return (
    <div
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      style={{ position: 'relative', width: `${width}px`, height: '20px', cursor: 'pointer' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Track */}
      <div
        ref={trackRef}
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: '4px',
          background: '#2e2e4a',
          borderRadius: '2px',
        }}
      />
      {/* Thumb */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: `${thumbLeft}px`,
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#4488ff',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
