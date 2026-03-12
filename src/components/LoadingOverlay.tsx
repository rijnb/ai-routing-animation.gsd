interface LoadingOverlayProps {
  stage: string
  percent: number
  visible: boolean
}

export function LoadingOverlay({ stage, percent, visible }: LoadingOverlayProps) {
  return (
    <div
      className="loading-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 20, 0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <p
        style={{
          margin: '0 0 20px',
          fontSize: 18,
          fontWeight: 500,
          color: '#aabbff',
          letterSpacing: 0.3,
        }}
      >
        {stage}
      </p>

      <div
        style={{
          width: 300,
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #2255cc, #4488ff)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <p
        style={{
          margin: '12px 0 0',
          fontSize: 13,
          color: 'rgba(170,187,255,0.6)',
        }}
      >
        {Math.round(percent)}%
      </p>
    </div>
  )
}
