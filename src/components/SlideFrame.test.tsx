import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideFrame } from './SlideFrame'

describe('SlideFrame', () => {
  it('renders children inside a 16:9 viewport', () => {
    render(
      <SlideFrame>
        <p>Slide content</p>
      </SlideFrame>
    )
    expect(screen.getByText('Slide content')).toBeInTheDocument()
  })

  it('renders the scale wrapper div', () => {
    const { container } = render(
      <SlideFrame>
        <p>Content</p>
      </SlideFrame>
    )
    // SlideFrame should have nested wrapper structure
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toBeInTheDocument()
    expect(wrapper.tagName).toBe('DIV')
  })

  it('applies transform scale to the frame div', () => {
    const { container } = render(
      <SlideFrame>
        <p>Scaled content</p>
      </SlideFrame>
    )
    // The frame div (3rd level) should have transform style
    const frame = container.querySelector('[class*="frame"]')
    expect(frame).toBeInTheDocument()
    expect(frame?.getAttribute('style')).toContain('transform')
    expect(frame?.getAttribute('style')).toContain('scale')
  })

  it('renders frame content wrapper inside frame', () => {
    const { container } = render(
      <SlideFrame>
        <p>Inner content</p>
      </SlideFrame>
    )
    const frameContent = container.querySelector('[class*="frameContent"]')
    expect(frameContent).toBeInTheDocument()
    expect(frameContent?.textContent).toBe('Inner content')
  })

  it('accepts and applies additional className', () => {
    const { container } = render(
      <SlideFrame className="custom-class">
        <p>Custom</p>
      </SlideFrame>
    )
    const frame = container.querySelector('[class*="frame"]')
    expect(frame?.className).toContain('custom-class')
  })
})
