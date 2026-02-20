import type { Root, Content, RootContent } from 'mdast'
import type { Plugin } from 'unified'

export interface SlideMetadata {
  bg?: string
  class?: string
  layout?: string
  transition?: string
  [key: string]: string | undefined
}

export interface SlideNode {
  type: 'slide'
  children: Content[]
  data?: {
    metadata?: SlideMetadata
    startOffset?: number
    endOffset?: number
  }
}

const COMMENT_DIRECTIVE_PATTERN = /^<!--\s*(\w+)\s*:\s*(.+?)\s*-->$/

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']

function extractMetadata(children: RootContent[]): {
  metadata: SlideMetadata
  remaining: RootContent[]
} {
  const metadata: SlideMetadata = {}
  let startIndex = 0

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.type === 'html') {
      const match = node.value.match(COMMENT_DIRECTIVE_PATTERN)
      if (match) {
        if (!DANGEROUS_KEYS.includes(match[1])) {
          metadata[match[1]] = match[2]
        }
        startIndex = i + 1
        continue
      }
    }
    break
  }

  return { metadata, remaining: children.slice(startIndex) }
}

export const remarkSlides: Plugin<[], Root> = function () {
  return function (tree: Root) {
    const slides: SlideNode[] = []
    let currentChildren: RootContent[] = []
    let startOffset = 0

    // Get the end position from the root tree
    const treeEndOffset = tree.position?.end.offset ?? 0

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i]
      if (node.type === 'thematicBreak') {
        if (currentChildren.length > 0) {
          const { metadata, remaining } = extractMetadata(currentChildren)
          const endOffset = node.position?.start.offset ?? startOffset
          slides.push({
            type: 'slide',
            children: remaining as Content[],
            data: {
              metadata,
              startOffset,
              endOffset
            },
          })
        }
        // Next slide starts after this thematic break
        startOffset = node.position?.end.offset ?? startOffset
        currentChildren = []
      } else {
        currentChildren.push(node)
      }
    }

    // Last slide
    if (currentChildren.length > 0) {
      const { metadata, remaining } = extractMetadata(currentChildren)
      slides.push({
        type: 'slide',
        children: remaining as Content[],
        data: {
          metadata,
          startOffset,
          endOffset: treeEndOffset
        },
      })
    }

    tree.children = slides as unknown as RootContent[]
  }
}
