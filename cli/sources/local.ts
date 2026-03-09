import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, relative } from 'node:path'
import type { DeckListEntry, WriteResult } from '../../shared/types'
import type { DeckSource } from './types'

const VALID_ID = /^[a-zA-Z0-9_-]+$/
const THEMATIC_BREAK_LINE = /^\s*(?:(-\s*){3,}|(\*\s*){3,}|(_\s*){3,})\s*$/

interface RegistryEntry {
  id: string
  absolutePath: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
  // Strip frontmatter first
  let body = markdown
  const fmMatch = markdown.match(/^---\n[\s\S]*?\n---\n/)
  if (fmMatch) {
    body = markdown.slice(fmMatch[0].length)
  }

  if (!body.trim()) return 0

  const lines = body.split('\n')
  let slideCount = 1 // starts with at least one slide

  for (const line of lines) {
    if (THEMATIC_BREAK_LINE.test(line)) {
      slideCount++
    }
  }

  return slideCount
}

function validateId(id: string): void {
  if (!VALID_ID.test(id)) {
    throw new Error(`Invalid deck ID: "${id}". Must match [a-zA-Z0-9_-]+`)
  }
}

export class LocalSource implements DeckSource {
  readonly writable = true as const
  readonly sourceType = 'local' as const

  private readonly baseDir: string
  private registry = new Map<string, RegistryEntry>()

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir)
  }

  async listDecks(): Promise<DeckListEntry[]> {
    this.registry.clear()
    const entries = await readdir(this.baseDir, { withFileTypes: true })
    const decks: DeckListEntry[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Check for subdirectory with slides.md
        const slidesPath = join(this.baseDir, entry.name, 'slides.md')
        try {
          const s = await stat(slidesPath)
          if (s.isFile()) {
            const id = slugify(entry.name)
            if (!id) continue
            const content = await readFile(slidesPath, 'utf-8')
            const { title, author } = extractFrontmatter(content)
            const slideCount = countSlides(content)

            this.registry.set(id, { id, absolutePath: slidesPath })
            decks.push({
              id,
              title: title ?? id,
              author,
              slideCount,
            })
          }
        } catch {
          // No slides.md in this directory, skip
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Standalone .md file
        const filePath = join(this.baseDir, entry.name)
        const baseName = entry.name.replace(/\.md$/, '')
        const id = slugify(baseName)
        if (!id) continue
        const content = await readFile(filePath, 'utf-8')
        const { title, author } = extractFrontmatter(content)
        const slideCount = countSlides(content)

        this.registry.set(id, { id, absolutePath: filePath })
        decks.push({
          id,
          title: title ?? id,
          author,
          slideCount,
        })
      }
    }

    return decks
  }

  async readDeck(id: string): Promise<string> {
    validateId(id)

    const entry = this.registry.get(id)
    if (!entry) {
      throw new Error(`Unknown deck: "${id}"`)
    }

    return readFile(entry.absolutePath, 'utf-8')
  }

  async writeDeck(id: string, content: string): Promise<WriteResult> {
    validateId(id)

    const entry = this.registry.get(id)
    if (!entry) {
      throw new Error(`Unknown deck: "${id}"`)
    }

    // Validate the resolved path is within baseDir
    const rel = relative(this.baseDir, entry.absolutePath)
    if (rel.startsWith('..') || resolve(entry.absolutePath) !== entry.absolutePath) {
      throw new Error('Path traversal detected')
    }

    await writeFile(entry.absolutePath, content, 'utf-8')
    return {}
  }

  async dispose(): Promise<void> {
    // No-op for local filesystem
  }
}
