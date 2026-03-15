import React from 'react'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Slider } from '../Slider'

describe('Slider', () => {
  const defaultProps = {
    min: 0.5,
    max: 5,
    step: 0.5,
    value: 2.5,
    onChange: vi.fn(),
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a div with role="slider"', () => {
    render(<Slider {...defaultProps} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('sets aria-valuemin, aria-valuemax, aria-valuenow', () => {
    render(<Slider {...defaultProps} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '0.5')
    expect(slider).toHaveAttribute('aria-valuemax', '5')
    expect(slider).toHaveAttribute('aria-valuenow', '2.5')
  })

  it('sets aria-label when ariaLabel prop is provided', () => {
    render(<Slider {...defaultProps} ariaLabel="Animation speed" />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-label', 'Animation speed')
  })

  it('calls onChange with snapped value when clicked at 50% of track', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Slider min={0.5} max={5} step={0.5} value={2.5} onChange={onChange} width={120} />
    )

    const sliderEl = container.querySelector('[role="slider"]') as HTMLElement

    // Mock getBoundingClientRect for the track element
    // The track is the first child div of the slider container
    const trackEl = sliderEl.querySelector('div') as HTMLElement
    Object.defineProperty(trackEl, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 120, top: 10, bottom: 14, right: 120, height: 4 }),
      configurable: true,
    })

    // Click at 50% = clientX 60
    // raw = 0.5 + (60/120) * (5 - 0.5) = 0.5 + 0.5 * 4.5 = 0.5 + 2.25 = 2.75
    // snapped to step 0.5: Math.round(2.75 / 0.5) * 0.5 = Math.round(5.5) * 0.5 = 6 * 0.5 = 3.0
    fireEvent.pointerDown(sliderEl, { clientX: 60, pointerId: 1 })
    expect(onChange).toHaveBeenCalledWith(3.0)
  })

  it('clamps value to min when clicked before track start', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Slider min={0.5} max={5} step={0.5} value={2.5} onChange={onChange} width={120} />
    )

    const sliderEl = container.querySelector('[role="slider"]') as HTMLElement
    const trackEl = sliderEl.querySelector('div') as HTMLElement
    Object.defineProperty(trackEl, 'getBoundingClientRect', {
      value: () => ({ left: 50, width: 120, top: 10, bottom: 14, right: 170, height: 4 }),
      configurable: true,
    })

    // Click at clientX=30, left of track start (50)
    // ratio = (30 - 50) / 120 = -0.167 → negative → clamp to min
    fireEvent.pointerDown(sliderEl, { clientX: 30, pointerId: 1 })
    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('clamps value to max when clicked beyond track end', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Slider min={0.5} max={5} step={0.5} value={2.5} onChange={onChange} width={120} />
    )

    const sliderEl = container.querySelector('[role="slider"]') as HTMLElement
    const trackEl = sliderEl.querySelector('div') as HTMLElement
    Object.defineProperty(trackEl, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 120, top: 10, bottom: 14, right: 120, height: 4 }),
      configurable: true,
    })

    // Click at clientX=200, beyond track end (120)
    // ratio = (200 - 0) / 120 = 1.67 → clamp to max
    fireEvent.pointerDown(sliderEl, { clientX: 200, pointerId: 1 })
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('is controlled: value prop drives thumb position', () => {
    const { rerender, container } = render(
      <Slider min={0.5} max={5} step={0.5} value={0.5} onChange={vi.fn()} width={120} />
    )

    const sliderEl = container.querySelector('[role="slider"]') as HTMLElement
    expect(sliderEl).toHaveAttribute('aria-valuenow', '0.5')

    rerender(<Slider min={0.5} max={5} step={0.5} value={5} onChange={vi.fn()} width={120} />)
    expect(sliderEl).toHaveAttribute('aria-valuenow', '5')
  })

  it('defaults width to 120 when not specified', () => {
    const { container } = render(<Slider {...defaultProps} />)
    const sliderEl = container.querySelector('[role="slider"]') as HTMLElement
    expect(sliderEl).toHaveStyle({ width: '120px' })
  })
})
