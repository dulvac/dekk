import { createHighlighter, type Highlighter } from 'shiki'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationFocus,
  transformerNotationErrorLevel,
  transformerMetaHighlight,
} from '@shikijs/transformers'

let highlighterPromise: Promise<Highlighter> | null = null

const COMMON_LANGS = [
  'typescript', 'javascript', 'tsx', 'jsx', 'python', 'rust', 'go',
  'java', 'c', 'cpp', 'csharp', 'ruby', 'swift', 'kotlin', 'bash',
  'shell', 'json', 'yaml', 'toml', 'html', 'css', 'sql', 'graphql',
  'markdown', 'dockerfile', 'plaintext',
]

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vitesse-dark'],
      langs: COMMON_LANGS,
    })
  }
  return highlighterPromise
}

export async function highlightCode(
  code: string,
  lang: string,
  meta?: string
): Promise<string> {
  const highlighter = await getHighlighter()

  const loadedLangs = highlighter.getLoadedLanguages()
  const resolvedLang = loadedLangs.includes(lang) ? lang : 'plaintext'

  return highlighter.codeToHtml(code, {
    lang: resolvedLang,
    theme: 'vitesse-dark',
    meta: meta ? { __raw: meta } : undefined,
    transformers: [
      transformerNotationDiff(),
      transformerNotationHighlight(),
      transformerNotationFocus(),
      transformerNotationErrorLevel(),
      transformerMetaHighlight(),
    ],
  })
}
