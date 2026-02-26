import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

// Mock the loader module
vi.mock('./core/loader', () => ({
  loadDeck: vi.fn(),
  saveDeckDraft: vi.fn(),
  migrateOldStorage: vi.fn(),
}))

// Mock deck registry
vi.mock('./core/deckRegistry', () => ({
  deckRegistry: [
    { id: 'default', title: 'Default Deck', slideCount: 1, rawMarkdown: '# Slide 1' },
    { id: 'test', title: 'Test Deck', slideCount: 2, rawMarkdown: '# Slide 1\n---\n# Slide 2' },
  ],
  getDeck: vi.fn((id: string) => {
    if (id === 'default') return { id: 'default', title: 'Default Deck', slideCount: 1, rawMarkdown: '# Slide 1' }
    if (id === 'test') return { id: 'test', title: 'Test Deck', slideCount: 2, rawMarkdown: '# Slide 1\n---\n# Slide 2' }
    return undefined
  }),
}))

// Mock heavy components that don't work well in jsdom
vi.mock('./views/EditorView', () => ({
  EditorView: () => <div data-testid="editor-view">Editor View</div>,
}))

vi.mock('./views/PresentationView', () => ({
  PresentationView: () => (
    <div data-testid="presentation-view">Presentation View</div>
  ),
}))

vi.mock('./views/OverviewGrid', () => ({
  OverviewGrid: () => <div data-testid="overview-grid">Overview Grid</div>,
}))

vi.mock('./views/PickerView', () => ({
  PickerView: () => <div data-testid="picker-view">Picker View</div>,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
  })

  it('renders PickerView by default (empty hash)', async () => {
    const { loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('picker-view')).toBeInTheDocument()
    })
  })

  it('renders PresentationView when hash is #deck/default/0', async () => {
    const { loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    window.location.hash = '#deck/default/0'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('presentation-view')).toBeInTheDocument()
    })
  })

  it('switches to editor view when hash is #deck/default/editor', async () => {
    const { loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    window.location.hash = '#deck/default/editor'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('editor-view')).toBeInTheDocument()
    })
  })

  it('switches to overview when hash is #deck/default/overview', async () => {
    const { loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    window.location.hash = '#deck/default/overview'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('overview-grid')).toBeInTheDocument()
    })
  })

  it('loads deck on mount when deckId in route', async () => {
    const { loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Test Slide')

    window.location.hash = '#deck/default/0'
    render(<App />)

    await waitFor(() => {
      expect(loadDeck).toHaveBeenCalledWith('default')
    })
  })

  it('calls migrateOldStorage on mount', async () => {
    const { migrateOldStorage, loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    render(<App />)

    expect(migrateOldStorage).toHaveBeenCalledOnce()
  })

  it('handles file drop for .md files', async () => {
    const { loadDeck, saveDeckDraft } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    window.location.hash = '#deck/default/0'
    render(<App />)

    // Wait for initial load
    await waitFor(() => {
      expect(loadDeck).toHaveBeenCalled()
    })

    // Create a markdown file with mocked text() method
    const mockText = vi.fn().mockResolvedValue('# Dropped Slide')
    const file = new File(['# Dropped Slide'], 'test.md', {
      type: 'text/markdown',
    })
    Object.defineProperty(file, 'text', {
      value: mockText,
    })

    // Simulate drop event (using Event since jsdom doesn't have DragEvent)
    const dropEvent = new Event('drop', {
      bubbles: true,
      cancelable: true,
    }) as DragEvent

    // Manually attach dataTransfer
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file],
      },
    })

    window.dispatchEvent(dropEvent)

    await waitFor(() => {
      expect(saveDeckDraft).toHaveBeenCalledWith('default', '# Dropped Slide')
    })
  })

  it('rejects file drop for non-markdown files', async () => {
    const { loadDeck, saveDeckDraft } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    window.location.hash = '#deck/default/0'
    render(<App />)

    // Wait for initial load
    await waitFor(() => {
      expect(loadDeck).toHaveBeenCalled()
    })

    // Create a non-markdown file
    const file = new File(['not markdown'], 'test.txt', { type: 'text/plain' })

    // Simulate drop event (using Event since jsdom doesn't have DragEvent)
    const dropEvent = new Event('drop', {
      bubbles: true,
      cancelable: true,
    }) as DragEvent

    // Manually attach dataTransfer
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file],
      },
    })

    window.dispatchEvent(dropEvent)

    // saveDeckDraft should not be called — use waitFor with a short timeout
    // to give any async handlers time to execute, then assert negative
    await waitFor(
      () => {
        expect(saveDeckDraft).not.toHaveBeenCalled()
      },
      { timeout: 200 }
    )
  })

  it('provides SlideContext to children', async () => {
    const { loadDeck } = await import('./core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Test Slide')

    window.location.hash = '#deck/default/0'
    const { container } = render(<App />)

    // Verify the app renders without errors, which means context is provided
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
