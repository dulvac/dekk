// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import type { AddressInfo } from 'node:net'
import type { DeckSource } from '../sources/types'
import type { DeckListEntry, WriteResult } from '../../shared/types'
import { createServer } from '../server'

function createMockSource(overrides: Partial<DeckSource> = {}): DeckSource {
  const decks: DeckListEntry[] = [
    { id: 'intro', title: 'Intro Talk', slideCount: 3 },
    { id: 'advanced', title: 'Advanced Topics', author: 'Ada', slideCount: 5 },
  ]

  return {
    listDecks: async () => decks,
    readDeck: async (id: string) => {
      if (id === 'intro') return '# Slide 1\n---\n# Slide 2\n---\n# Slide 3'
      if (id === 'advanced') return '# Advanced\n---\n# Deep Dive'
      throw new Error(`Deck not found: ${id}`)
    },
    writeDeck: async (): Promise<WriteResult> => ({}),
    dispose: async () => {},
    writable: true,
    sourceType: 'local',
    ...overrides,
  }
}

function fetch(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    let settled = false
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          settled = true
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf-8'),
          })
        })
      }
    )
    req.on('error', (err) => {
      if (!settled) reject(err)
    })
    if (options.body) {
      req.write(options.body, () => {
        // Ignore write errors — the response handler will resolve
      })
    }
    req.end()
  })
}

describe('createServer', () => {
  let server: http.Server
  let baseUrl: string
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dekk-server-test-'))
    await fs.writeFile(
      path.join(tmpDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>Dekk</title></head><body></body></html>'
    )
  })

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  function startServer(source?: DeckSource): Promise<string> {
    return new Promise((resolve) => {
      const src = source ?? createMockSource()
      server = createServer(src, tmpDir, 0)
      server.on('listening', () => {
        const addr = server.address() as AddressInfo
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve(baseUrl)
      })
    })
  }

  it('GET /api/decks returns JSON array of DeckListEntry', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/api/decks`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')

    const data = JSON.parse(res.body) as DeckListEntry[]
    expect(data).toHaveLength(2)
    expect(data[0]).toEqual({ id: 'intro', title: 'Intro Talk', slideCount: 3 })
    expect(data[1]).toEqual({ id: 'advanced', title: 'Advanced Topics', author: 'Ada', slideCount: 5 })
  })

  it('GET /api/deck/:id returns raw markdown string', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/api/deck/intro`)

    expect(res.status).toBe(200)
    const ct = res.headers['content-type'] ?? ''
    expect(ct.includes('text/plain') || ct.includes('text/markdown')).toBe(true)
    expect(res.body).toBe('# Slide 1\n---\n# Slide 2\n---\n# Slide 3')
  })

  it('POST /api/write/:id writes to source and returns 200', async () => {
    let writtenId = ''
    let writtenContent = ''
    const source = createMockSource({
      writeDeck: async (id: string, content: string): Promise<WriteResult> => {
        writtenId = id
        writtenContent = content
        return { prUrl: 'https://github.com/org/repo/pull/1' }
      },
    })

    await startServer(source)
    const res = await fetch(`${baseUrl}/api/write/intro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '# Updated slide' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(writtenId).toBe('intro')
    expect(writtenContent).toBe('# Updated slide')

    const data = JSON.parse(res.body) as WriteResult
    expect(data.prUrl).toBe('https://github.com/org/repo/pull/1')
  })

  it('POST /api/write/:id rejects non-JSON Content-Type with 415', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/api/write/intro`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '# some markdown',
    })

    expect(res.status).toBe(415)
  })

  it('POST /api/write/:id rejects body > 10MB with 413', async () => {
    await startServer()
    const largeBody = JSON.stringify({ content: 'x'.repeat(11 * 1024 * 1024) })
    const res = await fetch(`${baseUrl}/api/write/intro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largeBody,
    })

    expect(res.status).toBe(413)
  })

  it('GET / serves index.html with <meta name="dekk-mode"> injected', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('<meta name="dekk-mode" content="cli">')
    expect(res.body).toContain('<meta name="dekk-source" content="local">')
  })

  it('security headers present on all responses', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/api/decks`)

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
  })

  it('GET /api/deck/../../etc/passwd returns 400 (invalid ID)', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/api/deck/..%2F..%2Fetc%2Fpasswd`)

    expect(res.status).toBe(400)
  })

  it('unknown routes return 404', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/api/nonexistent`)

    expect(res.status).toBe(404)
  })

  it('SPA fallback serves index.html for non-API, non-file routes', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/some/deep/route`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('<meta name="dekk-mode" content="cli">')
  })

  it('serves static files from dist directory', async () => {
    await fs.mkdir(path.join(tmpDir, 'assets'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, 'assets', 'app.js'), 'console.log("hello")')

    await startServer()
    const res = await fetch(`${baseUrl}/assets/app.js`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/javascript')
    expect(res.body).toBe('console.log("hello")')
  })

  it('prevents path traversal on static files', async () => {
    await startServer()
    const res = await fetch(`${baseUrl}/..%2F..%2Fetc%2Fpasswd`)

    // Should either 403 or fall through to SPA (not serve the file)
    expect([200, 403]).toContain(res.status)
    if (res.status === 200) {
      // SPA fallback — should be index.html, not /etc/passwd
      expect(res.body).toContain('<!DOCTYPE html>')
    }
  })

  it('does not serve dotfiles', async () => {
    await fs.writeFile(path.join(tmpDir, '.env'), 'SECRET=foo')

    await startServer()
    const res = await fetch(`${baseUrl}/.env`)

    expect(res.status).toBe(403)
  })
})
