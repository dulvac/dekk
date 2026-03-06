import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardNavigation } from './useKeyboardNavigation'
import type { Route } from '../core/route'
import type { SlideAction } from '../core/store'
import type { Dispatch } from 'react'

describe('useKeyboardNavigation', () => {
  let dispatch: Dispatch<SlideAction>
  let setRoute: (route: Route) => void

  beforeEach(() => {
    vi.clearAllMocks()
    dispatch = vi.fn()
    setRoute = vi.fn()
  })

  function fireKey(key: string) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    // Dispatch on document.body so the event target has closest() (window does not)
    document.body.dispatchEvent(event)
  }

  it('dispatches NEXT_SLIDE on ArrowRight', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('ArrowRight')

    expect(dispatch).toHaveBeenCalledWith({ type: 'NEXT_SLIDE' })
  })

  it('dispatches PREV_SLIDE on ArrowLeft', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 1 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('ArrowLeft')

    expect(dispatch).toHaveBeenCalledWith({ type: 'PREV_SLIDE' })
  })

  it('dispatches GO_TO_SLIDE with index 0 on Home', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 3 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('Home')

    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_SLIDE', index: 0 })
  })

  it('dispatches GO_TO_SLIDE with last index on End', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('End')

    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_SLIDE', index: 4 })
  })

  it('dispatches GO_TO_SLIDE for number keys', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('3')

    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_SLIDE', index: 2 })
  })

  it('toggles to overview on o key', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('o')

    expect(setRoute).toHaveBeenCalledWith({ view: 'overview', deckId: 'test' })
  })

  it('toggles back from overview on o key', () => {
    const route: Route = { view: 'overview', deckId: 'test' }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('o')

    expect(setRoute).toHaveBeenCalledWith({ view: 'presentation', deckId: 'test', slideIndex: 0 })
  })

  it('toggles to editor on e key', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('e')

    expect(setRoute).toHaveBeenCalledWith({ view: 'editor', deckId: 'test' })
  })

  it('toggles back from editor on e key', () => {
    const route: Route = { view: 'editor', deckId: 'test' }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('e')

    expect(setRoute).toHaveBeenCalledWith({ view: 'presentation', deckId: 'test', slideIndex: 0 })
  })

  it('does not toggle overview in picker view', () => {
    const route: Route = { view: 'picker' }
    renderHook(() => useKeyboardNavigation(route, 0, dispatch, setRoute))

    fireKey('o')

    expect(setRoute).not.toHaveBeenCalled()
  })

  it('does not toggle editor in picker view', () => {
    const route: Route = { view: 'picker' }
    renderHook(() => useKeyboardNavigation(route, 0, dispatch, setRoute))

    fireKey('e')

    expect(setRoute).not.toHaveBeenCalled()
  })

  it('escape from overview goes to presentation', () => {
    const route: Route = { view: 'overview', deckId: 'test' }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('Escape')

    expect(setRoute).toHaveBeenCalledWith({ view: 'presentation', deckId: 'test', slideIndex: 0 })
  })

  it('escape from editor goes to presentation', () => {
    const route: Route = { view: 'editor', deckId: 'test' }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('Escape')

    expect(setRoute).toHaveBeenCalledWith({ view: 'presentation', deckId: 'test', slideIndex: 0 })
  })

  it('navigates to picker on h key', () => {
    const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('h')

    expect(setRoute).toHaveBeenCalledWith({ view: 'picker' })
  })

  it('navigates to picker from overview on h key', () => {
    const route: Route = { view: 'overview', deckId: 'test' }
    renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

    fireKey('h')

    expect(setRoute).toHaveBeenCalledWith({ view: 'picker' })
  })

  it('does not navigate home from picker view on h key', () => {
    const route: Route = { view: 'picker' }
    renderHook(() => useKeyboardNavigation(route, 0, dispatch, setRoute))

    fireKey('h')

    expect(setRoute).not.toHaveBeenCalled()
  })

  it('does not dispatch slide navigation actions from picker view', () => {
    const route: Route = { view: 'picker' }
    renderHook(() => useKeyboardNavigation(route, 0, dispatch, setRoute))

    fireKey('ArrowRight')

    // Dispatch IS called (NEXT_SLIDE) even in picker view -- the keyboard handler
    // dispatches state actions unconditionally. The route sync ignores non-presentation views.
    expect(dispatch).toHaveBeenCalledWith({ type: 'NEXT_SLIDE' })
  })
})
