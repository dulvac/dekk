import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { LocalSource } from '../local'

describe('LocalSource', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dekk-local-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('discovers subdirectory decks with slides.md (title from frontmatter, slideCount)', async () => {
    const deckDir = join(tempDir, 'my-deck')
    await mkdir(deckDir)
    await writeFile(
      join(deckDir, 'slides.md'),
      '---\ntitle: My Deck\nauthor: Jane\n---\n# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3\n'
    )

    const source = new LocalSource(tempDir)
    const decks = await source.listDecks()

    expect(decks).toHaveLength(1)
    expect(decks[0].id).toBe('my-deck')
    expect(decks[0].title).toBe('My Deck')
    expect(decks[0].author).toBe('Jane')
    expect(decks[0].slideCount).toBe(3)
  })

  it('discovers standalone .md files as decks', async () => {
    await writeFile(
      join(tempDir, 'standalone-talk.md'),
      '---\ntitle: Standalone\n---\n# Only slide\n'
    )

    const source = new LocalSource(tempDir)
    const decks = await source.listDecks()

    expect(decks).toHaveLength(1)
    expect(decks[0].id).toBe('standalone-talk')
    expect(decks[0].title).toBe('Standalone')
    expect(decks[0].slideCount).toBe(1)
  })

  it('reads deck content by id', async () => {
    const deckDir = join(tempDir, 'readable')
    await mkdir(deckDir)
    const content = '---\ntitle: Readable\n---\n# Hello\n'
    await writeFile(join(deckDir, 'slides.md'), content)

    const source = new LocalSource(tempDir)
    await source.listDecks() // populate registry
    const result = await source.readDeck('readable')

    expect(result).toBe(content)
  })

  it('writes deck content back to disk', async () => {
    const deckDir = join(tempDir, 'writable')
    await mkdir(deckDir)
    await writeFile(join(deckDir, 'slides.md'), '# Original\n')

    const source = new LocalSource(tempDir)
    await source.listDecks() // populate registry

    const newContent = '# Updated\n'
    const result = await source.writeDeck('writable', newContent)

    expect(result).toEqual({})

    const readBack = await source.readDeck('writable')
    expect(readBack).toBe(newContent)
  })

  it('throws on unknown deck id', async () => {
    const source = new LocalSource(tempDir)
    await source.listDecks()

    await expect(source.readDeck('nonexistent')).rejects.toThrow()
  })

  it('rejects deck IDs with path traversal characters', async () => {
    const source = new LocalSource(tempDir)
    await source.listDecks()

    await expect(source.readDeck('../etc/passwd')).rejects.toThrow()
    await expect(source.readDeck('deck/../../secret')).rejects.toThrow()
    await expect(source.readDeck('deck..sneaky')).rejects.toThrow()
  })

  it('sanitizes deck IDs to alphanumeric + hyphen + underscore', async () => {
    const source = new LocalSource(tempDir)
    await source.listDecks()

    await expect(source.readDeck('valid-id_123')).rejects.toThrow('Unknown deck')
    await expect(source.readDeck('has spaces')).rejects.toThrow('Invalid deck ID')
    await expect(source.readDeck('has.dots')).rejects.toThrow('Invalid deck ID')
  })

  it('is writable and sourceType is local', () => {
    const source = new LocalSource(tempDir)
    expect(source.writable).toBe(true)
    expect(source.sourceType).toBe('local')
  })

  it('returns empty list for directory with no .md files', async () => {
    // tempDir is already empty
    const source = new LocalSource(tempDir)
    const decks = await source.listDecks()

    expect(decks).toEqual([])
  })
})
