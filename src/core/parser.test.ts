import { describe, it, expect } from 'vitest'
import { parseMarkdown } from './parser'

describe('parseMarkdown', () => {
  it('parses a single slide from markdown', () => {
    const result = parseMarkdown('# Hello World')
    expect(result.slides).toHaveLength(1)
  })

  it('parses multiple slides split by ---', () => {
    const result = parseMarkdown('# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3')
    expect(result.slides).toHaveLength(3)
  })

  it('extracts deck metadata from frontmatter', () => {
    const md = '---\ntitle: My Talk\nauthor: Jane\n---\n\n# First Slide'
    const result = parseMarkdown(md)
    expect(result.deckMetadata.title).toBe('My Talk')
    expect(result.deckMetadata.author).toBe('Jane')
  })

  it('preserves per-slide metadata', () => {
    const md = '<!-- bg: #ff0000 -->\n\n# Red Slide'
    const result = parseMarkdown(md)
    expect(result.slides[0].metadata?.bg).toBe('#ff0000')
  })

  it('stores raw content for each slide', () => {
    const md = '# Slide 1\n\nParagraph\n\n---\n\n# Slide 2'
    const result = parseMarkdown(md)
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
  })

  it('handles GFM tables', () => {
    const md = '| Col A | Col B |\n|-------|-------|\n| 1     | 2     |'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(1)
  })

  it('handles empty markdown', () => {
    const result = parseMarkdown('')
    expect(result.slides).toHaveLength(0)
    expect(result.deckMetadata).toEqual({})
  })
})
