import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { EditorView } from './EditorView'
import {
  SlideContext,
  SlideDispatchContext,
  type SlideState,
} from '../core/store'

const mockSetRoute = vi.fn()

// Mock the route hook
vi.mock('../core/route', () => ({
  useRoute: () => [{ view: 'editor' as const, deckId: 'test' }, mockSetRoute],
  hashToRoute: vi.fn(),
  routeToHash: vi.fn(),
}))

// Mock CodeMirror since it doesn't work in jsdom
vi.mock('../components/MarkdownEditor', () => ({
  MarkdownEditor: ({
    value,
    onEscape,
  }: {
    value: string
    onChange: (v: string) => void
    initialSlideIndex?: number
    onCursorSlideChange?: (i: number) => void
    onEscape?: () => void
  }) => (
    <div>
      <textarea data-testid="markdown-editor" value={value} readOnly />
      {onEscape && (
        <button data-testid="mock-escape" onClick={onEscape}>
          MockEsc
        </button>
      )}
    </div>
  ),
}))

// Mock persistence module
vi.mock('../core/persistence', () => ({
  detectEnvironment: vi.fn().mockResolvedValue('dev'),
  saveToDevServer: vi.fn().mockResolvedValue(true),
  saveToGitHub: vi.fn().mockResolvedValue({ prUrl: 'https://github.com/test/test/pull/1' }),
  detectGitHubRepo: vi.fn().mockReturnValue({ owner: 'test', repo: 'test' }),
}))

// Mock token store
vi.mock('../core/token-store', () => ({
  hasToken: vi.fn().mockReturnValue(false),
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
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
  beforeEach(() => {
    mockSetRoute.mockClear()
  })

  it('renders editor and preview panes', () => {
    const state: SlideState = {
      rawMarkdown: '# Test',
      slides: [
        {
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

    // Save and Export buttons should exist
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
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
          metadata: {},
          rawContent: '# Slide 1',
        },
        {
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

  it('renders close button with correct aria-label', () => {
    const state: SlideState = {
      rawMarkdown: '# Test',
      slides: [{ metadata: {}, rawContent: '# Test' }],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    const closeBtn = screen.getByRole('button', { name: /close editor/i })
    expect(closeBtn).toBeInTheDocument()
  })

  it('navigates to presentation view when close button is clicked', () => {
    const state: SlideState = {
      rawMarkdown: '# Test',
      slides: [{ metadata: {}, rawContent: '# Test' }],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    const closeBtn = screen.getByRole('button', { name: /close editor/i })
    fireEvent.click(closeBtn)

    expect(mockSetRoute).toHaveBeenCalledWith({
      view: 'presentation',
      deckId: 'test',
      slideIndex: 0,
    })
  })

  it('calls onEscape handler from MarkdownEditor', () => {
    const state: SlideState = {
      rawMarkdown: '# Test',
      slides: [{ metadata: {}, rawContent: '# Test' }],
      deckMetadata: {},
      currentIndex: 0,
      currentDeck: 'test',
    }

    renderWithContext(<EditorView />, state)

    // The mock editor exposes an escape button
    const escBtn = screen.getByTestId('mock-escape')
    fireEvent.click(escBtn)

    expect(mockSetRoute).toHaveBeenCalledWith({
      view: 'presentation',
      deckId: 'test',
      slideIndex: 0,
    })
  })
})
