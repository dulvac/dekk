import { useReducer, useEffect, useCallback, useState } from 'react'
import {
  slideReducer,
  initialState,
  SlideContext,
  SlideDispatchContext,
} from './core/store'
import { createKeyboardHandler } from './core/keyboard'
import { loadMarkdown, saveToLocalStorage } from './core/loader'
import { PresentationView } from './views/PresentationView'
import { EditorView } from './views/EditorView'
import { OverviewGrid } from './views/OverviewGrid'
import { ErrorBoundary } from './components/ErrorBoundary'

type View = 'presentation' | 'editor' | 'overview'

function getInitialView(): View {
  const hash = window.location.hash.replace(/#\/?/, '').split('?')[0]
  if (hash === 'editor') return 'editor'
  if (hash === 'overview') return 'overview'
  return 'presentation'
}

export default function App() {
  const [state, dispatch] = useReducer(slideReducer, initialState)
  const [view, setView] = useState<View>(getInitialView)

  // Load markdown on mount
  useEffect(() => {
    loadMarkdown()
      .then((md) => {
        dispatch({ type: 'SET_MARKDOWN', markdown: md })
      })
      .catch((error) => {
        console.error('Failed to load markdown:', error)
        // Fall back to empty state - user can open editor to add content
      })
  }, [])

  // Sync hash with view
  useEffect(() => {
    const hash = view === 'presentation' ? '' : view
    window.location.hash = hash ? `#${hash}` : ''
  }, [view])

  // Listen for hash changes
  useEffect(() => {
    function onHashChange() {
      setView(getInitialView())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
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
  }, [view, state.slides.length])

  // File drop handler
  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault()
    }
    function handleDrop(e: DragEvent) {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file && (file.name.endsWith('.md') || file.type === 'text/markdown')) {
        file
          .text()
          .then((text) => {
            dispatch({ type: 'SET_MARKDOWN', markdown: text })
            saveToLocalStorage(text)
          })
          .catch((error) => {
            console.error('Failed to read dropped file:', error)
            // Silently ignore - user can try again or use editor
          })
      }
    }
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleSelectSlide = useCallback(
    (index: number) => {
      dispatch({ type: 'GO_TO_SLIDE', index })
      setView('presentation')
    },
    [dispatch]
  )

  return (
    <ErrorBoundary>
      <SlideContext.Provider value={state}>
        <SlideDispatchContext.Provider value={dispatch}>
          {view === 'presentation' && <PresentationView />}
          {view === 'editor' && <EditorView />}
          {view === 'overview' && (
            <OverviewGrid onSelectSlide={handleSelectSlide} />
          )}
        </SlideDispatchContext.Provider>
      </SlideContext.Provider>
    </ErrorBoundary>
  )
}
