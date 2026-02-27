import { describe, it, expect, vi, beforeEach } from 'vitest'
import { slugify, downloadMarkdown, saveMarkdownToFile, exportMarkdown } from './exporter'

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

describe('saveMarkdownToFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Remove showSaveFilePicker by default
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker
  })

  it('returns "not-available" when showSaveFilePicker is undefined', async () => {
    const result = await saveMarkdownToFile('# Hello')
    expect(result).toBe('not-available')
  })

  it('returns "saved" when user completes the save', async () => {
    const mockWritable = { write: vi.fn(), close: vi.fn() }
    const mockHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) }
    window.showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle)

    const result = await saveMarkdownToFile('# Hello', 'My Talk')
    expect(result).toBe('saved')
    expect(mockWritable.write).toHaveBeenCalledWith('# Hello')
    expect(mockWritable.close).toHaveBeenCalled()
  })

  it('returns "cancelled" when user cancels the file picker (AbortError)', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError')
    window.showSaveFilePicker = vi.fn().mockRejectedValue(abortError)

    const result = await saveMarkdownToFile('# Hello')
    expect(result).toBe('cancelled')
  })

  it('returns "not-available" on other errors', async () => {
    window.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('SecurityError'))

    const result = await saveMarkdownToFile('# Hello')
    expect(result).toBe('not-available')
  })
})

describe('exportMarkdown', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let appendChildSpy: ReturnType<typeof vi.fn>
  let removeChildSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker

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

  it('returns false for empty markdown', async () => {
    expect(await exportMarkdown('')).toBe(false)
    expect(await exportMarkdown('   ')).toBe(false)
  })

  it('falls back to downloadMarkdown when showSaveFilePicker is not available', async () => {
    const result = await exportMarkdown('# Hello')
    expect(result).toBe(true)
    expect(clickSpy).toHaveBeenCalled() // blob download triggered
  })

  it('does NOT fall back to download when user cancels the file picker', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError')
    window.showSaveFilePicker = vi.fn().mockRejectedValue(abortError)

    const result = await exportMarkdown('# Hello')
    expect(result).toBe(false)
    expect(clickSpy).not.toHaveBeenCalled() // NO blob download
  })

  it('uses showSaveFilePicker when available and returns true on success', async () => {
    const mockWritable = { write: vi.fn(), close: vi.fn() }
    const mockHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) }
    window.showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle)

    const result = await exportMarkdown('# Hello')
    expect(result).toBe(true)
    expect(clickSpy).not.toHaveBeenCalled() // no blob download
    expect(mockWritable.write).toHaveBeenCalledWith('# Hello')
  })

  it('falls back to download on non-abort errors from file picker', async () => {
    window.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('SecurityError'))

    const result = await exportMarkdown('# Hello')
    expect(result).toBe(true)
    expect(clickSpy).toHaveBeenCalled() // blob download triggered as fallback
  })
})
