import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('detectEnvironment', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    // Reset the environment cache
    const { resetEnvironmentCache } = await import('./persistence')
    resetEnvironmentCache()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns dev when DEV and ping succeeds', async () => {
    vi.stubEnv('DEV', true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const { detectEnvironment } = await import('./persistence')
    expect(await detectEnvironment()).toBe('dev')
  })

  it('returns unknown when DEV but ping 404s', async () => {
    vi.stubEnv('DEV', true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const { detectEnvironment } = await import('./persistence')
    expect(await detectEnvironment()).toBe('unknown')
  })

  it('returns github-pages when not DEV and URL matches pattern', async () => {
    vi.stubEnv('DEV', false)
    const mockLocation = {
      hostname: 'user.github.io',
      pathname: '/repo/',
    }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      configurable: true,
      writable: true,
    })
    const { detectEnvironment } = await import('./persistence')
    expect(await detectEnvironment()).toBe('github-pages')
  })

  it('returns unknown when not DEV and URL does not match', async () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal('location', { hostname: 'example.com', pathname: '/' })
    const { detectEnvironment } = await import('./persistence')
    expect(await detectEnvironment()).toBe('unknown')
  })
})

describe('detectGitHubRepo', () => {
  it('parses {user}.github.io/{repo} correctly', async () => {
    const { detectGitHubRepo } = await import('./persistence')
    const result = detectGitHubRepo('https://octocat.github.io/my-slides/')
    expect(result).toEqual({ owner: 'octocat', repo: 'my-slides' })
  })

  it('parses {user}.github.io/{repo} without trailing slash', async () => {
    const { detectGitHubRepo } = await import('./persistence')
    const result = detectGitHubRepo('https://octocat.github.io/my-slides')
    expect(result).toEqual({ owner: 'octocat', repo: 'my-slides' })
  })

  it('returns null for localhost', async () => {
    const { detectGitHubRepo } = await import('./persistence')
    expect(detectGitHubRepo('http://localhost:5173/')).toBeNull()
  })

  it('returns null for non-github-pages URL', async () => {
    const { detectGitHubRepo } = await import('./persistence')
    expect(detectGitHubRepo('https://example.com/')).toBeNull()
  })

  it('returns null for github.io without repo path', async () => {
    const { detectGitHubRepo } = await import('./persistence')
    expect(detectGitHubRepo('https://octocat.github.io/')).toBeNull()
  })
})

describe('saveToDevServer', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends correct POST body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { saveToDevServer } = await import('./persistence')
    const result = await saveToDevServer('presentations/test/slides.md', '# Test')

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/__marko-pollo/write-file',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'presentations/test/slides.md',
          content: '# Test',
        }),
      })
    )
  })

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const { saveToDevServer } = await import('./persistence')
    expect(await saveToDevServer('test.md', 'content')).toBe(false)
  })

  it('returns false on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const { saveToDevServer } = await import('./persistence')
    expect(await saveToDevServer('test.md', 'content')).toBe(false)
  })
})

describe('saveToGitHub', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('orchestrates all 5 API calls in order', async () => {
    const mockGetDefaultBranch = vi.fn().mockResolvedValue('main')
    const mockGetFileContents = vi.fn().mockResolvedValue({ sha: 'abc123', content: 'old' })
    const mockGetBranchHead = vi.fn().mockResolvedValue('def456')
    const mockCreateBranch = vi.fn().mockResolvedValue(undefined)
    const mockUpdateFileContents = vi.fn().mockResolvedValue(undefined)
    const mockCreatePullRequest = vi.fn().mockResolvedValue({
      url: 'https://github.com/owner/repo/pull/1',
      number: 1,
    })

    vi.doMock('./github-api', () => ({
      getDefaultBranch: mockGetDefaultBranch,
      getFileContents: mockGetFileContents,
      getBranchHead: mockGetBranchHead,
      createBranch: mockCreateBranch,
      updateFileContents: mockUpdateFileContents,
      createPullRequest: mockCreatePullRequest,
    }))

    const { saveToGitHub } = await import('./persistence')
    const result = await saveToGitHub(
      'owner',
      'repo',
      'presentations/test/slides.md',
      '# New Content',
      'ghp_token123'
    )

    expect(result.prUrl).toBe('https://github.com/owner/repo/pull/1')
    expect(mockGetDefaultBranch).toHaveBeenCalledWith('owner', 'repo', 'ghp_token123')
    expect(mockGetFileContents).toHaveBeenCalledWith(
      'owner',
      'repo',
      'presentations/test/slides.md',
      'main',
      'ghp_token123'
    )
    expect(mockGetBranchHead).toHaveBeenCalledWith('owner', 'repo', 'main', 'ghp_token123')
    expect(mockCreateBranch).toHaveBeenCalledWith(
      'owner',
      'repo',
      expect.stringContaining('marko-pollo-'),
      'def456',
      'ghp_token123'
    )
    expect(mockUpdateFileContents).toHaveBeenCalledWith(
      'owner',
      'repo',
      'presentations/test/slides.md',
      '# New Content',
      expect.stringContaining('Update presentation'),
      'abc123',
      expect.stringContaining('marko-pollo-'),
      'ghp_token123'
    )
    expect(mockCreatePullRequest).toHaveBeenCalledWith(
      'owner',
      'repo',
      expect.stringContaining('Update presentation'),
      expect.any(String),
      expect.stringContaining('marko-pollo-'),
      'main',
      'ghp_token123'
    )
  })
})
