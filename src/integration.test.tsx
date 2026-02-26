import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { parseMarkdown } from './core/parser'
import { slideReducer, initialState } from './core/store'
import { SlideRenderer } from './components/SlideRenderer'
import { saveDeckDraft, loadDeck } from './core/loader'
import { downloadMarkdown } from './core/exporter'

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

describe('Cross-feature integration: editor → localStorage → reload', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('edit in editor saves to localStorage, reload retrieves persisted content', () => {
    const deckId = 'default'
    const editedMarkdown = '# Edited Slide\n\nNew content here.\n\n---\n\n# Slide Two'

    // Step 1: Simulate editor save (EditorView calls saveDeckDraft on change)
    saveDeckDraft(deckId, editedMarkdown)

    // Step 2: Simulate reload — loadDeck reads from localStorage first
    const loaded = loadDeck(deckId)
    expect(loaded).toBe(editedMarkdown)

    // Step 3: Feed loaded content through reducer (as App does on mount)
    const state = slideReducer(initialState, {
      type: 'LOAD_DECK',
      deckId,
      markdown: loaded!,
    })

    expect(state.currentDeck).toBe(deckId)
    expect(state.slides).toHaveLength(2)
    expect(state.rawMarkdown).toBe(editedMarkdown)

    // Step 4: Render to verify content is correct
    render(<SlideRenderer slide={state.slides[0]} />)
    expect(screen.getByText('Edited Slide')).toBeInTheDocument()
    expect(screen.getByText('New content here.')).toBeInTheDocument()
  })

  it('localStorage draft takes priority over registry markdown', () => {
    const deckId = 'default'
    const draftMarkdown = '# Draft Content'

    // Save a draft
    saveDeckDraft(deckId, draftMarkdown)

    // loadDeck should return draft, not the registry's rawMarkdown
    const loaded = loadDeck(deckId)
    expect(loaded).toBe(draftMarkdown)
  })
})

describe('Cross-feature integration: export uses localMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('downloadMarkdown exports the provided content, not stale rawMarkdown', () => {
    // Simulate: user edits in editor → localMarkdown is "# Updated"
    // but rawMarkdown in store may still be old until debounce fires.
    // EditorView's handleExport uses localMarkdown, not rawMarkdown.
    const localMarkdown = '# Updated Slide\n\nFresh content'
    const staleRawMarkdown = '# Old Slide\n\nStale content'

    // The export function should use whatever markdown is passed to it
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
      style: {},
    } as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(((node: Node) => node) as (node: Node) => Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(((child: Node) => child) as (child: Node) => Node)

    // Export with localMarkdown (as EditorView does)
    const result = downloadMarkdown(localMarkdown, 'My Talk')
    expect(result).toBe(true)
    expect(clickSpy).toHaveBeenCalled()

    // Verify the blob contains localMarkdown, not staleRawMarkdown
    const blobCall = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls
    const blob = blobCall[blobCall.length - 1][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/markdown')
    // Blob size should match localMarkdown, not staleRawMarkdown
    expect(blob.size).toBe(new Blob([localMarkdown]).size)
    expect(blob.size).not.toBe(new Blob([staleRawMarkdown]).size)
  })
})

describe('Cross-feature integration: deck switching preserves state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('switching decks via LOAD_DECK resets index and loads new content', () => {
    // Load deck A, navigate to slide 2
    let state = slideReducer(initialState, {
      type: 'LOAD_DECK',
      deckId: 'deck-a',
      markdown: '# A1\n\n---\n\n# A2\n\n---\n\n# A3',
    })
    state = slideReducer(state, { type: 'GO_TO_SLIDE', index: 2 })
    expect(state.currentIndex).toBe(2)
    expect(state.currentDeck).toBe('deck-a')

    // Save draft for deck A
    saveDeckDraft('deck-a', state.rawMarkdown)

    // Switch to deck B
    state = slideReducer(state, {
      type: 'LOAD_DECK',
      deckId: 'deck-b',
      markdown: '# B1\n\n---\n\n# B2',
    })
    expect(state.currentDeck).toBe('deck-b')
    expect(state.currentIndex).toBe(0) // Reset to first slide
    expect(state.slides).toHaveLength(2)

    // Deck A's draft should still be in localStorage
    expect(loadDeck('deck-a')).toBe('# A1\n\n---\n\n# A2\n\n---\n\n# A3')

    // Switch back to deck A — should reload from localStorage
    const deckAMarkdown = loadDeck('deck-a')!
    state = slideReducer(state, {
      type: 'LOAD_DECK',
      deckId: 'deck-a',
      markdown: deckAMarkdown,
    })
    expect(state.currentDeck).toBe('deck-a')
    expect(state.slides).toHaveLength(3)
    expect(state.currentIndex).toBe(0) // LOAD_DECK always resets to 0
  })

  it('UNLOAD_DECK returns to clean initial state', () => {
    let state = slideReducer(initialState, {
      type: 'LOAD_DECK',
      deckId: 'test',
      markdown: '# Test\n\n---\n\n# Test 2',
    })
    expect(state.slides).toHaveLength(2)

    state = slideReducer(state, { type: 'UNLOAD_DECK' })
    expect(state.currentDeck).toBeNull()
    expect(state.slides).toEqual([])
    expect(state.rawMarkdown).toBe('')
    expect(state.currentIndex).toBe(0)
  })
})
