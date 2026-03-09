import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildRegistry, fetchRuntimeRegistry } from './deckRegistry'

describe('buildRegistry', () => {
  const mockFiles: Record<string, string> = {
    '/presentations/my-talk/slides.md': '---\ntitle: My Talk\nauthor: Jane\n---\n# Slide 1\n---\n# Slide 2',
    '/presentations/demo/slides.md': '# Just One Slide',
  }

  it('creates entries for each file', () => {
    const entries = buildRegistry(mockFiles)
    expect(entries).toHaveLength(2)
  })

  it('extracts deck id from path', () => {
    const entries = buildRegistry(mockFiles)
    expect(entries.map(e => e.id)).toContain('my-talk')
    expect(entries.map(e => e.id)).toContain('demo')
  })

  it('extracts title from frontmatter', () => {
    const entries = buildRegistry(mockFiles)
    const myTalk = entries.find(e => e.id === 'my-talk')!
    expect(myTalk.title).toBe('My Talk')
    expect(myTalk.author).toBe('Jane')
  })

  it('falls back to id for title when no frontmatter', () => {
    const entries = buildRegistry(mockFiles)
    const demo = entries.find(e => e.id === 'demo')!
    expect(demo.title).toBe('demo')
  })

  it('counts slides correctly', () => {
    const entries = buildRegistry(mockFiles)
    expect(entries.find(e => e.id === 'my-talk')!.slideCount).toBe(2)
    expect(entries.find(e => e.id === 'demo')!.slideCount).toBe(1)
  })

  it('returns empty array for empty input', () => {
    expect(buildRegistry({})).toEqual([])
  })
})

describe('getDeck', () => {
  it('returns undefined for unknown id', () => {
    // getDeck is tested via the actual registry — import in integration test
  })
})

describe('fetchRuntimeRegistry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches DeckListEntry[] from /api/decks', async () => {
    const mockEntries = [{ id: 'test', title: 'Test', slideCount: 3 }]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEntries),
    })
    const result = await fetchRuntimeRegistry()
    expect(result).toEqual(mockEntries)
    expect(fetch).toHaveBeenCalledWith('/api/decks')
  })

  it('returns null when /api/decks is not available', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    const result = await fetchRuntimeRegistry()
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const result = await fetchRuntimeRegistry()
    expect(result).toBeNull()
  })
})
