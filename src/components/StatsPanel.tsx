import { formatTime } from '../lib/routeStats'

export interface StatsPanelProps {
  nodesExplored: number
  totalNodes: number           // total nodes in searchHistory (filterHistory result length)
  distanceKm: number | null    // null while route not found yet
  travelTimeSeconds: number | null
  visible: boolean
}

export function StatsPanel({
  nodesExplored,
  totalNodes,
  distanceKm,
  travelTimeSeconds,
  visible,
}: StatsPanelProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 400,
        minWidth: '160px',
        padding: '10px 14px',
        background: 'rgba(10, 10, 30, 0.85)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '10px',
        color: '#ffffff',
        fontSize: '13px',
        lineHeight: '1.6',
      }}
    >
      <div>Nodes: {nodesExplored.toLocaleString()} / {totalNodes.toLocaleString()}</div>
      {distanceKm !== null && (
        <div>Distance: {distanceKm.toFixed(2)} km</div>
      )}
      {travelTimeSeconds !== null && (
        <div>Est. time: {formatTime(travelTimeSeconds)}</div>
      )}
    </div>
  )
}
