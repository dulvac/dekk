import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideRenderer } from './SlideRenderer'

// Mock Shiki highlighter to avoid async loading in tests
vi.mock('../core/highlighter', () => ({
  highlightCode: vi.fn().mockResolvedValue('<pre><code>highlighted</code></pre>'),
}))

describe('SlideRenderer', () => {
  it('renders a heading as a TitleBlock', () => {
    render(<SlideRenderer markdown="# Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders a subtitle (h2)', () => {
    render(<SlideRenderer markdown="## Subtitle" />)
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
  })

  it('renders bullet points', () => {
    render(<SlideRenderer markdown={'- First\n- Second\n- Third'} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('renders paragraphs', () => {
    render(<SlideRenderer markdown="Some body text here." />)
    expect(screen.getByText('Some body text here.')).toBeInTheDocument()
  })

  it('renders images', () => {
    render(
      <SlideRenderer markdown="![alt text](https://example.com/img.png)" />
    )
    const img = screen.getByAltText('alt text')
    expect(img).toBeInTheDocument()
  })

  // GFM tables
  it('renders GFM tables with branded components', () => {
    const md = '| Col A | Col B |\n|-------|-------|\n| val1  | val2  |'
    render(<SlideRenderer markdown={md} />)
    expect(screen.getByText('Col A')).toBeInTheDocument()
    expect(screen.getByText('val1')).toBeInTheDocument()
    // Verify table structure
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  // Inline formatting
  it('renders bold text', () => {
    render(<SlideRenderer markdown="This is **bold** text" />)
    const strong = screen.getByText('bold')
    expect(strong.tagName).toBe('STRONG')
  })

  it('renders italic text', () => {
    render(<SlideRenderer markdown="This is *italic* text" />)
    const em = screen.getByText('italic')
    expect(em.tagName).toBe('EM')
  })

  // Code blocks
  it('renders code block with language class', () => {
    const md = '```typescript\nconst x = 1\n```'
    render(<SlideRenderer markdown={md} />)
    // CodeBlock should receive the language-typescript class
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('renders inline code', () => {
    render(<SlideRenderer markdown="Use `const` for constants" />)
    const code = screen.getByText('const')
    expect(code.tagName).toBe('CODE')
  })

  // Empty/fallback
  it('renders empty content without crashing', () => {
    const { container } = render(<SlideRenderer markdown="" />)
    expect(container).toBeInTheDocument()
  })

  it('uses rawContent from slide prop when no markdown prop', () => {
    const slide = {
      children: [],
      metadata: {},
      rawContent: '# From Slide Prop',
    }
    render(<SlideRenderer slide={slide} />)
    expect(screen.getByText('From Slide Prop')).toBeInTheDocument()
  })
})
