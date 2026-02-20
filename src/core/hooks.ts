import { useEffect, useState, type Dispatch } from 'react'
import { saveToLocalStorage } from './loader'
import type { SlideAction } from './store'

export type View = 'presentation' | 'editor' | 'overview'

function getViewFromHash(): View {
  const hash = window.location.hash.replace(/#\/?/, '').split('?')[0]
  if (hash === 'editor') return 'editor'
  if (hash === 'overview') return 'overview'
  return 'presentation'
}

export function useHashRouting() {
  const [view, setView] = useState<View>(getViewFromHash)

  useEffect(() => {
    const hash = view === 'presentation' ? '' : view
    window.location.hash = hash ? `#${hash}` : ''
  }, [view])

  useEffect(() => {
    function onHashChange() {
      setView(getViewFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return [view, setView] as const
}

const MAX_DROP_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export function useFileDrop(dispatch: Dispatch<SlideAction>) {
  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault()
    }
    function handleDrop(e: DragEvent) {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file && (file.name.endsWith('.md') || file.type === 'text/markdown')) {
        if (file.size > MAX_DROP_FILE_SIZE) {
          console.warn(`Dropped file too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`)
          return
        }
        file
          .text()
          .then((text) => {
            dispatch({ type: 'SET_MARKDOWN', markdown: text })
            saveToLocalStorage(text)
          })
          .catch((error) => {
            console.error('Failed to read dropped file:', error)
          })
      }
    }
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [dispatch])
}
