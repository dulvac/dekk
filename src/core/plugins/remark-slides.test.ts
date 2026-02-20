import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkSlides, type SlideNode } from './remark-slides'

function parseSlides(markdown: string): SlideNode[] {
  const processor = unified().use(remarkParse).use(remarkSlides)
  const tree = processor.runSync(processor.parse(markdown))
  return tree.children as unknown as SlideNode[]
}

describe('remark-slides', () => {
  it('wraps content without separators into a single slide', () => {
    const slides = parseSlides('# Hello\n\nSome text')
    expect(slides).toHaveLength(1)
    expect(slides[0].type).toBe('slide')
  })

  it('splits on --- into multiple slides', () => {
    const slides = parseSlides('# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3')
    expect(slides).toHaveLength(3)
    slides.forEach(s => expect(s.type).toBe('slide'))
  })

  it('handles empty slides gracefully', () => {
    const slides = parseSlides('---\n\n---')
    expect(slides.every(s => s.type === 'slide')).toBe(true)
  })

  it('extracts per-slide metadata from HTML comments', () => {
    const md = '<!-- bg: #ff0000 -->\n\n# Red Slide\n\n---\n\n<!-- layout: center -->\n\n# Centered'
    const slides = parseSlides(md)
    expect(slides[0].data?.metadata?.bg).toBe('#ff0000')
    expect(slides[1].data?.metadata?.layout).toBe('center')
  })

  // Edge cases from security review
  it('handles empty markdown string', () => {
    const slides = parseSlides('')
    expect(slides).toHaveLength(0)
  })

  it('handles markdown with only separators', () => {
    const slides = parseSlides('---\n---')
    expect(slides.every(s => s.type === 'slide')).toBe(true)
  })

  it('handles single slide with no separators', () => {
    const slides = parseSlides('# Just one slide')
    expect(slides).toHaveLength(1)
    expect(slides[0].type).toBe('slide')
  })
})
