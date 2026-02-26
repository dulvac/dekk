import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDefaultBranch,
  getFileContents,
  getBranchHead,
  createBranch,
  updateFileContents,
  createPullRequest,
} from './github-api'

describe('github-api', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getDefaultBranch', () => {
    it('sends GET with auth header and returns branch name', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ default_branch: 'main' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await getDefaultBranch('owner', 'repo', 'token123')

      expect(result).toBe('main')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            Accept: 'application/vnd.github.v3+json',
          }),
        })
      )
    })

    it('throws meaningful error on 401', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

      await expect(getDefaultBranch('owner', 'repo', 'bad')).rejects.toThrow(
        'GitHub API error: 401'
      )
    })
  })

  describe('getFileContents', () => {
    it('returns sha and content', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sha: 'abc123', content: 'SGVsbG8=' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await getFileContents('owner', 'repo', 'path/to/file.md', 'main', 'token123')

      expect(result).toEqual({ sha: 'abc123', content: 'SGVsbG8=' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/path/to/file.md?ref=main',
        expect.anything()
      )
    })

    it('throws on 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

      await expect(
        getFileContents('owner', 'repo', 'missing.md', 'main', 'token')
      ).rejects.toThrow('GitHub API error: 404')
    })
  })

  describe('getBranchHead', () => {
    it('returns commit SHA', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'commit-sha-456' },
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await getBranchHead('owner', 'repo', 'main', 'token123')

      expect(result).toBe('commit-sha-456')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/git/ref/heads/main',
        expect.anything()
      )
    })

    it('throws on 403', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))

      await expect(getBranchHead('owner', 'repo', 'main', 'token')).rejects.toThrow(
        'GitHub API error: 403'
      )
    })
  })

  describe('createBranch', () => {
    it('sends POST with correct ref string', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', mockFetch)

      await createBranch('owner', 'repo', 'feature-branch', 'base-sha-789', 'token123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/git/refs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ref: 'refs/heads/feature-branch',
            sha: 'base-sha-789',
          }),
        })
      )
    })

    it('throws on 422', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))

      await expect(
        createBranch('owner', 'repo', 'branch', 'sha', 'token')
      ).rejects.toThrow('GitHub API error: 422')
    })
  })

  describe('updateFileContents', () => {
    it('base64-encodes content (unicode-safe)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', mockFetch)

      await updateFileContents(
        'owner',
        'repo',
        'file.md',
        'Hello 世界',
        'Update file',
        'sha123',
        'branch',
        'token123'
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      // Verify base64 encoded correctly
      expect(callBody.content).toBe(btoa(unescape(encodeURIComponent('Hello 世界'))))
      expect(callBody.message).toBe('Update file')
      expect(callBody.sha).toBe('sha123')
      expect(callBody.branch).toBe('branch')
    })

    it('throws on 401', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

      await expect(
        updateFileContents('owner', 'repo', 'file.md', 'content', 'msg', 'sha', 'branch', 'token')
      ).rejects.toThrow('GitHub API error: 401')
    })
  })

  describe('createPullRequest', () => {
    it('returns url and number', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          html_url: 'https://github.com/owner/repo/pull/42',
          number: 42,
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await createPullRequest(
        'owner',
        'repo',
        'Fix bug',
        'Fixes #123',
        'feature',
        'main',
        'token123'
      )

      expect(result).toEqual({
        url: 'https://github.com/owner/repo/pull/42',
        number: 42,
      })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Fix bug',
            body: 'Fixes #123',
            head: 'feature',
            base: 'main',
          }),
        })
      )
    })

    it('throws on 422', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))

      await expect(
        createPullRequest('owner', 'repo', 'title', 'body', 'head', 'base', 'token')
      ).rejects.toThrow('GitHub API error: 422')
    })
  })
})
