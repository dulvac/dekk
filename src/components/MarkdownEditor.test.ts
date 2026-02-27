import { describe, it, expect } from 'vitest'
import { getSlideIndexAtPosition } from './MarkdownEditor'

describe('getSlideIndexAtPosition', () => {
  const sampleMarkdown = [
    '---',
    'title: Test',
    '---',
    '',
    '# Slide 1',
    'Content for slide 1',
    '',
    '---',
    '',
    '# Slide 2',
    'Content for slide 2',
    '',
    '---',
    '',
    '# Slide 3',
    'Content for slide 3',
  ].join('\n')

  it('returns 0 for cursor in the first slide', () => {
    // Position in "# Slide 1" — after frontmatter
    const fmEnd = sampleMarkdown.indexOf('\n# Slide 1') + 1
    expect(getSlideIndexAtPosition(sampleMarkdown, fmEnd)).toBe(0)
  })

  it('returns 1 for cursor in the second slide', () => {
    const pos = sampleMarkdown.indexOf('# Slide 2')
    expect(getSlideIndexAtPosition(sampleMarkdown, pos)).toBe(1)
  })

  it('returns 2 for cursor in the third slide', () => {
    const pos = sampleMarkdown.indexOf('# Slide 3')
    expect(getSlideIndexAtPosition(sampleMarkdown, pos)).toBe(2)
  })

  it('returns 0 for cursor in the frontmatter', () => {
    expect(getSlideIndexAtPosition(sampleMarkdown, 5)).toBe(0)
  })

  it('works with simple markdown without frontmatter', () => {
    const simple = '# Slide 1\n---\n# Slide 2\n---\n# Slide 3'
    const pos2 = simple.indexOf('# Slide 2')
    const pos3 = simple.indexOf('# Slide 3')

    expect(getSlideIndexAtPosition(simple, 0)).toBe(0)
    expect(getSlideIndexAtPosition(simple, pos2)).toBe(1)
    expect(getSlideIndexAtPosition(simple, pos3)).toBe(2)
  })
})
