import { useReducer, useEffect, useCallback, useState, lazy, Suspense } from 'react'
import {
  slideReducer,
  initialState,
  SlideContext,
  SlideDispatchContext,
} from './core/store'
import { createKeyboardHandler } from './core/keyboard'
import { useRoute } from './core/route'
import { deckRegistry } from './core/deckRegistry'
import { loadDeck, migrateOldStorage } from './core/loader'
import { useFileDrop } from './core/hooks'
import { ErrorBoundary } from './components/ErrorBoundary'
import { exportMarkdown } from './core/exporter'

const PresentationView = lazy(() => import('./views/PresentationView').then(m => ({ default: m.PresentationView })))
const EditorView = lazy(() => import('./views/EditorView').then(m => ({ default: m.EditorView })))
const OverviewGrid = lazy(() => import('./views/OverviewGrid').then(m => ({ default: m.OverviewGrid })))
const PickerView = lazy(() => import('./views/PickerView').then(m => ({ default: m.PickerView })))

export default function App() {
  const [state, dispatch] = useReducer(slideReducer, initialState)
  const [route, setRoute] = useRoute()
  const [externalUrl, setExternalUrl] = useState<string | null>(null)

  useFileDrop(dispatch, state.currentDeck)

  // Migrate old localStorage format on mount
  useEffect(() => {
    migrateOldStorage()
  }, [])

  // Load deck when route.deckId changes
  useEffect(() => {
    if (route.view === 'picker') {
      dispatch({ type: 'UNLOAD_DECK' })
      return
    }

    const deckId = route.deckId
    const markdown = loadDeck(deckId)

    if (markdown) {
      dispatch({ type: 'LOAD_DECK', deckId, markdown })
    } else {
      // Deck not found, redirect to picker
      setRoute({ view: 'picker' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.view === 'picker' ? null : route.deckId, route.view])

  // Global Ctrl+S / Cmd+S save shortcut (separate from createKeyboardHandler, so it works inside CodeMirror)
  useEffect(() => {
    if (route.view === 'picker' || !state.rawMarkdown) return

    const handleSave = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        exportMarkdown(state.rawMarkdown, state.deckMetadata?.title, state.currentDeck ?? undefined)
      }
    }
    window.addEventListener('keydown', handleSave)
    return () => window.removeEventListener('keydown', handleSave)
  }, [state.rawMarkdown, state.deckMetadata?.title, state.currentDeck, route.view])

  // Keyboard handler
  useEffect(() => {
    const handler = createKeyboardHandler({
      nextSlide: () => {
        dispatch({ type: 'NEXT_SLIDE' })
        if (route.view === 'presentation') {
          const newIndex = Math.min(state.currentIndex + 1, state.slides.length - 1)
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: newIndex })
        }
      },
      prevSlide: () => {
        dispatch({ type: 'PREV_SLIDE' })
        if (route.view === 'presentation') {
          const newIndex = Math.max(state.currentIndex - 1, 0)
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: newIndex })
        }
      },
      firstSlide: () => {
        dispatch({ type: 'GO_TO_SLIDE', index: 0 })
        if (route.view === 'presentation') {
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: 0 })
        }
      },
      lastSlide: () => {
        const lastIndex = state.slides.length - 1
        dispatch({ type: 'GO_TO_SLIDE', index: lastIndex })
        if (route.view === 'presentation') {
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: lastIndex })
        }
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
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: state.currentIndex })
        } else {
          setRoute({ view: 'overview', deckId: route.deckId })
        }
      },
      toggleEditor: () => {
        if (route.view === 'picker') return
        if (route.view === 'editor') {
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: state.currentIndex })
        } else {
          setRoute({ view: 'editor', deckId: route.deckId })
        }
      },
      escape: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else if (route.view !== 'presentation' && route.view !== 'picker') {
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: state.currentIndex })
        }
      },
      goToSlide: (index: number) => {
        dispatch({ type: 'GO_TO_SLIDE', index })
        if (route.view === 'presentation') {
          setRoute({ view: 'presentation', deckId: route.deckId, slideIndex: index })
        }
      },
    })
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [route, state.currentIndex, state.slides.length, dispatch, setRoute])

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
          {externalUrl && (
            <div
              role="alert"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                padding: '8px 16px',
                backgroundColor: 'var(--mp-code-bg)',
                borderBottom: '2px solid var(--mp-primary)',
                color: 'var(--mp-text)',
                fontSize: '13px',
                fontFamily: 'var(--mp-font-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                External content loaded from:{' '}
                <code style={{ color: 'var(--mp-secondary)', wordBreak: 'break-all' }}>{externalUrl}</code>
              </span>
              <button
                onClick={() => setExternalUrl(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--mp-muted)',
                  color: 'var(--mp-text)',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginLeft: '16px',
                  flexShrink: 0,
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          <Suspense fallback={<div style={{ background: 'var(--mp-bg)', width: '100vw', height: '100vh' }} />}>
            {route.view === 'picker' && (
              <PickerView entries={deckRegistry} onSelectDeck={handleSelectDeck} />
            )}
            {route.view === 'presentation' && <PresentationView />}
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
