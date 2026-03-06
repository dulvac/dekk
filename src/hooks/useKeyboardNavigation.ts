import { useEffect, type Dispatch } from 'react'
import { createKeyboardHandler } from '../core/keyboard'
import type { Route } from '../core/route'
import type { SlideAction } from '../core/store'

/**
 * Registers the global keyboard handler for slide navigation and view toggling.
 *
 * IMPORTANT: Slide navigation actions (next, prev, goTo, first, last) only dispatch
 * state changes. The route is synced from state.currentIndex by useRouteSync,
 * eliminating the stale-closure desync bug where rapid key presses could cause
 * route and state to diverge.
 *
 * View toggles (overview, editor, escape) still set route directly because they
 * change the view type, which is not derived from state.
 */
export function useKeyboardNavigation(
  route: Route,
  slideCount: number,
  dispatch: Dispatch<SlideAction>,
  setRoute: (route: Route) => void
): void {
  useEffect(() => {
    const handler = createKeyboardHandler({
      nextSlide: () => {
        dispatch({ type: 'NEXT_SLIDE' })
      },
      prevSlide: () => {
        dispatch({ type: 'PREV_SLIDE' })
      },
      firstSlide: () => {
        dispatch({ type: 'GO_TO_SLIDE', index: 0 })
      },
      lastSlide: () => {
        dispatch({ type: 'GO_TO_SLIDE', index: slideCount - 1 })
      },
      toggleFullscreen: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      },
      toggleOverview: () => {
        if (route.view === 'picker') return
        if (route.view === 'overview') {
          // Route back to presentation; the slide index will be synced by useRouteSync
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: 0 })
        } else {
          setRoute({ view: 'overview', deckId: route.deckId })
        }
      },
      toggleEditor: () => {
        if (route.view === 'picker') return
        if (route.view === 'editor') {
          // Route back to presentation; the slide index will be synced by useRouteSync
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: 0 })
        } else {
          setRoute({ view: 'editor', deckId: route.deckId })
        }
      },
      escape: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else if (route.view !== 'presentation' && route.view !== 'picker') {
          // Route back to presentation; the slide index will be synced by useRouteSync
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: 0 })
        }
      },
      goToSlide: (index: number) => {
        dispatch({ type: 'GO_TO_SLIDE', index })
      },
      goHome: () => {
        if (route.view === 'picker') return
        setRoute({ view: 'picker' })
      },
    })
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [route, slideCount, dispatch, setRoute])
}
