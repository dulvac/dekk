import { useCallback, useState, useEffect, useRef } from 'react'
import { useSlides, useSlideDispatch } from '../core/store'
import { useRoute } from '../core/route'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import { SaveButton } from '../components/SaveButton'
import { GitHubAuthModal } from '../components/GitHubAuthModal'
import { saveDeckDraft } from '../core/loader'
import { exportMarkdown } from '../core/exporter'
import {
  detectEnvironment,
  saveToDevServer,
  saveToGitHub,
  detectGitHubRepo,
  type Environment,
} from '../core/persistence'
import { hasToken, getToken, setToken } from '../core/token-store'
import type { SaveStatus } from '../components/SaveButton'
import styles from '../styles/editor.module.css'

const DEBOUNCE_MS = 300

export function EditorView() {
  const { rawMarkdown, slides, currentIndex, currentDeck, deckMetadata } = useSlides()
  const dispatch = useSlideDispatch()
  const [, setRoute] = useRoute()
  const [localMarkdown, setLocalMarkdown] = useState(rawMarkdown)
  const [showSaved, setShowSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Capture the slide index when the editor first mounts, so we can scroll to it
  const initialSlideIndexRef = useRef(currentIndex)

  // Persistence state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [environment, setEnvironment] = useState<Environment | null>(null)
  const resetStatusTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLocalMarkdown(rawMarkdown)
  }, [rawMarkdown])

  useEffect(() => {
    // Detect environment on mount
    detectEnvironment().then(setEnvironment)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (resetStatusTimerRef.current) clearTimeout(resetStatusTimerRef.current)
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

  const handleCursorSlideChange = useCallback(
    (slideIndex: number) => {
      dispatch({ type: 'GO_TO_SLIDE', index: slideIndex })
    },
    [dispatch]
  )

  const handleEscape = useCallback(() => {
    if (currentDeck) {
      setRoute({
        view: 'presentation',
        deckId: currentDeck,
        slideIndex: currentIndex,
      })
    }
  }, [currentDeck, currentIndex, setRoute])

  const handleExport = useCallback(async () => {
    const success = await exportMarkdown(localMarkdown, deckMetadata?.title, currentDeck ?? undefined)
    if (success) {
      setShowSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000)
    }
  }, [localMarkdown, deckMetadata?.title, currentDeck])

  const handleSave = useCallback(async () => {
    if (!currentDeck) {
      setErrorMessage('No deck loaded')
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setErrorMessage(null)
    setPrUrl(null)

    try {
      if (environment === 'dev') {
        // Save to dev server
        const filePath = `presentations/${currentDeck}/slides.md`
        const success = await saveToDevServer(filePath, localMarkdown)
        if (success) {
          setSaveStatus('saved')
          if (resetStatusTimerRef.current) clearTimeout(resetStatusTimerRef.current)
          resetStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
        } else {
          setErrorMessage('Dev server save failed')
          setSaveStatus('error')
        }
      } else if (environment === 'github-pages') {
        // Check if token exists
        if (!hasToken()) {
          setShowAuthModal(true)
          setSaveStatus('idle')
          return
        }

        // Get token and repo info
        const token = getToken()
        if (!token) {
          setErrorMessage('No GitHub token found')
          setSaveStatus('error')
          return
        }

        const repoInfo = detectGitHubRepo(window.location.href)
        if (!repoInfo) {
          setErrorMessage('Could not detect GitHub repository')
          setSaveStatus('error')
          return
        }

        // Save to GitHub
        const filePath = `presentations/${currentDeck}/slides.md`
        const result = await saveToGitHub(repoInfo.owner, repoInfo.repo, filePath, localMarkdown, token)
        setPrUrl(result.prUrl)
        setSaveStatus('pr-created')
      } else {
        // Fall back to file download
        const success = await exportMarkdown(localMarkdown, deckMetadata?.title, currentDeck)
        if (success) {
          setSaveStatus('saved')
          if (resetStatusTimerRef.current) clearTimeout(resetStatusTimerRef.current)
          resetStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
        } else {
          setErrorMessage('Export failed')
          setSaveStatus('error')
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
      setSaveStatus('error')
    }
  }, [environment, currentDeck, localMarkdown, deckMetadata?.title])

  const handleAuthorize = useCallback(
    (token: string, storage: 'session' | 'local') => {
      setToken(token, storage)
      setShowAuthModal(false)
      // Trigger save after authorization
      handleSave()
    },
    [handleSave]
  )

  // Guard against out-of-bounds access
  const currentSlide = slides[currentIndex]

  return (
    <>
      <div className={styles.editorView}>
        <div className={styles.editorPane}>
          <div className={styles.toolbar}>
            <SaveButton
              status={saveStatus}
              onSave={handleSave}
              errorMessage={errorMessage || undefined}
              prUrl={prUrl || undefined}
            />
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
            <button
              className={styles.closeBtn}
              onClick={handleEscape}
              aria-label="Close editor"
              title="Close editor (Esc)"
            >
              &times;
            </button>
          </div>
          <div className={styles.editorWrapper}>
            <MarkdownEditor
              value={localMarkdown}
              onChange={handleChange}
              initialSlideIndex={initialSlideIndexRef.current}
              onCursorSlideChange={handleCursorSlideChange}
              onEscape={handleEscape}
            />
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
      {showAuthModal && (
        <GitHubAuthModal
          onAuthorize={handleAuthorize}
          onCancel={() => {
            setShowAuthModal(false)
            setSaveStatus('idle')
          }}
        />
      )}
    </>
  )
}
