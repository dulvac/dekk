import { useReducer, useEffect, useCallback, useState, lazy, Suspense } from 'react'
import {
  slideReducer,
  initialState,
  SlideContext,
  SlideDispatchContext,
} from './core/store'
import { createKeyboardHandler } from './core/keyboard'
import { loadMarkdown } from './core/loader'
import { useHashRouting, useFileDrop } from './core/hooks'
import { ErrorBoundary } from './components/ErrorBoundary'

const PresentationView = lazy(() => import('./views/PresentationView').then(m => ({ default: m.PresentationView })))
const EditorView = lazy(() => import('./views/EditorView').then(m => ({ default: m.EditorView })))
const OverviewGrid = lazy(() => import('./views/OverviewGrid').then(m => ({ default: m.OverviewGrid })))

export default function App() {
  const [state, dispatch] = useReducer(slideReducer, initialState)
  const [view, setView] = useHashRouting()
  const [externalUrl, setExternalUrl] = useState<string | null>(null)

  useFileDrop(dispatch)

  // Load markdown on mount
  useEffect(() => {
    loadMarkdown()
      .then((result) => {
        dispatch({ type: 'SET_MARKDOWN', markdown: result.markdown })
        if (result.sourceUrl) {
          setExternalUrl(result.sourceUrl)
        }
      })
      .catch((error) => {
        console.error('Failed to load markdown:', error)
      })
  }, [])

  // Keyboard handler
  useEffect(() => {
    const handler = createKeyboardHandler({
      nextSlide: () => dispatch({ type: 'NEXT_SLIDE' }),
      prevSlide: () => dispatch({ type: 'PREV_SLIDE' }),
      firstSlide: () => dispatch({ type: 'GO_TO_SLIDE', index: 0 }),
      lastSlide: () =>
        dispatch({
          type: 'GO_TO_SLIDE',
          index: state.slides.length - 1,
        }),
      toggleFullscreen: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      },
      toggleOverview: () =>
        setView((v) => (v === 'overview' ? 'presentation' : 'overview')),
      toggleEditor: () =>
        setView((v) => (v === 'editor' ? 'presentation' : 'editor')),
      escape: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else if (view !== 'presentation') {
          setView('presentation')
        }
      },
      goToSlide: (index: number) =>
        dispatch({ type: 'GO_TO_SLIDE', index }),
    })
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view, setView, state.slides.length])

  const handleSelectSlide = useCallback(
    (index: number) => {
      dispatch({ type: 'GO_TO_SLIDE', index })
      setView('presentation')
    },
    [dispatch, setView]
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
            {view === 'presentation' && <PresentationView />}
            {view === 'editor' && <EditorView />}
            {view === 'overview' && (
              <OverviewGrid onSelectSlide={handleSelectSlide} />
            )}
          </Suspense>
        </SlideDispatchContext.Provider>
      </SlideContext.Provider>
    </ErrorBoundary>
  )
}
