import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs/promises'

const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10 MB

export function validateWritePath(root: string, rawPath: string): string | null {
  if (rawPath.includes('..') || path.isAbsolute(rawPath)) return null
  if (!/^(src|presentations)\/[a-zA-Z0-9_/-]+\.md$/.test(rawPath)) return null
  const resolved = path.resolve(root, rawPath)
  if (!resolved.startsWith(root + path.sep)) return null
  return resolved
}

export function vitePluginDevWrite(): Plugin {
  return {
    name: 'dekk-dev-write',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dekk/ping', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })

      server.middlewares.use('/__dekk/write-file', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }

        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > MAX_BODY_SIZE) {
            res.statusCode = 413
            res.end('Request body too large')
            return
          }
          chunks.push(chunk as Buffer)
        }

        try {
          const { path: filePath, content } = JSON.parse(Buffer.concat(chunks).toString())
          const resolved = validateWritePath(server.config.root, filePath)
          if (!resolved) {
            res.statusCode = 403
            res.end('Invalid path')
            return
          }
          await fs.writeFile(resolved, content, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch {
          res.statusCode = 400
          res.end('Bad request')
        }
      })
    },
  }
}
