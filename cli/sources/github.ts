import type { DeckListEntry, WriteResult } from '../../shared/types'
import type { DeckSource } from './types'

export interface GitHubSourceOptions {
  host: string
  owner: string
  repo: string
  path: string
  ref?: string
  token?: string
}

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const THEMATIC_BREAK_LINE = /^\s*(?:(-\s*){3,}|(\*\s*){3,}|(_\s*){3,})\s*$/

interface RegistryEntry {
  path: string
  sha?: string
}

export class GitHubSource implements DeckSource {
  readonly writable = true as const
  readonly sourceType = 'github' as const

  private readonly apiBase: string
  private readonly owner: string
  private readonly repo: string
  private readonly basePath: string
  private readonly ref: string | undefined
  private readonly token: string | undefined
  private readonly cache = new Map<string, string>()
  private registry = new Map<string, RegistryEntry>()

  constructor(options: GitHubSourceOptions) {
    this.owner = options.owner
    this.repo = options.repo
    this.basePath = options.path.replace(/^\/+|\/+$/g, '')
    this.ref = options.ref
    this.token = options.token

    // github.com uses api.github.com, GHE uses {host}/api/v3
    this.apiBase =
      options.host === 'github.com'
        ? 'https://api.github.com'
        : `https://${options.host}/api/v3`
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async listDecks(): Promise<DeckListEntry[]> {
    this.registry.clear()
    this.cache.clear()

    const refParam = this.ref
      ? `?ref=${encodeURIComponent(this.ref)}`
      : ''
    const contentsPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${this.basePath}${refParam}`

    const res = await this.apiFetch(contentsPath)
    this.assertOk(res, 'Failed to list decks')

    const items = (await res.json()) as Array<{
      name: string
      type: string
      size?: number
    }>

    const entries: DeckListEntry[] = []

    for (const item of items) {
      if (item.type === 'dir') {
        try {
          const content = await this.fetchFileContent(
            `${this.basePath}/${item.name}/slides.md`
          )
          const { title, author } = extractFrontmatter(content)
          const slideCount = countSlides(content)

          this.registry.set(item.name, {
            path: `${this.basePath}/${item.name}/slides.md`,
          })
          this.cache.set(item.name, content)
          entries.push({
            id: item.name,
            title: title ?? item.name,
            author,
            slideCount,
          })
        } catch {
          // No slides.md in this dir — skip
        }
      } else if (
        item.type === 'file' &&
        item.name.endsWith('.md') &&
        item.name !== 'README.md'
      ) {
        const id = item.name.replace(/\.md$/, '')
        try {
          const content = await this.fetchFileContent(
            `${this.basePath}/${item.name}`
          )
          const { title, author } = extractFrontmatter(content)
          const slideCount = countSlides(content)

          this.registry.set(id, {
            path: `${this.basePath}/${item.name}`,
          })
          this.cache.set(id, content)
          entries.push({
            id,
            title: title ?? id,
            author,
            slideCount,
          })
        } catch {
          // Skip unreadable files
        }
      }
    }

    return entries.sort((a, b) => a.id.localeCompare(b.id))
  }

  async readDeck(id: string): Promise<string> {
    validateId(id)

    const cached = this.cache.get(id)
    if (cached !== undefined) return cached

    const entry = this.registry.get(id)
    if (!entry) throw new Error(`Deck not found: ${id}`)

    const content = await this.fetchFileContent(entry.path)
    this.cache.set(id, content)
    return content
  }

  async writeDeck(id: string, content: string): Promise<WriteResult> {
    validateId(id)

    if (!this.token) {
      throw new Error('Authentication required to write')
    }

    const entry = this.registry.get(id)
    if (!entry) throw new Error(`Deck not found: ${id}`)

    // 1. Get current file SHA
    const fileSha = await this.getFileSha(entry.path)

    // 2. Get branch HEAD sha
    const baseBranch = this.ref ?? (await this.getDefaultBranch())
    const headSha = await this.getBranchSha(baseBranch)

    // 3. Create feature branch
    const branchName = `dekk-edit-${Date.now()}`
    await this.createBranch(branchName, headSha)

    // 4. Update file on new branch
    await this.updateFile(entry.path, content, fileSha, branchName)

    // 5. Open PR
    const prUrl = await this.createPR(branchName, baseBranch, id)

    this.cache.set(id, content)
    return { prUrl }
  }

  async dispose(): Promise<void> {
    this.cache.clear()
    this.registry.clear()
  }

  // ---------------------------------------------------------------------------
  // Private helpers — API calls
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`
    }
    return h
  }

  private async apiFetch(path: string): Promise<Response> {
    const url = `${this.apiBase}${path}`
    const res = await fetch(url, { headers: this.headers() })

    if (res.status === 403) {
      const remaining = res.headers.get('X-RateLimit-Remaining')
      if (remaining === '0') {
        throw new Error(
          'GitHub API rate limit exceeded. Use a personal access token or wait.'
        )
      }
    }

    return res
  }

  /** Throw a sanitised error if response is not ok. */
  private assertOk(res: Response, prefix: string): void {
    if (!res.ok) {
      throw new Error(this.sanitise(`${prefix}: ${res.status}`))
    }
  }

  /** Strip any token fragments from a string before surfacing it. */
  private sanitise(msg: string): string {
    if (!this.token) return msg
    return msg.replaceAll(this.token, '***')
  }

  private async fetchFileContent(filePath: string): Promise<string> {
    const refParam = this.ref
      ? `?ref=${encodeURIComponent(this.ref)}`
      : ''
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${filePath}${refParam}`

    const res = await this.apiFetch(apiPath)
    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to fetch ${filePath}: ${res.status}`))
    }

    const body = (await res.json()) as {
      content: string
      encoding: string
      sha: string
    }

    return Buffer.from(body.content, 'base64').toString('utf-8')
  }

  private async getFileSha(filePath: string): Promise<string> {
    const refParam = this.ref
      ? `?ref=${encodeURIComponent(this.ref)}`
      : ''
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${filePath}${refParam}`

    const res = await this.apiFetch(apiPath)
    this.assertOk(res, 'Failed to get file SHA')

    const body = (await res.json()) as { sha: string }
    return body.sha
  }

  private async getDefaultBranch(): Promise<string> {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}`
    const res = await this.apiFetch(apiPath)
    this.assertOk(res, 'Failed to get repository info')

    const body = (await res.json()) as { default_branch: string }
    return body.default_branch
  }

  private async getBranchSha(branch: string): Promise<string> {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/branches/${enc(branch)}`
    const res = await this.apiFetch(apiPath)
    this.assertOk(res, 'Failed to get branch info')

    const body = (await res.json()) as { commit: { sha: string } }
    return body.commit.sha
  }

  private async createBranch(name: string, sha: string): Promise<void> {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/git/refs`
    const res = await fetch(`${this.apiBase}${apiPath}`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
    })

    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to create branch: ${res.status}`))
    }
  }

  private async updateFile(
    filePath: string,
    content: string,
    sha: string,
    branch: string
  ): Promise<void> {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/contents/${filePath}`
    const res = await fetch(`${this.apiBase}${apiPath}`, {
      method: 'PUT',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update deck: ${filePath}`,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        sha,
        branch,
      }),
    })

    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to update file: ${res.status}`))
    }
  }

  private async createPR(
    branch: string,
    base: string,
    deckId: string
  ): Promise<string> {
    const apiPath = `/repos/${enc(this.owner)}/${enc(this.repo)}/pulls`
    const res = await fetch(`${this.apiBase}${apiPath}`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[dekk] Update deck: ${deckId}`,
        body: `Automated update of deck \`${deckId}\` via Dekk CLI.`,
        head: branch,
        base,
      }),
    })

    if (!res.ok) {
      throw new Error(this.sanitise(`Failed to create PR: ${res.status}`))
    }

    const body = (await res.json()) as { html_url: string }
    return body.html_url
  }
}

// ---------------------------------------------------------------------------
// Standalone helpers (no class dependency)
// ---------------------------------------------------------------------------

function enc(segment: string): string {
  return encodeURIComponent(segment)
}

function validateId(id: string): void {
  if (!VALID_ID_PATTERN.test(id)) {
    throw new Error(`Invalid deck ID: "${id}". Must match [a-zA-Z0-9_-]+`)
  }
}

function extractFrontmatter(markdown: string): {
  title?: string
  author?: string
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return {}

  const result: { title?: string; author?: string } = {}
  const lines = match[1].split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      if (key === 'title') result.title = value
      if (key === 'author') result.author = value
    }
  }

  return result
}

function countSlides(markdown: string): number {
  let body = markdown
  const fmMatch = markdown.match(/^---\n[\s\S]*?\n---\n/)
  if (fmMatch) {
    body = markdown.slice(fmMatch[0].length)
  }

  if (!body.trim()) return 0

  const lines = body.split('\n')
  let slideCount = 1

  for (const line of lines) {
    if (THEMATIC_BREAK_LINE.test(line)) {
      slideCount++
    }
  }

  return slideCount
}
