import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { PresentationView } from './PresentationView'
import {
  SlideContext,
  SlideDispatchContext,
  type SlideState,
} from '../core/store'

function renderWithContext(ui: ReactElement, state: SlideState) {
  return render(
    <SlideContext.Provider value={state}>
      <SlideDispatchContext.Provider value={() => {}}>
        {ui}
      </SlideDispatchContext.Provider>
    </SlideContext.Provider>
  )
}

describe('PresentationView', () => {
  it('renders empty state when slides.length === 0', () => {
    const state: SlideState = {
      rawMarkdown: '',
      slides: [],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    renderWithContext(<PresentationView />, state)

    expect(
      screen.getByText(/No slides loaded. Press E to open the editor./)
    ).toBeInTheDocument()
  })

  it('renders current slide content when slides exist', () => {
    const state: SlideState = {
      rawMarkdown: '# Test Slide',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# Test Slide',
        },
      ],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    renderWithContext(<PresentationView />, state)

    // SlideRenderer will render the markdown content
    expect(screen.getByText('Test Slide')).toBeInTheDocument()
  })

  it('shows SlideNavigation with correct props', () => {
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

    renderWithContext(<PresentationView />, state)

    // SlideNavigation should show "1 / 2"
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('renders first slide by default (currentIndex: 0)', () => {
    const state: SlideState = {
      rawMarkdown: '# First Slide\n---\n# Second Slide',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# First Slide',
        },
        {
          children: [],
          metadata: {},
          rawContent: '# Second Slide',
        },
      ],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: null,
    }

    renderWithContext(<PresentationView />, state)

    expect(screen.getByText('First Slide')).toBeInTheDocument()
    expect(screen.queryByText('Second Slide')).not.toBeInTheDocument()
  })
})
