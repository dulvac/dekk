import {
  getDefaultBranch,
  getFileContents,
  getBranchHead,
  createBranch,
  updateFileContents,
  createPullRequest,
} from './github-api'

export type Environment = 'dev' | 'github-pages' | 'unknown'

let cachedEnvironment: Environment | null = null

// For testing only
export function resetEnvironmentCache(): void {
  cachedEnvironment = null
}

export async function detectEnvironment(): Promise<Environment> {
  if (cachedEnvironment) return cachedEnvironment

  // Check if running in Vite dev server
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/__dekk/ping')
      if (response.ok) {
        cachedEnvironment = 'dev'
        return 'dev'
      }
    } catch {
      // Dev server not responding
    }
    cachedEnvironment = 'unknown'
    return 'unknown'
  }

  // Check if hosted on GitHub Pages
  const hostname = window.location.hostname
  const pathname = window.location.pathname

  // Pattern: {user}.github.io/{repo}/
  if (hostname.endsWith('.github.io') && pathname.length > 1) {
    cachedEnvironment = 'github-pages'
    return 'github-pages'
  }

  cachedEnvironment = 'unknown'
  return 'unknown'
}

export function detectGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url)

    // Must be github.io domain
    if (!parsed.hostname.endsWith('.github.io')) return null

    // Extract owner from subdomain (e.g., "octocat" from "octocat.github.io")
    const parts = parsed.hostname.split('.')
    if (parts.length < 3) return null
    const owner = parts[0]

    // Extract repo from pathname (e.g., "my-slides" from "/my-slides/" or "/my-slides")
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    if (pathParts.length === 0) return null
    const repo = pathParts[0]

    return { owner, repo }
  } catch {
    return null
  }
}

export async function saveToDevServer(filePath: string, content: string): Promise<boolean> {
  try {
    const response = await fetch('/__dekk/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function saveToGitHub(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  token: string
): Promise<{ prUrl: string }> {
  // Step 1: Get the default branch
  const defaultBranch = await getDefaultBranch(owner, repo, token)

  // Step 2: Get current file contents to retrieve its SHA
  const { sha: fileSha } = await getFileContents(owner, repo, filePath, defaultBranch, token)

  // Step 3: Get the HEAD commit SHA of the default branch
  const headSha = await getBranchHead(owner, repo, defaultBranch, token)

  // Step 4: Create a new branch from HEAD
  const timestamp = Date.now()
  const branchName = `dekk-${timestamp}`
  await createBranch(owner, repo, branchName, headSha, token)

  // Step 5: Update the file on the new branch
  const commitMessage = `Update presentation: ${filePath}`
  await updateFileContents(owner, repo, filePath, content, commitMessage, fileSha, branchName, token)

  // Step 6: Create a pull request
  const prTitle = commitMessage
  const prBody = `Automated update from Dekk editor.\n\n**File:** \`${filePath}\``
  const { url: prUrl } = await createPullRequest(
    owner,
    repo,
    prTitle,
    prBody,
    branchName,
    defaultBranch,
    token
  )

  return { prUrl }
}
