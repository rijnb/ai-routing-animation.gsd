export function filterHistory(searchHistory: string[]): string[] {
  return searchHistory.filter(id => id !== '__vs__' && id !== '__ve__')
}

export function slicePath(
  path: [number, number][],
  cursor: number,
  total: number,
): [number, number][] {
  if (total === 0 || path.length === 0) return []
  const fraction = Math.min(cursor / total, 1)
  return path.slice(0, Math.ceil(path.length * fraction))
}

/**
 * Compute animation frame parameters from the speed multiplier (0.5–5.0).
 *
 * nodesPerFrame – how many search-history nodes to advance each active frame.
 * frameSkip     – only advance every Nth RAF tick (1 = every tick, 10 = every 10th).
 *
 * Design goals:
 *  - At max speed (5.0): 35 nodes/frame, frameSkip=1 → ~2100 nodes/sec (unchanged from before)
 *  - At default speed (1.0): 7 nodes/frame, frameSkip=1 (unchanged from before)
 *  - At min speed (0.5):  4 nodes/frame,  frameSkip=10 → ~24 nodes/sec (>10x slower than old ~240/sec)
 *
 * frameSkip is 1 for multiplier ≥ 1.0 (no change to existing feel at normal/fast speeds).
 * Below 1.0, frameSkip increases linearly from 1 → 10 as multiplier drops from 1.0 → 0.5.
 */
export function computeFrameParams(multiplier: number): { nodesPerFrame: number; frameSkip: number } {
  // nodesPerFrame: linear, same as the old formula.
  // At multiplier=0.5 → 4; at multiplier=1 → 7; at multiplier=5 → 35.
  const nodesPerFrame = Math.max(1, Math.round(7 * multiplier))

  // frameSkip: 1 for multiplier ≥ 1.0 (no extra delay).
  // For multiplier in [0.5, 1.0): linearly interpolate frameSkip from 10 → 1.
  // t=0 at multiplier=0.5, t=1 at multiplier=1.0.
  let frameSkip: number
  if (multiplier >= 1.0) {
    frameSkip = 1
  } else {
    const t = (Math.max(multiplier, 0.5) - 0.5) / 0.5   // 0..1
    frameSkip = Math.max(1, Math.round(10 - 9 * t))      // 10..1
  }

  return { nodesPerFrame, frameSkip }
}

/** @deprecated Use computeFrameParams instead */
export function computeNodesPerFrame(multiplier: number): number {
  return computeFrameParams(multiplier).nodesPerFrame
}
