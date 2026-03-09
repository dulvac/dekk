export interface GitHubUrlInfo {
  host: string
  owner: string
  repo: string
  ref?: string
  path: string
}

const VALID_SEGMENT = /^[a-zA-Z0-9_.-]+$/

/**
 * Branch prefixes that conventionally contain a slash (e.g. feature/xyz).
 * When the first segment after "tree/" matches one of these, the parser
 * consumes two segments for the ref instead of one.
 */
const MULTI_SEGMENT_PREFIXES = new Set([
  'feature',
  'fix',
  'hotfix',
  'bugfix',
  'release',
  'chore',
  'docs',
  'dependabot',
])

export function parseGitHubUrl(
  input: string,
  refOverride?: string
): GitHubUrlInfo | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') {
    return null
  }

  // Split pathname, filter empty segments from leading/trailing slashes
  const segments = url.pathname.split('/').filter(Boolean)

  // Need at least owner and repo (2 segments)
  if (segments.length < 2) {
    return null
  }

  const owner = segments[0]
  const repo = segments[1]

  // Validate owner/repo against allowed characters
  if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
    return null
  }

  const host = url.hostname

  // No tree segment — repo-only URL
  if (segments.length === 2) {
    return {
      host,
      owner,
      repo,
      ref: refOverride,
      path: '/',
    }
  }

  // If segment 3 is not 'tree', treat as repo-only
  if (segments[2] !== 'tree') {
    return {
      host,
      owner,
      repo,
      ref: refOverride,
      path: '/',
    }
  }

  // We have a tree URL: /{owner}/{repo}/tree/{ref...}/{path...}
  // Segments after "tree" (index 3+)
  const afterTree = segments.slice(3)

  if (afterTree.length === 0) {
    return {
      host,
      owner,
      repo,
      ref: refOverride,
      path: '/',
    }
  }

  let parsedRef: string
  let pathSegments: string[]

  // Determine how many segments the ref consumes
  const firstRefSegment = afterTree[0]
  if (
    MULTI_SEGMENT_PREFIXES.has(firstRefSegment) &&
    afterTree.length >= 2
  ) {
    // Two-segment ref: e.g. feature/new-talk
    parsedRef = `${afterTree[0]}/${afterTree[1]}`
    pathSegments = afterTree.slice(2)
  } else {
    // Single-segment ref: e.g. main, v1.0.0
    parsedRef = afterTree[0]
    pathSegments = afterTree.slice(1)
  }

  const ref = refOverride ?? parsedRef
  const path = pathSegments.length > 0 ? pathSegments.join('/') : '/'

  return { host, owner, repo, ref, path }
}
