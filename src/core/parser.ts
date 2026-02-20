import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import { remarkSlides, type SlideNode, type SlideMetadata } from './plugins/remark-slides'
import type { Root, RootContent } from 'mdast'

export interface SlideData {
  children: RootContent[]
  metadata: SlideMetadata
  rawContent: string
}

export interface DeckMetadata {
  title?: string
  author?: string
  date?: string
  aspectRatio?: string
  [key: string]: string | undefined
}

export interface ParseResult {
  slides: SlideData[]
  deckMetadata: DeckMetadata
}

function extractFrontmatter(markdown: string): {
  deckMetadata: DeckMetadata
  body: string
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return { deckMetadata: {}, body: markdown }

  const deckMetadata: DeckMetadata = {}
  const lines = match[1].split('\n')
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']
  let hasValidKeyValue = false

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      // Skip dangerous keys that could cause prototype pollution
      if (dangerousKeys.includes(key)) {
        continue
      }

      deckMetadata[key] = value
      hasValidKeyValue = true
    }
  }

  // If no valid key:value pairs were found, treat the entire input as body
  if (!hasValidKeyValue) {
    return { deckMetadata: {}, body: markdown }
  }

  const body = markdown.slice(match[0].length)
  return { deckMetadata, body }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkEmoji)
  .use(remarkSlides)

export function parseMarkdown(markdown: string): ParseResult {
  if (!markdown.trim()) {
    return { slides: [], deckMetadata: {} }
  }

  const { deckMetadata, body } = extractFrontmatter(markdown)

  if (!body.trim()) {
    return { slides: [], deckMetadata }
  }

  const tree = processor.runSync(processor.parse(body)) as Root

  const slides: SlideData[] = (tree.children as unknown as SlideNode[]).map(
    (node) => {
      const startOffset = node.data?.startOffset ?? 0
      const endOffset = node.data?.endOffset ?? body.length
      const rawContent = body.slice(startOffset, endOffset).trim()

      return {
        children: node.children as RootContent[],
        metadata: node.data?.metadata ?? {},
        rawContent,
      }
    }
  )

  return { slides, deckMetadata }
}
