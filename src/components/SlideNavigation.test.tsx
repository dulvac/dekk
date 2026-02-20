import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideNavigation } from './SlideNavigation'

describe('SlideNavigation', () => {
  it('displays 1-based slide counter', () => {
    render(<SlideNavigation currentIndex={0} totalSlides={5} />)
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('displays correct counter for middle slide', () => {
    render(<SlideNavigation currentIndex={2} totalSlides={5} />)
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('handles totalSlides === 1 without division by zero', () => {
    const { container } = render(
      <SlideNavigation currentIndex={0} totalSlides={1} />
    )
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    // Progress fill should be 0% width when there's only one slide
    const fill = container.querySelector('[class*="progressFill"]')
    expect(fill).toBeInTheDocument()
    expect((fill as HTMLElement).style.width).toBe('0%')
  })

  it('shows 100% progress on last slide', () => {
    const { container } = render(
      <SlideNavigation currentIndex={4} totalSlides={5} />
    )
    const fill = container.querySelector('[class*="progressFill"]')
    expect((fill as HTMLElement).style.width).toBe('100%')
  })
})
