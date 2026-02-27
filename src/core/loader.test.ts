import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  loadFromUrl,
  loadMarkdown,
  getDefaultSlides,
  loadDeck,
  saveDeckDraft,
  migrateOldStorage,
  STORAGE_KEY,
} from './loader'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('loader', () => {
  it('saveToLocalStorage stores markdown', () => {
    saveToLocalStorage('# Test')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('# Test')
  })

  it('loadFromLocalStorage returns stored markdown', () => {
    localStorage.setItem(STORAGE_KEY, '# Stored')
    expect(loadFromLocalStorage()).toBe('# Stored')
  })

  it('loadFromLocalStorage returns null if empty', () => {
    expect(loadFromLocalStorage()).toBeNull()
  })
})

describe('loadFromUrl', () => {
  it('rejects non-HTTPS URLs', async () => {
    await expect(loadFromUrl('http://example.com/slides.md')).rejects.toThrow(
      'Only HTTPS URLs are supported'
    )
  })

  it('fetches from HTTPS URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Remote Slide'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await loadFromUrl('https://example.com/slides.md')
    expect(result).toBe('# Remote Slide')
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/slides.md')
  })

  it('throws on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    )

    await expect(
      loadFromUrl('https://example.com/missing.md')
    ).rejects.toThrow('Failed to load: 404')
  })
})

describe('loadMarkdown', () => {
  it('returns localStorage content if available', async () => {
    localStorage.setItem(STORAGE_KEY, '# Local Slide')
    const result = await loadMarkdown()
    expect(result).toEqual({ markdown: '# Local Slide' })
  })

  it('returns default slides when localStorage is empty and no URL param', async () => {
    window.location.hash = ''
    const result = await loadMarkdown()
    expect(result).toEqual({ markdown: getDefaultSlides() })
  })

  it('falls back to default slides when URL fetch fails', async () => {
    window.location.hash = '#?url=https%3A%2F%2Fexample.com%2Ffail.md'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    )

    const result = await loadMarkdown()
    expect(result).toEqual({ markdown: getDefaultSlides() })
  })
})

describe('loadDeck', () => {
  it('returns localStorage draft when present', () => {
    localStorage.setItem('dekk-deck-my-talk', '# Draft')
    const result = loadDeck('my-talk')
    expect(result).toBe('# Draft')
  })

  it('returns null for unknown deck', () => {
    expect(loadDeck('nonexistent')).toBeNull()
  })
})

describe('saveDeckDraft', () => {
  it('writes to deck-specific key', () => {
    saveDeckDraft('my-talk', '# Updated')
    expect(localStorage.getItem('dekk-deck-my-talk')).toBe('# Updated')
  })
})

describe('migration', () => {
  it('migrates old key to default deck', () => {
    localStorage.setItem('dekk-slides', '# Old Content')
    migrateOldStorage()
    expect(localStorage.getItem('dekk-deck-default')).toBe('# Old Content')
    expect(localStorage.getItem('dekk-slides')).toBeNull()
  })
})
