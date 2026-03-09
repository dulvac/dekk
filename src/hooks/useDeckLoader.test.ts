import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDeckLoader } from './useDeckLoader'
import type { Route } from '../core/route'
import type { SlideAction } from '../core/store'
import type { Dispatch } from 'react'

vi.mock('../core/loader', () => ({
  loadDeck: vi.fn(),
  loadDeckFromApi: vi.fn(),
  isCliMode: vi.fn().mockReturnValue(false),
  migrateOldStorage: vi.fn(),
}))

describe('useDeckLoader', () => {
  let dispatch: Dispatch<SlideAction>
  let setRoute: (route: Route) => void

  beforeEach(() => {
    vi.clearAllMocks()
    dispatch = vi.fn()
    setRoute = vi.fn()
  })

  it('calls migrateOldStorage on mount', async () => {
    const { migrateOldStorage } = await import('../core/loader')

    const route: Route = { view: 'picker' }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(migrateOldStorage).toHaveBeenCalledOnce()
  })

  it('dispatches UNLOAD_DECK when route is picker', async () => {
    const route: Route = { view: 'picker' }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(dispatch).toHaveBeenCalledWith({ type: 'UNLOAD_DECK' })
  })

  it('dispatches LOAD_DECK when deck is found', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide 1')

    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(loadDeck).toHaveBeenCalledWith('test')
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'test', markdown: '# Slide 1' })
  })

  it('redirects to picker when deck is not found', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue(null)

    const route: Route = { view: 'presentation', deckId: 'nonexistent', slideIndex: 0 }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(setRoute).toHaveBeenCalledWith({ view: 'picker' })
  })

  it('loads deck for editor view', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Editor Slide')

    const route: Route = { view: 'editor', deckId: 'test' }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(loadDeck).toHaveBeenCalledWith('test')
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'test', markdown: '# Editor Slide' })
  })

  it('loads deck for overview view', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Overview Slide')

    const route: Route = { view: 'overview', deckId: 'test' }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(loadDeck).toHaveBeenCalledWith('test')
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'test', markdown: '# Overview Slide' })
  })

  it('does not re-dispatch LOAD_DECK when switching from overview to presentation for the same deck', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide Content')

    // Start in overview view
    const initialRoute: Route = { view: 'overview', deckId: 'test' }
    const { rerender } = renderHook<void, { route: Route }>(
      ({ route }) => useDeckLoader(route, setRoute, dispatch),
      { initialProps: { route: initialRoute } }
    )

    // LOAD_DECK dispatched once on initial render
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'test', markdown: '# Slide Content' })

    vi.clearAllMocks()

    // Switch to presentation view for the same deck
    const newRoute: Route = { view: 'presentation', deckId: 'test', slideIndex: 2 }
    rerender({ route: newRoute })

    // LOAD_DECK should NOT be dispatched again because deckId has not changed
    expect(dispatch).not.toHaveBeenCalled()
    expect(loadDeck).not.toHaveBeenCalled()
  })

  it('does not re-dispatch LOAD_DECK when switching from editor to presentation for the same deck', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Slide Content')

    // Start in editor view
    const initialRoute: Route = { view: 'editor', deckId: 'test' }
    const { rerender } = renderHook<void, { route: Route }>(
      ({ route }) => useDeckLoader(route, setRoute, dispatch),
      { initialProps: { route: initialRoute } }
    )

    expect(dispatch).toHaveBeenCalledTimes(1)
    vi.clearAllMocks()

    // Switch to presentation view for the same deck
    const newRoute: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    rerender({ route: newRoute })

    // LOAD_DECK should NOT be dispatched again
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches LOAD_DECK when deckId actually changes', async () => {
    const { loadDeck } = await import('../core/loader')
    vi.mocked(loadDeck).mockReturnValue('# Deck A')

    const initialRoute: Route = { view: 'presentation', deckId: 'deck-a', slideIndex: 0 }
    const { rerender } = renderHook<void, { route: Route }>(
      ({ route }) => useDeckLoader(route, setRoute, dispatch),
      { initialProps: { route: initialRoute } }
    )

    expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'deck-a', markdown: '# Deck A' })
    vi.clearAllMocks()

    // Switch to a different deck
    vi.mocked(loadDeck).mockReturnValue('# Deck B')
    const newRoute: Route = { view: 'presentation', deckId: 'deck-b', slideIndex: 0 }
    rerender({ route: newRoute })

    // LOAD_DECK should be dispatched for the new deck
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'deck-b', markdown: '# Deck B' })
  })
})

describe('useDeckLoader (CLI mode)', () => {
  let dispatch: Dispatch<SlideAction>
  let setRoute: (route: Route) => void

  beforeEach(async () => {
    vi.clearAllMocks()
    dispatch = vi.fn()
    setRoute = vi.fn()

    const loader = await import('../core/loader')
    vi.mocked(loader.isCliMode).mockReturnValue(true)
  })

  it('dispatches LOAD_DECK with fetched content in CLI mode', async () => {
    const { loadDeckFromApi, loadDeck } = await import('../core/loader')
    vi.mocked(loadDeckFromApi).mockResolvedValue({ content: '# API Slide' })

    const route: Route = { view: 'presentation', deckId: 'my-deck', slideIndex: 0 }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    // Should not use sync loadDeck
    expect(loadDeck).not.toHaveBeenCalled()

    // Wait for the async loadDeckFromApi to resolve
    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_DECK', deckId: 'my-deck', markdown: '# API Slide' })
    })
  })

  it('redirects to picker on not-found in CLI mode', async () => {
    const { loadDeckFromApi } = await import('../core/loader')
    vi.mocked(loadDeckFromApi).mockResolvedValue({ content: null, error: 'not-found' })

    const route: Route = { view: 'presentation', deckId: 'missing', slideIndex: 0 }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    await vi.waitFor(() => {
      expect(setRoute).toHaveBeenCalledWith({ view: 'picker' })
    })
  })

  it('does NOT redirect on disconnected error in CLI mode', async () => {
    const { loadDeckFromApi } = await import('../core/loader')
    vi.mocked(loadDeckFromApi).mockResolvedValue({ content: null, error: 'disconnected' })

    const route: Route = { view: 'presentation', deckId: 'some-deck', slideIndex: 0 }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    await vi.waitFor(() => {
      expect(loadDeckFromApi).toHaveBeenCalledWith('some-deck')
    })

    // Neither dispatch nor redirect should have been called
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_DECK' }))
    expect(setRoute).not.toHaveBeenCalled()
  })

  it('still dispatches UNLOAD_DECK for picker route in CLI mode', async () => {
    const route: Route = { view: 'picker' }
    renderHook(() => useDeckLoader(route, setRoute, dispatch))

    expect(dispatch).toHaveBeenCalledWith({ type: 'UNLOAD_DECK' })
  })

  it('cancels in-flight API request on unmount', async () => {
    const { loadDeckFromApi } = await import('../core/loader')

    // Create a promise we control
    let resolveApi!: (value: { content: string | null; error?: 'not-found' | 'disconnected' }) => void
    vi.mocked(loadDeckFromApi).mockReturnValue(new Promise((resolve) => { resolveApi = resolve }))

    const route: Route = { view: 'presentation', deckId: 'slow-deck', slideIndex: 0 }
    const { unmount } = renderHook(() => useDeckLoader(route, setRoute, dispatch))

    // Unmount before the API resolves
    unmount()

    // Now resolve the API — the callback should be cancelled
    resolveApi({ content: '# Late Response' })
    await Promise.resolve()

    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_DECK' }))
  })
})
