import { describe, it, expect } from 'vitest'
// routeStats module does not exist yet — this import causes RED until Plan 02 creates it
import { estimateTravelTime, formatDistance, formatTime } from '../lib/routeStats'

// ──────────────────────────────────────────────────────────────────────────────
// STAT-02: formatDistance — converts meters to human-readable km string
// ──────────────────────────────────────────────────────────────────────────────

describe('distance', () => {
  it('formatDistance(3141) returns "3.14 km"', () => {
    expect(formatDistance(3141)).toBe('3.14 km')
  })

  it('formatDistance(500) returns "0.50 km"', () => {
    expect(formatDistance(500)).toBe('0.50 km')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// STAT-03: estimateTravelTime — returns travel time in seconds based on mode speed
// Speeds: car=50km/h, bicycle=15km/h, pedestrian=5km/h
// ──────────────────────────────────────────────────────────────────────────────

describe('travelTime', () => {
  it('estimateTravelTime(50000, "car") returns 3600 — 50km at 50km/h = 1 hour', () => {
    expect(estimateTravelTime(50000, 'car')).toBe(3600)
  })

  it('estimateTravelTime(15000, "bicycle") returns 3600 — 15km at 15km/h = 1 hour', () => {
    expect(estimateTravelTime(15000, 'bicycle')).toBe(3600)
  })

  it('estimateTravelTime(5000, "pedestrian") returns 3600 — 5km at 5km/h = 1 hour', () => {
    expect(estimateTravelTime(5000, 'pedestrian')).toBe(3600)
  })

  it('estimateTravelTime(1000, "car") returns 72 — 1km at 50km/h = 72 seconds', () => {
    expect(estimateTravelTime(1000, 'car')).toBe(72)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// STAT-01: formatTime — converts seconds to human-readable string
// nodesExplored counter is internal to useAnimation rAF loop; unit tests here
// cover the pure formatTime function (the displayable aspect of STAT-01).
// ──────────────────────────────────────────────────────────────────────────────

describe('nodesExplored', () => {
  it('formatTime(3660) returns "1h 1m" — >= 3600s uses hours format', () => {
    expect(formatTime(3660)).toBe('1h 1m')
  })

  it('formatTime(2700) returns "45 min" — < 3600s uses minutes format', () => {
    expect(formatTime(2700)).toBe('45 min')
  })

  it('formatTime(59) returns "1 min" — rounds up, minimum 1 min', () => {
    expect(formatTime(59)).toBe('1 min')
  })

  it('formatTime(0) returns "0 min" — zero seconds edge case', () => {
    expect(formatTime(0)).toBe('0 min')
  })
})
