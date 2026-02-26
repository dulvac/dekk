import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { OverviewGrid } from './OverviewGrid'
import {
  SlideContext,
  SlideDispatchContext,
  type SlideState,
} from '../core/store'

function renderWithContext(
  ui: ReactElement,
  state: SlideState
) {
  return render(
    <SlideContext.Provider value={state}>
      <SlideDispatchContext.Provider value={() => {}}>
        {ui}
      </SlideDispatchContext.Provider>
    </SlideContext.Provider>
  )
}

describe('OverviewGrid', () => {
  it('renders correct number of thumbnails', () => {
    const state: SlideState = {
      rawMarkdown: '# Slide 1\n---\n# Slide 2\n---\n# Slide 3',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 1',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 2',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 3',
        },
      ],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    const onSelectSlide = vi.fn()
    const { container } = renderWithContext(
      <OverviewGrid onSelectSlide={onSelectSlide} />,
      state
    )

    // Should have 3 thumbnails (divs with onClick handlers)
    const thumbnails = container.querySelectorAll('[class*="thumbnail"]')
    expect(thumbnails.length).toBeGreaterThanOrEqual(3)
  })

  it('highlights active slide with thumbnailActive class', () => {
    const state: SlideState = {
      rawMarkdown: '# Slide 1\n---\n# Slide 2',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 1',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 2',
        },
      ],
      deckMetadata: {},
      currentIndex: 1, // Second slide is active
      currentDeck: null,
    }

    const onSelectSlide = vi.fn()
    const { container } = renderWithContext(
      <OverviewGrid onSelectSlide={onSelectSlide} />,
      state
    )

    // Find the grid container and get direct children (the actual thumbnail divs)
    const grid = container.querySelector('[class*="grid"]')
    const thumbnails = Array.from(grid?.children || [])

    // The second thumbnail (index 1) should have the active class
    expect(thumbnails[1]?.className).toMatch(/thumbnailActive/)
  })

  it('calls onSelectSlide with correct index on click', () => {
    const state: SlideState = {
      rawMarkdown: '# Slide 1\n---\n# Slide 2\n---\n# Slide 3',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 1',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 2',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 3',
        },
      ],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    const onSelectSlide = vi.fn()
    const { container } = renderWithContext(
      <OverviewGrid onSelectSlide={onSelectSlide} />,
      state
    )

    // Find the grid container and get direct children (the actual thumbnail divs)
    const grid = container.querySelector('[class*="grid"]')
    const thumbnails = Array.from(grid?.children || [])

    // Click the second thumbnail
    fireEvent.click(thumbnails[1] as Element)

    expect(onSelectSlide).toHaveBeenCalledWith(1)
  })

  it('shows slide numbers (1-based)', () => {
    const state: SlideState = {
      rawMarkdown: '# Slide 1\n---\n# Slide 2',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 1',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Slide 2',
        },
      ],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    const onSelectSlide = vi.fn()
    renderWithContext(<OverviewGrid onSelectSlide={onSelectSlide} />, state)

    // Should show 1-based numbering
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders empty grid when no slides', () => {
    const state: SlideState = {
      rawMarkdown: '',
      slides: [],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    const onSelectSlide = vi.fn()
    const { container } = renderWithContext(
      <OverviewGrid onSelectSlide={onSelectSlide} />,
      state
    )

    // Should have the grid container but no thumbnails
    expect(container.querySelector('[class*="grid"]')).toBeInTheDocument()
    const thumbnails = container.querySelectorAll('[class*="thumbnail"]')
    expect(thumbnails.length).toBe(0)
  })
})
