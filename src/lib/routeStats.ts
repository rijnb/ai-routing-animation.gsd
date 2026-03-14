import type { RoutingMode } from './router'

export const MODE_SPEEDS_KMH: Record<RoutingMode, number> = {
  car: 50,
  bicycle: 15,
  pedestrian: 5,
}

/**
 * Estimate travel time in seconds for a given distance and routing mode.
 * @param distanceMeters - distance in metres
 * @param mode - routing mode (car | bicycle | pedestrian)
 * @returns travel time in seconds
 */
export function estimateTravelTime(distanceMeters: number, mode: RoutingMode): number {
  const speedKmh = MODE_SPEEDS_KMH[mode]
  // Compute via integer arithmetic: (distanceMeters * 3600) / (speedKmh * 1000)
  // avoids floating-point drift from dividing by irrational m/s speed values
  return Math.round((distanceMeters * 3600) / (speedKmh * 1000))
}

/**
 * Format a distance in metres as a km string with 2 decimal places.
 * @param meters - distance in metres
 * @returns e.g. "3.14 km"
 */
export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2) + ' km'
}

/**
 * Format a duration in seconds as a human-readable string.
 * >= 3600s → "Xh Ym", < 3600s → "Z min" (rounded, minimum "0 min")
 * @param seconds - duration in seconds
 * @returns e.g. "1h 1m" or "45 min"
 */
export function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }
  return `${Math.round(seconds / 60)} min`
}
