import { useEffect, type Dispatch } from 'react'
import type { Route } from '../core/route'
import type { SlideAction } from '../core/store'
import { loadDeck, loadDeckFromApi, isCliMode, migrateOldStorage } from '../core/loader'

/**
 * Loads/unloads the deck whenever the route changes.
 * Also runs the one-time migration of old localStorage format on mount.
 */
export function useDeckLoader(
  route: Route,
  setRoute: (route: Route) => void,
  dispatch: Dispatch<SlideAction>
): void {
  // Migrate old localStorage format on mount
  useEffect(() => {
    migrateOldStorage()
  }, [])

  // Load deck when deckId changes (or when navigating to/from picker).
  // We intentionally exclude route.view so that switching between
  // presentation / editor / overview for the *same* deck does NOT
  // re-dispatch LOAD_DECK (which resets currentIndex to 0).
  const deckId = route.view === 'picker' ? null : route.deckId

  useEffect(() => {
    if (deckId === null) {
      dispatch({ type: 'UNLOAD_DECK' })
      return
    }

    if (!isCliMode()) {
      // Static mode — sync load from build-time registry
      const markdown = loadDeck(deckId)
      if (markdown) {
        dispatch({ type: 'LOAD_DECK', deckId, markdown })
      } else {
        setRoute({ view: 'picker' })
      }
      return
    }

    // CLI mode — async load from API
    let cancelled = false

    loadDeckFromApi(deckId).then((result) => {
      if (cancelled) return
      if (result.content) {
        dispatch({ type: 'LOAD_DECK', deckId, markdown: result.content })
      } else if (result.error === 'not-found') {
        setRoute({ view: 'picker' })
      }
      // On 'disconnected', don't redirect — user stays on current view
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId])
}
