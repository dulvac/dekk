import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { EditorView } from './EditorView'
import {
  SlideContext,
  SlideDispatchContext,
  type SlideState,
} from '../core/store'

// Mock CodeMirror since it doesn't work in jsdom
vi.mock('../components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => (
    <textarea data-testid="markdown-editor" value={value} readOnly />
  ),
}))

function renderWithContext(ui: ReactElement, state: SlideState) {
  return render(
    <SlideContext.Provider value={state}>
      <SlideDispatchContext.Provider value={() => {}}>
        {ui}
      </SlideDispatchContext.Provider>
    </SlideContext.Provider>
  )
}

describe('EditorView', () => {
  it('renders editor and preview panes', () => {
    const state: SlideState = {
      rawMarkdown: '# Test',
      slides: [
        {
          children: [],
          metadata: {},
          rawContent: '# Test',
        },
      ],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    // Editor pane should exist
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()

    // Preview pane should show the slide content
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('shows empty state message when no slides', () => {
    const state: SlideState = {
      rawMarkdown: '',
      slides: [],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    expect(
      screen.getByText(/Start typing markdown on the left.../)
    ).toBeInTheDocument()
  })

  it('shows SlideNavigation when slides exist', () => {
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
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('hides SlideNavigation when no slides', () => {
    const state: SlideState = {
      rawMarkdown: '',
      slides: [],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    expect(screen.queryByText('/')).not.toBeInTheDocument()
  })
})
