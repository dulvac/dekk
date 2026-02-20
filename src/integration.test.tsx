import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { parseMarkdown } from './core/parser'
import { slideReducer, initialState } from './core/store'
import { SlideRenderer } from './components/SlideRenderer'

// Mock Shiki highlighter to avoid async loading in tests
vi.mock('./core/highlighter', () => ({
  highlightCode: vi.fn().mockResolvedValue('<pre><code>highlighted</code></pre>'),
}))

describe('Full markdown → render pipeline', () => {
  it('parses markdown, feeds through reducer, and renders via SlideRenderer', () => {
    const rawMarkdown = '# Welcome\n\nThis is a paragraph.\n\n---\n\n## Second Slide\n\n- Item A\n- Item B'

    // Step 1: Parse markdown
    const { slides, deckMetadata } = parseMarkdown(rawMarkdown)
    expect(slides).toHaveLength(2)

    // Step 2: Feed through reducer
    const state = slideReducer(initialState, {
      type: 'SET_MARKDOWN',
      markdown: rawMarkdown,
    })
    expect(state.slides).toHaveLength(2)
    expect(state.deckMetadata).toEqual(deckMetadata)

    // Step 3: Render first slide
    render(<SlideRenderer slide={state.slides[0]} />)
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('This is a paragraph.')).toBeInTheDocument()
  })

  it('handles frontmatter through the full pipeline', () => {
    const rawMarkdown = '---\ntitle: My Talk\n---\n\n# Slide One\n\n---\n\n# Slide Two'

    const state = slideReducer(initialState, {
      type: 'SET_MARKDOWN',
      markdown: rawMarkdown,
    })

    expect(state.deckMetadata.title).toBe('My Talk')
    expect(state.slides).toHaveLength(2)

    render(<SlideRenderer slide={state.slides[0]} />)
    expect(screen.getByText('Slide One')).toBeInTheDocument()
  })

  it('handles GFM table through the full pipeline', () => {
    const rawMarkdown = '| A | B |\n|---|---|\n| 1 | 2 |'

    const state = slideReducer(initialState, {
      type: 'SET_MARKDOWN',
      markdown: rawMarkdown,
    })

    expect(state.slides).toHaveLength(1)

    render(<SlideRenderer slide={state.slides[0]} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
