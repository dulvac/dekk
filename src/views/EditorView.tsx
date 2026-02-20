import { useCallback, useState, useEffect, useRef } from 'react'
import { useSlides, useSlideDispatch } from '../core/store'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import { saveDeckDraft } from '../core/loader'
import { exportMarkdown } from '../core/exporter'
import styles from '../styles/editor.module.css'

const DEBOUNCE_MS = 300

export function EditorView() {
  const { rawMarkdown, slides, currentIndex, currentDeck, deckMetadata } = useSlides()
  const dispatch = useSlideDispatch()
  const [localMarkdown, setLocalMarkdown] = useState(rawMarkdown)
  const [showSaved, setShowSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLocalMarkdown(rawMarkdown)
  }, [rawMarkdown])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      setLocalMarkdown(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        dispatch({ type: 'SET_MARKDOWN', markdown: value })
        if (currentDeck) {
          saveDeckDraft(currentDeck, value)
        }
      }, DEBOUNCE_MS)
    },
    [dispatch, currentDeck]
  )

  const handleExport = useCallback(async () => {
    const success = await exportMarkdown(localMarkdown, deckMetadata?.title, currentDeck ?? undefined)
    if (success) {
      setShowSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000)
    }
  }, [localMarkdown, deckMetadata?.title, currentDeck])

  // Guard against out-of-bounds access
  const currentSlide = slides[currentIndex]

  return (
    <div className={styles.editorView}>
      <div className={styles.editorPane}>
        <div className={styles.toolbar}>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={!localMarkdown.trim()}
            aria-label="Export markdown file"
          >
            Export
          </button>
          {showSaved && (
            <span className={styles.savedIndicator} role="status" aria-live="polite">
              Saved
            </span>
          )}
        </div>
        <div className={styles.editorWrapper}>
          <MarkdownEditor value={localMarkdown} onChange={handleChange} />
        </div>
      </div>
      <div className={styles.previewPane}>
        {currentSlide ? (
          <SlideFrame>
            <SlideRenderer slide={currentSlide} />
          </SlideFrame>
        ) : (
          <SlideFrame>
            <p>Start typing markdown on the left...</p>
          </SlideFrame>
        )}
        {slides.length > 0 && (
          <SlideNavigation
            currentIndex={currentIndex}
            totalSlides={slides.length}
          />
        )}
      </div>
    </div>
  )
}
