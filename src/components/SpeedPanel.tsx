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
      gap: '10px',
      padding: '10px 18px',
      background: 'rgba(10, 10, 30, 0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      color: '#ffffff',
      fontSize: '13px',
    }}>
      <span aria-hidden="true">🐢</span>
      <span>Speed</span>
      <Slider min={0.5} max={5} step={0.5} value={speed} onChange={onSpeedChange} ariaLabel="Animation speed" />
    </div>
  )
}
