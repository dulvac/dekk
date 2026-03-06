import { useReducer, useCallback, lazy, Suspense } from 'react'
import {
  slideReducer,
  initialState,
  SlideContext,
  SlideDispatchContext,
} from './core/store'
import { useRoute } from './core/route'
import { deckRegistry } from './core/deckRegistry'
import { useFileDrop } from './core/hooks'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useDeckLoader, useSaveShortcut, useKeyboardNavigation, useRouteSync } from './hooks'

const PresentationView = lazy(() => import('./views/PresentationView').then(m => ({ default: m.PresentationView })))
const EditorView = lazy(() => import('./views/EditorView').then(m => ({ default: m.EditorView })))
const OverviewGrid = lazy(() => import('./views/OverviewGrid').then(m => ({ default: m.OverviewGrid })))
const PickerView = lazy(() => import('./views/PickerView').then(m => ({ default: m.PickerView })))

export default function App() {
  const [state, dispatch] = useReducer(slideReducer, initialState)
  const [route, setRoute] = useRoute()

  useFileDrop(dispatch, state.currentDeck)
  useDeckLoader(route, setRoute, dispatch)
  useSaveShortcut(state, route)
  useKeyboardNavigation(route, state.slides.length, dispatch, setRoute)
  useRouteSync(route, state.currentIndex, setRoute)

  const handleSelectSlide = useCallback(
    (index: number) => {
      dispatch({ type: 'GO_TO_SLIDE', index })
      if (route.view !== 'picker') {
        setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: index })
      }
    },
    [dispatch, route, setRoute]
  )

  const handleSelectDeck = useCallback(
    (deckId: string) => {
      setRoute({ view: 'presentation', deckId, slideIndex: 0 })
    },
    [setRoute]
  )

  return (
    <ErrorBoundary>
      <SlideContext.Provider value={state}>
        <SlideDispatchContext.Provider value={dispatch}>
          <Suspense fallback={<div style={{ background: 'var(--mp-bg)', width: '100vw', height: '100vh' }} />}>
            {route.view === 'picker' && (
              <PickerView entries={deckRegistry} onSelectDeck={handleSelectDeck} />
            )}
            {route.view === 'presentation' && <PresentationView route={route} setRoute={setRoute} />}
            {route.view === 'editor' && <EditorView />}
            {route.view === 'overview' && (
              <OverviewGrid onSelectSlide={handleSelectSlide} />
            )}
          </Suspense>
        </SlideDispatchContext.Provider>
      </SlideContext.Provider>
    </ErrorBoundary>
  )
}
