import { describe, it, expect } from 'vitest'
import { highlightCode } from './highlighter'

describe('highlightCode', () => {
  it('returns highlighted HTML for a code string', async () => {
    const html = await highlightCode('const x = 1', 'typescript')
    expect(html).toContain('<pre')
    expect(html).toContain('const')
  })

  it('handles unknown languages gracefully', async () => {
    const html = await highlightCode('hello', 'unknownlang')
    expect(html).toBeTruthy()
  })

  it('handles empty string input', async () => {
    const html = await highlightCode('', 'typescript')
    expect(html).toBeDefined()
  })
})
