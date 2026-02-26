import { useState, useEffect, useCallback, useRef } from 'react'

export type Route =
  | { view: 'picker' }
  | { view: 'presentation'; deckId: string; slideIndex: number }
  | { view: 'editor'; deckId: string }
  | { view: 'overview'; deckId: string }

const MAX_DECK_ID_LENGTH = 64

export function hashToRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  if (!raw || !raw.startsWith('deck/')) return { view: 'picker' }

  const parts = raw.split('/')
  // parts: ["deck", deckId, ...rest]
  const deckId = parts[1]
  if (!deckId || deckId.length > MAX_DECK_ID_LENGTH) return { view: 'picker' }

  const rest = parts[2]
  if (rest === 'editor') return { view: 'editor', deckId }
  if (rest === 'overview') return { view: 'overview', deckId }

  const slideIndex = rest ? parseInt(rest, 10) : 0
  return {
    view: 'presentation',
    deckId,
    slideIndex: Number.isNaN(slideIndex) ? 0 : Math.max(0, slideIndex),
  }
}

export function routeToHash(route: Route): string {
  if (route.view === 'picker') return ''
  if (route.view === 'presentation') return `deck/${route.deckId}/${route.slideIndex}`
  return `deck/${route.deckId}/${route.view}`
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRouteState] = useState<Route>(() => hashToRoute(window.location.hash))
  const isInternalPush = useRef(false)

  const setRoute = useCallback((newRoute: Route) => {
    isInternalPush.current = true
    const hash = routeToHash(newRoute)
    window.location.hash = hash ? `#${hash}` : ''
    setRouteState(newRoute)
    // Reset after the current microtask so the hashchange handler skips
    queueMicrotask(() => { isInternalPush.current = false })
  }, [])

  useEffect(() => {
    function onHashChange() {
      if (isInternalPush.current) return // cycle guard
      setRouteState(hashToRoute(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return [route, setRoute]
}
