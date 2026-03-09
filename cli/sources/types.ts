import type { DeckListEntry, WriteResult } from '../../shared/types'

export interface DeckSource {
  listDecks(): Promise<DeckListEntry[]>
  readDeck(id: string): Promise<string>
  writeDeck(id: string, content: string): Promise<WriteResult>
  dispose(): Promise<void>
  readonly writable: boolean
  readonly sourceType: 'local' | 'github'
}
