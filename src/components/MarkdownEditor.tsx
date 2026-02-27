import { useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView, keymap } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import styles from '../styles/editor.module.css'

const CodeMirror = lazy(() => import('@uiw/react-codemirror'))

const THEMATIC_BREAK_LINE = /^\s*(?:(-\s*){3,}|(\*\s*){3,}|(_\s*){3,})\s*$/

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#322D2B',
      color: '#F0E8D8',
      height: '100%',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-content': {
      caretColor: '#E4C56C',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '15px',
      lineHeight: '1.6',
      padding: '24px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(228, 197, 108, 0.05)',
    },
    '.cm-gutters': {
      backgroundColor: '#322D2B',
      color: '#8A7D5A',
      border: 'none',
      paddingLeft: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(228, 197, 108, 0.1)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(228, 197, 108, 0.3)',
    },
    '.cm-cursor': {
      borderLeftColor: '#E4C56C',
      borderLeftWidth: '2px',
    },
  },
  { dark: true }
)

/**
 * Given a markdown string, find the character offset where the given slide
 * section (0-indexed) begins, after the frontmatter.
 */
function findSlideOffset(text: string, slideIndex: number): number {
  // Skip frontmatter
  let bodyStart = 0
  const fmMatch = text.match(/^---\n[\s\S]*?\n---\n/)
  if (fmMatch) {
    bodyStart = fmMatch[0].length
  }

  if (slideIndex <= 0) return bodyStart

  const body = text.slice(bodyStart)
  const lines = body.split('\n')
  let slideCount = 0
  let offset = bodyStart

  for (const line of lines) {
    if (THEMATIC_BREAK_LINE.test(line)) {
      slideCount++
      if (slideCount === slideIndex) {
        // Return the position right after this separator line
        return offset + line.length + 1
      }
    }
    offset += line.length + 1
  }

  return bodyStart
}

/**
 * Given a markdown string and a cursor position, determine which slide
 * section (0-indexed) the cursor is in.
 */
export function getSlideIndexAtPosition(text: string, pos: number): number {
  // Skip frontmatter
  let bodyStart = 0
  const fmMatch = text.match(/^---\n[\s\S]*?\n---\n/)
  if (fmMatch) {
    bodyStart = fmMatch[0].length
  }

  if (pos < bodyStart) return 0

  const body = text.slice(bodyStart, pos)
  const lines = body.split('\n')
  let slideIndex = 0

  for (const line of lines) {
    if (THEMATIC_BREAK_LINE.test(line)) {
      slideIndex++
    }
  }

  return slideIndex
}

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  initialSlideIndex?: number
  onCursorSlideChange?: (slideIndex: number) => void
  onEscape?: () => void
}

export function MarkdownEditor({
  value,
  onChange,
  initialSlideIndex,
  onCursorSlideChange,
  onEscape,
}: MarkdownEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const hasSetInitialCursor = useRef(false)
  const lastReportedSlide = useRef(-1)

  // Store callbacks in refs so extensions stay referentially stable
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  const onCursorSlideChangeRef = useRef(onCursorSlideChange)
  onCursorSlideChangeRef.current = onCursorSlideChange

  const handleChange = useCallback(
    (val: string) => {
      onChange(val)
    },
    [onChange]
  )

  // Stable extensions that use refs for callbacks — created once
  const extensions = useMemo(
    () => [
      markdown(),
      editorTheme,
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Escape',
          run: () => {
            onEscapeRef.current?.()
            return true
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head
          const text = update.state.doc.toString()
          const slideIdx = getSlideIndexAtPosition(text, pos)
          if (slideIdx !== lastReportedSlide.current) {
            lastReportedSlide.current = slideIdx
            onCursorSlideChangeRef.current?.(slideIdx)
          }
        }
      }),
    ],
    [] // Stable: never recreated — callbacks accessed via refs
  )

  // Set initial cursor position when the editor is created and initialSlideIndex is provided
  useEffect(() => {
    if (
      hasSetInitialCursor.current ||
      initialSlideIndex === undefined ||
      initialSlideIndex <= 0
    ) {
      return
    }

    const view = editorRef.current?.view
    if (!view) return

    const offset = findSlideOffset(value, initialSlideIndex)
    const docLength = view.state.doc.length
    const clampedOffset = Math.min(offset, docLength)

    view.dispatch({
      selection: { anchor: clampedOffset },
      scrollIntoView: true,
    })
    view.focus()
    hasSetInitialCursor.current = true

    // Report the initial slide to sync the preview
    lastReportedSlide.current = initialSlideIndex
    onCursorSlideChangeRef.current?.(initialSlideIndex)
  }, [initialSlideIndex, value])

  return (
    <div className={styles.editor}>
      <Suspense
        fallback={
          <div
            style={{
              background: 'var(--mp-bg)',
              width: '100%',
              height: '100%',
            }}
          />
        }
      >
        <CodeMirror
          ref={editorRef}
          value={value}
          height="100%"
          extensions={extensions}
          onChange={handleChange}
          theme="none"
        />
      </Suspense>
    </div>
  )
}
