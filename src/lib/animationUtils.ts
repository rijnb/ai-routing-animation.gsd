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

export function computeNodesPerFrame(multiplier: number): number {
  return Math.max(1, Math.round(7 * multiplier))
}
