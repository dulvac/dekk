import { describe, it, expect } from 'vitest'
import { parseArgs } from '../index'

describe('parseArgs', () => {
  it('parses local path argument', () => {
    const args = parseArgs(['./my-talks'])
    expect(args.source).toBe('./my-talks')
    expect(args.type).toBe('local')
  })

  it('parses GitHub URL argument', () => {
    const args = parseArgs(['https://github.com/org/repo/tree/main/decks'])
    expect(args.source).toBe('https://github.com/org/repo/tree/main/decks')
    expect(args.type).toBe('github')
  })

  it('parses --port flag', () => {
    const args = parseArgs(['--port', '3333', './talks'])
    expect(args.port).toBe(3333)
  })

  it('parses -p short flag', () => {
    const args = parseArgs(['-p', '8080', './talks'])
    expect(args.port).toBe(8080)
  })

  it('parses --no-open flag', () => {
    const args = parseArgs(['--no-open', './talks'])
    expect(args.open).toBe(false)
  })

  it('parses --ref flag', () => {
    const args = parseArgs(['--ref', 'feature/branch', 'https://github.com/o/r'])
    expect(args.ref).toBe('feature/branch')
  })

  it('parses --version', () => {
    const args = parseArgs(['--version'])
    expect(args.command).toBe('version')
  })

  it('parses --help', () => {
    const args = parseArgs(['--help'])
    expect(args.command).toBe('help')
  })

  it('parses --update', () => {
    const args = parseArgs(['--update'])
    expect(args.command).toBe('update')
  })

  it('parses --logout', () => {
    const args = parseArgs(['--logout'])
    expect(args.command).toBe('logout')
    expect(args.logoutHost).toBeUndefined()
  })

  it('parses --logout with host', () => {
    const args = parseArgs(['--logout', 'github.com'])
    expect(args.command).toBe('logout')
    expect(args.logoutHost).toBe('github.com')
  })

  it('defaults open to true', () => {
    const args = parseArgs(['./talks'])
    expect(args.open).toBe(true)
  })

  it('errors on no arguments', () => {
    expect(() => parseArgs([])).toThrow()
  })
})
