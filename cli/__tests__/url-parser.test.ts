import { describe, it, expect } from 'vitest'
import { parseGitHubUrl } from '../url-parser'
import type { GitHubUrlInfo } from '../url-parser'

describe('parseGitHubUrl', () => {
  it('parses standard github.com URL with path', () => {
    const result = parseGitHubUrl(
      'https://github.com/org/repo/tree/main/presentations'
    )
    expect(result).toEqual<GitHubUrlInfo>({
      host: 'github.com',
      owner: 'org',
      repo: 'repo',
      ref: 'main',
      path: 'presentations',
    })
  })

  it('parses URL with feature branch', () => {
    const result = parseGitHubUrl(
      'https://github.com/acme/slides/tree/feature/new-talk/deck/intro'
    )
    expect(result).toEqual<GitHubUrlInfo>({
      host: 'github.com',
      owner: 'acme',
      repo: 'slides',
      ref: 'feature/new-talk',
      path: 'deck/intro',
    })
  })

  it('parses GHE URL', () => {
    const result = parseGitHubUrl(
      'https://git.corp.example.com/team/slides/tree/main/2026'
    )
    expect(result).toEqual<GitHubUrlInfo>({
      host: 'git.corp.example.com',
      owner: 'team',
      repo: 'slides',
      ref: 'main',
      path: '2026',
    })
  })

  it('parses repo-only URL (no path or ref)', () => {
    const result = parseGitHubUrl('https://github.com/org/repo')
    expect(result).toEqual<GitHubUrlInfo>({
      host: 'github.com',
      owner: 'org',
      repo: 'repo',
      ref: undefined,
      path: '/',
    })
  })

  it('allows --ref override', () => {
    const result = parseGitHubUrl(
      'https://github.com/org/repo/tree/main/presentations',
      'develop'
    )
    expect(result).toEqual<GitHubUrlInfo>({
      host: 'github.com',
      owner: 'org',
      repo: 'repo',
      ref: 'develop',
      path: 'presentations',
    })
  })

  it('returns null for non-HTTPS URLs', () => {
    expect(parseGitHubUrl('http://github.com/org/repo')).toBeNull()
  })

  it('returns null for non-GitHub-shaped URLs (only one path segment)', () => {
    expect(parseGitHubUrl('https://example.com/file.txt')).toBeNull()
  })

  it('validates owner/repo format (rejects ../ in segments)', () => {
    expect(parseGitHubUrl('https://github.com/../repo')).toBeNull()
    expect(parseGitHubUrl('https://github.com/org/../../etc')).toBeNull()
  })
})
