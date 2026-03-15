import { Slider } from './Slider'

interface SpeedPanelProps {
  speed: number           // 0.5 to 5.0
  onSpeedChange: (v: number) => void
  visible: boolean
}

export function SpeedPanel({ speed, onSpeedChange, visible }: SpeedPanelProps) {
  if (!visible) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      background: 'rgba(10, 10, 30, 0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '13px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <span aria-hidden="true" style={{ flexShrink: 0 }}>🐢</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Slider min={0.5} max={5} step={0.5} value={speed} onChange={onSpeedChange} ariaLabel="Animation speed" />
      </div>
      <span aria-hidden="true" style={{ flexShrink: 0 }}>🐇</span>
    </div>
  )
}
