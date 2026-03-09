import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GitHubSource } from '../github'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

interface MockResponseInit {
  status?: number
  headers?: Record<string, string>
  body?: unknown
}

function mockResponse({
  status = 200,
  headers = {},
  body = {},
}: MockResponseInit = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  } as unknown as Response
}

const SLIDES_MD = `---
title: My Talk
author: Jane
---
# Slide 1

---

# Slide 2

---

# Slide 3
`

function defaultOptions() {
  return {
    host: 'github.com',
    owner: 'acme',
    repo: 'decks',
    path: 'presentations',
    ref: 'main',
    token: 'ghp_test_token',
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubSource', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- listDecks ----------------------------------------------------------

  it('listDecks returns DeckListEntry[] from directory listing (dir deck)', async () => {
    // First call: list the presentations directory
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [
          { name: 'talk-one', type: 'dir' },
          { name: 'README.md', type: 'file', size: 100 },
        ],
      })
    )

    // Second call: fetch talk-one/slides.md
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'abc123',
          size: SLIDES_MD.length,
        },
      })
    )

    const source = new GitHubSource(defaultOptions())
    const decks = await source.listDecks()

    expect(decks).toHaveLength(1)
    expect(decks[0]).toEqual({
      id: 'talk-one',
      title: 'My Talk',
      author: 'Jane',
      slideCount: 3,
    })

    // Verify correct API URLs were called
    const calls = fetchSpy.mock.calls
    expect(calls[0][0]).toContain('/repos/acme/decks/contents/presentations')
    expect(calls[1][0]).toContain('/repos/acme/decks/contents/presentations/talk-one/slides.md')
  })

  it('listDecks discovers standalone .md files (skipping README.md)', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [
          { name: 'intro.md', type: 'file', size: 500 },
          { name: 'README.md', type: 'file', size: 100 },
        ],
      })
    )

    // Fetch intro.md content
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'def456',
          size: SLIDES_MD.length,
        },
      })
    )

    const source = new GitHubSource(defaultOptions())
    const decks = await source.listDecks()

    expect(decks).toHaveLength(1)
    expect(decks[0].id).toBe('intro')
    expect(decks[0].title).toBe('My Talk')
  })

  // ---- readDeck -----------------------------------------------------------

  it('readDeck returns decoded markdown from file content response', async () => {
    // Setup: listDecks to populate registry
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [{ name: 'talk-one', type: 'dir' }],
      })
    )
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'abc123',
          size: SLIDES_MD.length,
        },
      })
    )

    const source = new GitHubSource(defaultOptions())
    await source.listDecks()

    // readDeck should return from cache (no additional fetch)
    const content = await source.readDeck('talk-one')
    expect(content).toBe(SLIDES_MD)
    expect(fetchSpy).toHaveBeenCalledTimes(2) // only the listDecks calls
  })

  // ---- caching ------------------------------------------------------------

  it('caches readDeck results — second call does not re-fetch', async () => {
    // Setup registry via listDecks
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [{ name: 'talk-one', type: 'dir' }],
      })
    )
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'abc123',
          size: SLIDES_MD.length,
        },
      })
    )

    const source = new GitHubSource(defaultOptions())
    await source.listDecks()

    const first = await source.readDeck('talk-one')
    const second = await source.readDeck('talk-one')

    expect(first).toBe(second)
    expect(fetchSpy).toHaveBeenCalledTimes(2) // no extra fetches
  })

  // ---- writeDeck ----------------------------------------------------------

  it('writeDeck creates commit + PR and returns { prUrl }', async () => {
    // Setup registry via listDecks
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [{ name: 'talk-one', type: 'dir' }],
      })
    )
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'abc123',
          size: SLIDES_MD.length,
        },
      })
    )

    const source = new GitHubSource(defaultOptions())
    await source.listDecks()

    // writeDeck sequence:
    // 1. GET file SHA
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: { sha: 'abc123' },
      })
    )
    // 2. GET default branch (we pass ref so this returns ref info)
    // Actually: getBranchSha - GET branch
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: { commit: { sha: 'head123' } },
      })
    )
    // 3. Create branch (POST refs)
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 201 }))
    // 4. Update file (PUT contents)
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 200 }))
    // 5. Create PR (POST pulls)
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 201,
        body: { html_url: 'https://github.com/acme/decks/pull/42' },
      })
    )

    const result = await source.writeDeck('talk-one', '# Updated\n')

    expect(result).toEqual({ prUrl: 'https://github.com/acme/decks/pull/42' })
  })

  // ---- rate limiting ------------------------------------------------------

  it('throws descriptive error on rate limit (403 + X-RateLimit-Remaining: 0)', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 403,
        headers: { 'X-RateLimit-Remaining': '0' },
        body: { message: 'API rate limit exceeded' },
      })
    )

    const source = new GitHubSource(defaultOptions())
    await expect(source.listDecks()).rejects.toThrow('rate limit')
  })

  // ---- 404 on readDeck ----------------------------------------------------

  it('readDeck throws on unknown deck id (not in registry)', async () => {
    // listDecks returns empty
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ body: [] })
    )

    const source = new GitHubSource(defaultOptions())
    await source.listDecks()

    await expect(source.readDeck('nonexistent')).rejects.toThrow('Deck not found')
  })

  // ---- dispose ------------------------------------------------------------

  it('dispose clears the cache — subsequent readDeck re-fetches', async () => {
    // Setup registry via listDecks
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [{ name: 'talk-one', type: 'dir' }],
      })
    )
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'abc123',
          size: SLIDES_MD.length,
        },
      })
    )

    const source = new GitHubSource(defaultOptions())
    await source.listDecks()

    await source.dispose()

    // After dispose, registry is cleared so readDeck should throw
    await expect(source.readDeck('talk-one')).rejects.toThrow('Deck not found')
  })

  // ---- properties ---------------------------------------------------------

  it('writable is true and sourceType is github', () => {
    const source = new GitHubSource(defaultOptions())
    expect(source.writable).toBe(true)
    expect(source.sourceType).toBe('github')
  })

  // ---- invalid deck IDs ---------------------------------------------------

  it('rejects invalid deck IDs', async () => {
    const source = new GitHubSource(defaultOptions())

    await expect(source.readDeck('../etc/passwd')).rejects.toThrow('Invalid deck ID')
    await expect(source.readDeck('has spaces')).rejects.toThrow('Invalid deck ID')
    await expect(source.readDeck('has.dots')).rejects.toThrow('Invalid deck ID')
  })

  // ---- GHE support --------------------------------------------------------

  it('uses GHE API base for non-github.com hosts', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ body: [] })
    )

    const source = new GitHubSource({
      ...defaultOptions(),
      host: 'github.corp.example.com',
    })
    await source.listDecks()

    expect(fetchSpy.mock.calls[0][0]).toMatch(
      /^https:\/\/github\.corp\.example\.com\/api\/v3\//
    )
  })

  // ---- auth required for write --------------------------------------------

  it('writeDeck throws when no token is provided', async () => {
    // Setup registry
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: [{ name: 'talk-one', type: 'dir' }],
      })
    )
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          content: base64(SLIDES_MD),
          encoding: 'base64',
          sha: 'abc123',
          size: SLIDES_MD.length,
        },
      })
    )

    const opts = defaultOptions()
    const source = new GitHubSource({ ...opts, token: undefined })
    await source.listDecks()

    await expect(source.writeDeck('talk-one', '# New')).rejects.toThrow(
      'Authentication required'
    )
  })

  // ---- token not in errors ------------------------------------------------

  it('does not leak token in error messages', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ status: 500, body: { message: 'Internal error with ghp_test_token' } })
    )

    const source = new GitHubSource(defaultOptions())

    try {
      await source.listDecks()
    } catch (err: unknown) {
      const message = (err as Error).message
      expect(message).not.toContain('ghp_test_token')
    }
  })

  // ---- authorization header -----------------------------------------------

  it('sends Authorization header when token is provided', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ body: [] })
    )

    const source = new GitHubSource(defaultOptions())
    await source.listDecks()

    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = requestInit.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer ghp_test_token')
  })

  it('omits Authorization header when no token', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ body: [] })
    )

    const source = new GitHubSource({ ...defaultOptions(), token: undefined })
    await source.listDecks()

    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = requestInit.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})
