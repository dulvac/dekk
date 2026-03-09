import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRegistry } from './useRegistry'

// Mock the deckRegistry module
vi.mock('../core/deckRegistry', () => ({
  deckRegistry: [
    { id: 'static-deck', title: 'Static Deck', slideCount: 3, rawMarkdown: '# Static' },
  ],
  fetchRuntimeRegistry: vi.fn(),
}))

describe('useRegistry', () => {
  let metaTag: HTMLMetaElement | null = null

  afterEach(() => {
    if (metaTag) {
      document.head.removeChild(metaTag)
      metaTag = null
    }
    vi.restoreAllMocks()
  })

  it('returns build-time registry in static mode', () => {
    const { result } = renderHook(() => useRegistry())
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe('static-deck')
    expect(result.current.loading).toBe(false)
  })

  it('fetches runtime registry in CLI mode', async () => {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', 'dekk-mode')
    metaTag.setAttribute('content', 'cli')
    document.head.appendChild(metaTag)

    const { fetchRuntimeRegistry } = await import('../core/deckRegistry')
    vi.mocked(fetchRuntimeRegistry).mockResolvedValue([
      { id: 'remote-deck', title: 'Remote Deck', slideCount: 5 },
    ])

    const { result } = renderHook(() => useRegistry())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe('remote-deck')
  })

  it('falls back to build-time registry if fetch fails', async () => {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', 'dekk-mode')
    metaTag.setAttribute('content', 'cli')
    document.head.appendChild(metaTag)

    const { fetchRuntimeRegistry } = await import('../core/deckRegistry')
    vi.mocked(fetchRuntimeRegistry).mockResolvedValue(null)

    const { result } = renderHook(() => useRegistry())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe('static-deck')
  })
})
