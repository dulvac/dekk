import { getDeck } from './deckRegistry'

export const STORAGE_KEY = 'dekk-slides'
const DECK_KEY_PREFIX = 'dekk-deck-'
const OLD_STORAGE_KEY = 'dekk-slides'

export function saveToLocalStorage(markdown: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, markdown)
    return true
  } catch {
    return false
  }
}

export function loadFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export async function loadFromUrl(url: string): Promise<string> {
  // Only allow HTTPS URLs for security
  if (!url.startsWith('https://')) {
    throw new Error('Only HTTPS URLs are supported')
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load: ${response.status}`)
  return response.text()
}

export function getDefaultSlides(): string {
  const entry = getDeck('default')
  return entry?.rawMarkdown ?? '# No Default Deck Found'
}

export interface LoadResult {
  markdown: string
  sourceUrl?: string
}

export async function loadMarkdown(): Promise<LoadResult> {
  const stored = loadFromLocalStorage()
  if (stored) return { markdown: stored }

  const hash = window.location.hash
  const urlMatch = hash.match(/[?&]url=([^&]+)/)
  if (urlMatch) {
    try {
      const url = decodeURIComponent(urlMatch[1])
      const markdown = await loadFromUrl(url)
      return { markdown, sourceUrl: url }
    } catch {
      // Fall through to default
    }
  }

  return { markdown: getDefaultSlides() }
}

export function loadDeck(deckId: string): string | null {
  try {
    const draft = localStorage.getItem(`${DECK_KEY_PREFIX}${deckId}`)
    if (draft) return draft
  } catch {
    /* ignore */
  }

  const entry = getDeck(deckId)
  return entry?.rawMarkdown ?? null
}

export function saveDeckDraft(deckId: string, markdown: string): boolean {
  try {
    localStorage.setItem(`${DECK_KEY_PREFIX}${deckId}`, markdown)
    return true
  } catch {
    return false
  }
}

export function migrateOldStorage(): void {
  try {
    const old = localStorage.getItem(OLD_STORAGE_KEY)
    if (old && !localStorage.getItem(`${DECK_KEY_PREFIX}default`)) {
      localStorage.setItem(`${DECK_KEY_PREFIX}default`, old)
      localStorage.removeItem(OLD_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}
