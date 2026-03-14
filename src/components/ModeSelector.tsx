/**
 * ModeSelector.tsx — floating mode selector panel for routing mode selection.
 *
 * Renders three toggle buttons (car, bicycle, pedestrian). The active mode
 * button has aria-pressed="true". Hidden when `visible` is false.
 */

import type { RoutingMode } from '../lib/router'

interface ModeSelectorProps {
  mode: RoutingMode
  onModeChange: (mode: RoutingMode) => void
  visible?: boolean
}

const MODES: { value: RoutingMode; label: string; icon: string }[] = [
  { value: 'car', label: 'Car', icon: '\u{1F697}' },
  { value: 'bicycle', label: 'Bicycle', icon: '\u{1F6B2}' },
  { value: 'pedestrian', label: 'Pedestrian', icon: '\u{1F6B6}' },
]

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  buttonBase: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    transition: 'background-color 0.15s ease',
  },
  buttonActive: {
    backgroundColor: '#2255cc',
  },
  buttonInactive: {
    backgroundColor: '#1a1a2e',
  },
}

export function ModeSelector({
  mode,
  onModeChange,
  visible = true,
}: ModeSelectorProps) {
  if (!visible) return null

  return (
    <div className="mode-selector" style={styles.container}>
      {MODES.map(({ value, label, icon }) => {
        const isActive = mode === value
        return (
          <button
            key={value}
            aria-pressed={isActive}
            onClick={() => onModeChange(value)}
            style={{
              ...styles.buttonBase,
              ...(isActive ? styles.buttonActive : styles.buttonInactive),
            }}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
