import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DeckSource } from './sources/types'

const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10MB

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    // unsafe-eval required by Mermaid.js for diagram rendering
    "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'",
}

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function setSecurityHeaders(res: http.ServerResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value)
  }
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(body)
}

function sendText(res: http.ServerResponse, status: number, text: string, contentType = 'text/plain; charset=utf-8'): void {
  res.writeHead(status, { 'Content-Type': contentType })
  res.end(text)
}

function sendError(res: http.ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message })
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let rejected = false

    req.on('data', (chunk: Buffer) => {
      if (rejected) return
      size += chunk.length
      if (size > limit) {
        rejected = true
        reject(new Error('BODY_TOO_LARGE'))
        req.resume() // Drain remaining data to avoid hanging
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (!rejected) {
        resolve(Buffer.concat(chunks).toString('utf-8'))
      }
    })

    req.on('error', (err) => {
      if (!rejected) {
        reject(err)
      }
    })
  })
}

function extractIdFromPath(pathname: string, prefix: string): string | null {
  const rest = pathname.slice(prefix.length)
  // The ID is everything after the prefix, with no further slashes
  if (!rest || rest.includes('/')) return null
  const decoded = decodeURIComponent(rest)
  if (!VALID_ID_PATTERN.test(decoded)) return null
  return decoded
}

export function createServer(source: DeckSource, distDir: string, port: number): http.Server {
  const resolvedDistDir = path.resolve(distDir)

  // Read and inject meta tags into index.html at startup
  let indexHtml = ''
  const indexHtmlReady = fs.readFile(path.join(resolvedDistDir, 'index.html'), 'utf-8').then(
    (content) => {
      const safeSourceType = source.sourceType === 'local' || source.sourceType === 'github' ? source.sourceType : 'unknown'
      const metaTags = `<meta name="dekk-mode" content="cli"><meta name="dekk-source" content="${safeSourceType}">`
      indexHtml = content.replace('<head>', `<head>${metaTags}`)
    },
    () => {
      // index.html may not exist in test scenarios with minimal dist
      indexHtml = ''
    }
  )

  const handler = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
    setSecurityHeaders(res)

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const pathname = url.pathname
    const method = req.method ?? 'GET'

    // --- API routes ---

    if (pathname === '/api/decks' && method === 'GET') {
      const decks = await source.listDecks()
      sendJson(res, 200, decks)
      return
    }

    if (pathname.startsWith('/api/deck/') && method === 'GET') {
      const id = extractIdFromPath(pathname, '/api/deck/')
      if (!id) {
        sendError(res, 400, 'Invalid deck ID')
        return
      }
      try {
        const markdown = await source.readDeck(id)
        sendText(res, 200, markdown, 'text/markdown; charset=utf-8')
      } catch {
        sendError(res, 404, 'Deck not found')
      }
      return
    }

    if (pathname.startsWith('/api/write/') && method === 'POST') {
      const id = extractIdFromPath(pathname, '/api/write/')
      if (!id) {
        sendError(res, 400, 'Invalid deck ID')
        return
      }

      const contentType = req.headers['content-type'] ?? ''
      if (!contentType.includes('application/json')) {
        sendError(res, 415, 'Content-Type must be application/json')
        return
      }

      let body: string
      try {
        body = await readBody(req, MAX_BODY_SIZE)
      } catch (err) {
        if (err instanceof Error && err.message === 'BODY_TOO_LARGE') {
          sendError(res, 413, 'Request body too large')
          return
        }
        sendError(res, 400, 'Failed to read request body')
        return
      }

      let parsed: { content?: unknown }
      try {
        parsed = JSON.parse(body) as { content?: unknown }
      } catch {
        sendError(res, 400, 'Invalid JSON')
        return
      }

      if (typeof parsed.content !== 'string') {
        sendError(res, 400, 'Missing or invalid "content" field')
        return
      }

      try {
        const result = await source.writeDeck(id, parsed.content)
        sendJson(res, 200, result)
      } catch {
        sendError(res, 500, 'Failed to write deck')
      }
      return
    }

    // Catch-all for unknown /api/ routes
    if (pathname.startsWith('/api/')) {
      sendError(res, 404, 'Not found')
      return
    }

    // --- Static file serving ---

    // Wait for index.html to be ready
    await indexHtmlReady

    // Normalize pathname to a file path
    let filePath = path.join(resolvedDistDir, pathname === '/' ? 'index.html' : pathname)
    filePath = path.resolve(filePath)

    // Path traversal protection
    if (!filePath.startsWith(resolvedDistDir)) {
      sendError(res, 403, 'Forbidden')
      return
    }

    // No dotfiles
    const relative = path.relative(resolvedDistDir, filePath)
    if (relative.split(path.sep).some((segment) => segment.startsWith('.'))) {
      sendError(res, 403, 'Forbidden')
      return
    }

    // Serve injected index.html for root and index.html requests
    const indexHtmlPath = path.join(resolvedDistDir, 'index.html')
    if (filePath === indexHtmlPath) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(indexHtml)
      return
    }

    // Try to serve the file
    try {
      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        // SPA fallback for directory requests
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(indexHtml)
        return
      }

      const ext = path.extname(filePath).toLowerCase()
      const mime = MIME_TYPES[ext] ?? 'application/octet-stream'
      const content = await fs.readFile(filePath)
      res.writeHead(200, { 'Content-Type': mime })
      res.end(content)
    } catch {
      // File not found — SPA fallback: serve index.html
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(indexHtml)
    }
  }

  const server = http.createServer((req, res) => {
    handler(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Internal server error'
      if (!res.headersSent) {
        sendError(res, 500, message)
      }
    })
  })

  server.timeout = 30000
  server.headersTimeout = 10000

  server.listen(port, '127.0.0.1')

  return server
}
