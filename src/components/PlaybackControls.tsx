import { useState } from 'react'

interface PlaybackControlsProps {
  isPaused: boolean
  onPlayPause: () => void
  onStep: () => void
  disabled?: boolean
}

export function PlaybackControls({ isPaused, onPlayPause, onStep, disabled = false }: PlaybackControlsProps) {
  const [hoverPlayPause, setHoverPlayPause] = useState(false)
  const [hoverStep, setHoverStep] = useState(false)

  const buttonStyle = (hovered: boolean): React.CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: hovered && !disabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
    color: disabled ? 'rgba(224,224,240,0.3)' : '#e0e0f0',
    fontSize: 16,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  })

  return (
    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
      <button
        onClick={onPlayPause}
        disabled={disabled}
        title={isPaused ? 'Resume' : 'Pause'}
        style={buttonStyle(hoverPlayPause)}
        onMouseEnter={() => setHoverPlayPause(true)}
        onMouseLeave={() => setHoverPlayPause(false)}
      >
        {isPaused ? '▶' : '⏸'}
      </button>
      <button
        onClick={onStep}
        disabled={disabled}
        title="Step"
        style={buttonStyle(hoverStep)}
        onMouseEnter={() => setHoverStep(true)}
        onMouseLeave={() => setHoverStep(false)}
      >
        ⏭
      </button>
    </div>
  )
}
