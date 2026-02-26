import { useEffect, type Dispatch } from 'react'
import { saveDeckDraft } from './loader'
import type { SlideAction } from './store'

const MAX_DROP_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export function useFileDrop(dispatch: Dispatch<SlideAction>, currentDeck: string | null) {
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
            if (currentDeck) {
              saveDeckDraft(currentDeck, text)
            }
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
  }, [dispatch, currentDeck])
}
