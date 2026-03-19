import { createHighlighterCore, type HighlighterCore } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationFocus,
  transformerNotationErrorLevel,
  transformerMetaHighlight,
} from '@shikijs/transformers'

let highlighterPromise: Promise<HighlighterCore> | null = null

const COMMON_LANGS = [
  import('@shikijs/langs/typescript'),
  import('@shikijs/langs/javascript'),
  import('@shikijs/langs/tsx'),
  import('@shikijs/langs/jsx'),
  import('@shikijs/langs/python'),
  import('@shikijs/langs/rust'),
  import('@shikijs/langs/go'),
  import('@shikijs/langs/java'),
  import('@shikijs/langs/c'),
  import('@shikijs/langs/cpp'),
  import('@shikijs/langs/csharp'),
  import('@shikijs/langs/ruby'),
  import('@shikijs/langs/swift'),
  import('@shikijs/langs/kotlin'),
  import('@shikijs/langs/bash'),
  import('@shikijs/langs/shell'),
  import('@shikijs/langs/json'),
  import('@shikijs/langs/yaml'),
  import('@shikijs/langs/toml'),
  import('@shikijs/langs/html'),
  import('@shikijs/langs/css'),
  import('@shikijs/langs/sql'),
  import('@shikijs/langs/graphql'),
  import('@shikijs/langs/markdown'),
  import('@shikijs/langs/dockerfile'),
]

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import('@shikijs/themes/vitesse-dark')],
      langs: COMMON_LANGS,
      engine: createJavaScriptRegexEngine(),
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
