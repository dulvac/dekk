/** Lightweight entry for deck listing — no raw content */
export interface DeckListEntry {
  id: string
  title: string
  author?: string
  slideCount: number
}

/** Full deck entry including raw markdown content */
export interface DeckEntry extends DeckListEntry {
  rawMarkdown: string
}

/** Result from writing a deck back to source */
export interface WriteResult {
  prUrl?: string
}
