/**
 * ModeSelector.tsx — floating mode selector panel for routing mode selection.
 *
 * Renders three toggle buttons (car, bicycle, pedestrian). The active mode
 * button has aria-pressed="true".
 *
 * Current state: RED stub — renders buttons but click handlers do not call
 * onModeChange yet. Implementation in Plan 02-04.
 */

import React from 'react'
import type { RoutingMode } from '../lib/router'

interface ModeSelectorProps {
  mode: RoutingMode
  onModeChange: (mode: RoutingMode) => void
}

const MODES: { value: RoutingMode; label: string }[] = [
  { value: 'car', label: 'Car' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'pedestrian', label: 'Pedestrian' },
]

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps): JSX.Element {
  void onModeChange
  return (
    <div className="mode-selector">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          aria-pressed={mode === value}
          // Stub: click handler not yet wired (RED — will call onModeChange in Plan 02-04)
        >
          {label}
        </button>
      ))}
    </div>
  )
}
