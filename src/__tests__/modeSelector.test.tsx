import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeSelector } from '../components/ModeSelector'

// ──────────────────────────────────────────────────────────────────────────────
// ModeSelector tests (ROUT-02)
// ──────────────────────────────────────────────────────────────────────────────

describe('ModeSelector', () => {
  it('renders three buttons for car, bicycle, and pedestrian', () => {
    render(<ModeSelector mode="car" onModeChange={() => {}} />)
    expect(screen.getByText('Car')).toBeInTheDocument()
    expect(screen.getByText('Bicycle')).toBeInTheDocument()
    expect(screen.getByText('Pedestrian')).toBeInTheDocument()
  })

  it('clicking the bicycle button calls onModeChange with "bicycle"', () => {
    const onModeChange = vi.fn()
    render(<ModeSelector mode="car" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByText('Bicycle'))
    expect(onModeChange).toHaveBeenCalledWith('bicycle')
  })

  it('clicking the car button calls onModeChange with "car"', () => {
    const onModeChange = vi.fn()
    render(<ModeSelector mode="bicycle" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByText('Car'))
    expect(onModeChange).toHaveBeenCalledWith('car')
  })

  it('active mode button has aria-pressed="true"', () => {
    render(<ModeSelector mode="bicycle" onModeChange={() => {}} />)
    const bicycleButton = screen.getByText('Bicycle').closest('button')!
    const carButton = screen.getByText('Car').closest('button')!
    const pedestrianButton = screen.getByText('Pedestrian').closest('button')!
    expect(bicycleButton).toHaveAttribute('aria-pressed', 'true')
    expect(carButton).toHaveAttribute('aria-pressed', 'false')
    expect(pedestrianButton).toHaveAttribute('aria-pressed', 'false')
  })
})
