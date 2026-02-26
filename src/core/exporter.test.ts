import { describe, it, expect, vi, beforeEach } from 'vitest'
import { slugify, downloadMarkdown } from './exporter'

describe('slugify', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(slugify('My Tech Talk')).toBe('my-tech-talk')
  })

  it('returns "presentation" for empty string', () => {
    expect(slugify('')).toBe('presentation')
  })

  it('returns "presentation" for all special chars', () => {
    expect(slugify('!!!')).toBe('presentation')
  })

  it('returns "presentation" for all non-ASCII', () => {
    expect(slugify('日本語')).toBe('presentation')
  })

  it('truncates to 100 characters', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(100)
  })

  it('strips special characters', () => {
    expect(slugify('Hello @World! #2026')).toBe('hello-world-2026')
  })
})

describe('downloadMarkdown', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let appendChildSpy: ReturnType<typeof vi.fn>
  let removeChildSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    clickSpy = vi.fn()
    appendChildSpy = vi.fn()
    removeChildSpy = vi.fn()

    vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
      style: {},
    } as unknown as HTMLAnchorElement)

    vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildSpy as (node: Node) => Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildSpy as (child: Node) => Node)
  })

  it('creates a blob with text/markdown type', () => {
    downloadMarkdown('# Hello')
    expect(URL.createObjectURL).toHaveBeenCalled()
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/markdown')
  })

  it('uses slugified title as filename', () => {
    downloadMarkdown('# Hello', 'My Talk')
    const anchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(anchor.download).toBe('my-talk.md')
  })

  it('uses "presentation.md" when no title', () => {
    downloadMarkdown('# Hello')
    const anchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(anchor.download).toBe('presentation.md')
  })

  it('prefers slugified deckId for filename when provided', () => {
    downloadMarkdown('# Hello', undefined, 'rust-talk')
    const anchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(anchor.download).toBe('rust-talk.md')
  })

  it('returns false for empty markdown', () => {
    expect(downloadMarkdown('')).toBe(false)
  })

  it('revokes blob URL after download', () => {
    vi.useFakeTimers()
    downloadMarkdown('# Hello')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    vi.useRealTimers()
  })
})
