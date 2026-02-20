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

  // HIGH #1: rawContent/AST split mismatch
  it('handles *** as separator and preserves raw content correctly', () => {
    const md = '# Slide 1\n\nContent 1\n\n***\n\n# Slide 2\n\nContent 2'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(2)
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[0].rawContent).toContain('Content 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
    expect(result.slides[1].rawContent).toContain('Content 2')
  })

  it('handles ___ as separator and preserves raw content correctly', () => {
    const md = '# Slide 1\n\n___\n\n# Slide 2'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(2)
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
  })

  it('handles mixed separators correctly', () => {
    const md = '# Slide 1\n\n---\n\n# Slide 2\n\n***\n\n# Slide 3\n\n___\n\n# Slide 4'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(4)
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
    expect(result.slides[2].rawContent).toContain('# Slide 3')
    expect(result.slides[3].rawContent).toContain('# Slide 4')
  })

  // HIGH #2: Frontmatter false positive on leading ---
  it('does not treat leading --- as frontmatter when no key:value pairs exist', () => {
    const md = '---\n\n# Slide 1\n\nContent 1\n\n---\n\n# Slide 2\n\nContent 2'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(2)
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[0].rawContent).toContain('Content 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
    expect(result.deckMetadata).toEqual({})
  })

  it('correctly identifies valid frontmatter with key:value pairs', () => {
    const md = '---\ntitle: My Deck\nauthor: Jane\n---\n\n# Slide 1\n\n---\n\n# Slide 2'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(2)
    expect(result.deckMetadata.title).toBe('My Deck')
    expect(result.deckMetadata.author).toBe('Jane')
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
  })

  it('treats frontmatter-like block as content if no valid key:value pairs', () => {
    const md = '---\nJust some text\nNo colons here\n---\n\n# Slide 2'
    const result = parseMarkdown(md)
    expect(result.deckMetadata).toEqual({})
    // The text between --- markers becomes a setext heading, resulting in 1 slide
    // with both the setext heading and the h1 heading
    expect(result.slides).toHaveLength(1)
    expect(result.slides[0].rawContent).toContain('Just some text')
    expect(result.slides[0].rawContent).toContain('Slide 2')
  })
})
