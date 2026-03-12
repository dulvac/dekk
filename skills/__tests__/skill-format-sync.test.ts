import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PARSER_PATH = resolve(__dirname, '../../src/core/parser.ts')
const SKILL_PATH = resolve(__dirname, '../dekk/SKILL.md')

function readFile(path: string): string {
  return readFileSync(path, 'utf-8')
}

/**
 * Extract explicitly typed keys from a TypeScript interface.
 * Matches lines like: `  bg?: string` or `  title?: string`
 * Ignores index signatures like `[key: string]: ...`
 */
function extractInterfaceKeys(source: string, interfaceName: string): string[] {
  const regex = new RegExp(
    `export interface ${interfaceName}\\s*\\{([^}]+)\\}`,
    's'
  )
  const match = source.match(regex)
  if (!match) return []

  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('['))
    .map(line => line.match(/^(\w+)\??:/)?.[1])
    .filter((key): key is string => key !== undefined)
}

describe('Skill format sync', () => {
  const parserSource = readFile(PARSER_PATH)
  const skillContent = readFile(SKILL_PATH)

  it('documents all DeckMetadata keys', () => {
    const keys = extractInterfaceKeys(parserSource, 'DeckMetadata')
    for (const key of keys) {
      expect(
        skillContent.includes(key),
        `DeckMetadata key "${key}" is not documented in SKILL.md`
      ).toBe(true)
    }
  })

  it('documents all SlideMetadata keys', () => {
    const keys = extractInterfaceKeys(parserSource, 'SlideMetadata')
    for (const key of keys) {
      expect(
        skillContent.includes(key),
        `SlideMetadata key "${key}" is not documented in SKILL.md`
      ).toBe(true)
    }
  })

  it('documents thematic break separators', () => {
    expect(skillContent).toContain('---')
    expect(skillContent).toMatch(/thematic break/i)
  })

  it('documents HTML comment directive syntax', () => {
    expect(skillContent).toContain('<!--')
    expect(skillContent).toContain('-->')
  })

  it('warns about unquoted frontmatter values', () => {
    expect(skillContent).toMatch(/must NOT be quoted/i)
  })
})
