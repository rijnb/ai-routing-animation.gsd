import { formatTime } from '../lib/routeStats'

export interface StatsHudProps {
  nodesExplored: number
  totalNodes: number
  distanceKm: number | null
  travelTimeSeconds: number | null
  visible: boolean
}

export function StatsHud({
  nodesExplored,
  totalNodes,
  distanceKm,
  travelTimeSeconds,
  visible,
}: StatsHudProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 500,
        background: '#1a1a2e',
        border: '1px solid #4488ff',
        borderRadius: '4px',
        padding: '10px 16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, auto)',
        gap: '0 20px',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'opacity 0.3s ease',
        opacity: 1,
      }}
    >
      <div>
        <div
          style={{
            color: '#aabbff',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          DIST
        </div>
        <div style={{ color: '#e0e0f0', fontSize: '18px', fontWeight: 700 }}>
          {distanceKm !== null ? distanceKm.toFixed(2) + ' km' : '—'}
        </div>
      </div>

      <div>
        <div
          style={{
            color: '#aabbff',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          TIME
        </div>
        <div style={{ color: '#e0e0f0', fontSize: '18px', fontWeight: 700 }}>
          {travelTimeSeconds !== null ? formatTime(travelTimeSeconds) : '—'}
        </div>
      </div>

      <div>
        <div
          style={{
            color: '#aabbff',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          NODE
        </div>
        <div style={{ color: '#e0e0f0', fontSize: '14px', fontWeight: 700 }}>
          {nodesExplored.toLocaleString()} / {totalNodes.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
