export interface DeckEntry {
  id: string
  title: string
  author?: string
  slideCount: number
  rawMarkdown: string
}

function extractTitle(markdown: string): { title?: string; author?: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return {}
  const result: { title?: string; author?: string } = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key === 'title') result.title = value
    if (key === 'author') result.author = value
  }
  return result
}

function countSlides(markdown: string): number {
  // Remove frontmatter before counting
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '')
  if (!body.trim()) return 0
  return body.split(/\n---\n/).length
}

export function buildRegistry(files: Record<string, string>): DeckEntry[] {
  const entries: DeckEntry[] = []

  for (const [filePath, rawMarkdown] of Object.entries(files)) {
    const match = filePath.match(/\/presentations\/([^/]+)\/slides\.md$/)
    if (!match) continue

    const id = match[1]
    const { title, author } = extractTitle(rawMarkdown)
    entries.push({
      id,
      title: title || id,
      author,
      slideCount: countSlides(rawMarkdown),
      rawMarkdown,
    })
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

// Build-time glob — Vite resolves this at compile time
const markdownFiles = import.meta.glob<string>(
  '/presentations/*/slides.md',
  { eager: true, query: '?raw', import: 'default' }
)

export const deckRegistry: DeckEntry[] = buildRegistry(markdownFiles as Record<string, string>)

export function getDeck(id: string): DeckEntry | undefined {
  return deckRegistry.find(entry => entry.id === id)
}
