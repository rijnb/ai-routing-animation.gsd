/**
 * ModeSelector.tsx — horizontal segmented control for routing mode selection.
 *
 * Renders three icon-only toggle buttons side-by-side across the full panel width.
 * The active mode button has aria-pressed="true" and a filled accent background.
 * Hidden when `visible` is false.
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
    flexDirection: 'row' as const,
    gap: 0,
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
  buttonBase: {
    display: 'flex',
    flex: 1,
    justifyContent: 'center' as const,
    padding: '10px 0',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    fontSize: '20px',
    color: '#ffffff',
    transition: 'background-color 0.15s ease',
  },
  buttonActive: {
    backgroundColor: '#2255cc',
  },
  buttonInactive: {
    backgroundColor: 'transparent',
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
      {MODES.map(({ value, label, icon }, index) => {
        const isActive = mode === value
        const isLast = index === MODES.length - 1
        return (
          <button
            key={value}
            title={label}
            aria-pressed={isActive}
            onClick={() => onModeChange(value)}
            style={{
              ...styles.buttonBase,
              ...(isActive ? styles.buttonActive : styles.buttonInactive),
              ...(!isLast ? { borderRight: '1px solid rgba(255,255,255,0.1)' } : {}),
            }}
          >
            <span aria-hidden="true">{icon}</span>
          </button>
        )
      })}
    </div>
  )
}
