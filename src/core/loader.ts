import defaultSlides from '../assets/slides.md?raw'

export const STORAGE_KEY = 'marko-pollo-slides'

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
  return defaultSlides
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
