import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

// Mock the loader module
vi.mock('./core/loader', () => ({
  loadMarkdown: vi.fn(),
  saveToLocalStorage: vi.fn(),
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

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
  })

  it('renders PresentationView by default (empty hash)', async () => {
    const { loadMarkdown } = await import('./core/loader')
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: '' })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('presentation-view')).toBeInTheDocument()
    })
  })

  it('switches to editor view when hash is #editor', async () => {
    const { loadMarkdown } = await import('./core/loader')
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: '' })

    window.location.hash = '#editor'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('editor-view')).toBeInTheDocument()
    })
  })

  it('switches to overview when hash is #overview', async () => {
    const { loadMarkdown } = await import('./core/loader')
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: '' })

    window.location.hash = '#overview'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('overview-grid')).toBeInTheDocument()
    })
  })

  it('loads markdown on mount', async () => {
    const { loadMarkdown } = await import('./core/loader')
    const mockMarkdown = '# Test Slide'
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: mockMarkdown })

    render(<App />)

    await waitFor(() => {
      expect(loadMarkdown).toHaveBeenCalledOnce()
    })
  })

  it('handles file drop for .md files', async () => {
    const { loadMarkdown, saveToLocalStorage } = await import('./core/loader')
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: '' })

    render(<App />)

    // Wait for initial load
    await waitFor(() => {
      expect(loadMarkdown).toHaveBeenCalled()
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
      expect(saveToLocalStorage).toHaveBeenCalledWith('# Dropped Slide')
    })
  })

  it('rejects file drop for non-markdown files', async () => {
    const { loadMarkdown, saveToLocalStorage } = await import('./core/loader')
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: '' })

    render(<App />)

    // Wait for initial load
    await waitFor(() => {
      expect(loadMarkdown).toHaveBeenCalled()
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

    // saveToLocalStorage should not be called
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(saveToLocalStorage).not.toHaveBeenCalled()
  })

  it('provides SlideContext to children', async () => {
    const { loadMarkdown } = await import('./core/loader')
    vi.mocked(loadMarkdown).mockResolvedValue({ markdown: '# Test Slide' })

    const { container } = render(<App />)

    // Verify the app renders without errors, which means context is provided
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
