let saving = false

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return slug || 'presentation'
}

export function downloadMarkdown(
  markdown: string,
  title?: string,
  deckId?: string
): boolean {
  if (!markdown.trim()) return false

  const filename = `${deckId ? slugify(deckId) : (title ? slugify(title) : 'presentation')}.md`
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}

interface FileSystemWritableFileStream {
  write(data: string): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface ShowSaveFilePickerOptions {
  suggestedName?: string
  types?: Array<{
    description: string
    accept: Record<string, string[]>
  }>
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>
  }
}

export type SaveFileResult = 'saved' | 'cancelled' | 'not-available'

export async function saveMarkdownToFile(
  markdown: string,
  title?: string,
  deckId?: string
): Promise<SaveFileResult> {
  if (!window.showSaveFilePicker) return 'not-available'

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: `${deckId ? slugify(deckId) : (title ? slugify(title) : 'presentation')}.md`,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(markdown)
    await writable.close()
    return 'saved'
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    return 'not-available'
  }
}

export async function exportMarkdown(
  markdown: string,
  title?: string,
  deckId?: string
): Promise<boolean> {
  if (!markdown.trim() || saving) return false
  saving = true
  try {
    const result = await saveMarkdownToFile(markdown, title, deckId)
    if (result === 'saved') return true
    if (result === 'cancelled') return false
    // 'not-available' — fall back to blob download
    return downloadMarkdown(markdown, title, deckId)
  } finally {
    saving = false
  }
}
