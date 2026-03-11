import { readFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { LocalSource } from './sources/local'
import { GitHubSource } from './sources/github'
import { createServer } from './server'
import { parseGitHubUrl } from './url-parser'
import { getToken, saveToken, deleteToken, isTokenOld, promptForToken } from './auth'
import type { DeckSource } from './sources/types'

const execFileAsync = promisify(execFile)

export interface CliArgs {
  command?: 'version' | 'help' | 'update' | 'logout'
  source?: string
  type?: 'local' | 'github'
  port: number
  open: boolean
  ref?: string
  logoutHost?: string
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    port: 3000,
    open: true,
  }

  let i = 0

  while (i < argv.length) {
    const arg = argv[i]

    switch (arg) {
      case '--version':
      case '-v':
        args.command = 'version'
        i++
        continue

      case '--help':
      case '-h':
        args.command = 'help'
        i++
        continue

      case '--update':
        args.command = 'update'
        i++
        continue

      case '--logout': {
        args.command = 'logout'
        i++
        // Optional host argument: must not start with '-'
        const nextLogout = argv[i]
        if (nextLogout !== undefined && !nextLogout.startsWith('-')) {
          args.logoutHost = nextLogout
          i++
        }
        continue
      }

      case '--port':
      case '-p': {
        i++
        const portStr = argv[i]
        if (portStr === undefined) {
          throw new Error('--port requires a number argument')
        }
        const port = Number(portStr)
        if (!Number.isFinite(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port number: ${portStr}`)
        }
        args.port = port
        i++
        continue
      }

      case '--no-open':
        args.open = false
        i++
        continue

      case '--ref': {
        i++
        const refVal = argv[i]
        if (refVal === undefined) {
          throw new Error('--ref requires a value')
        }
        args.ref = refVal
        i++
        continue
      }

      default:
        // Positional argument: source path or URL
        if (!arg.startsWith('-')) {
          args.source = arg
          args.type = arg.startsWith('https://') ? 'github' : 'local'
          i++
          continue
        }
        throw new Error(`Unknown flag: ${arg}`)
    }
  }

  // Must have either a command or a source
  if (!args.command && !args.source) {
    throw new Error(
      'Missing required argument. Run "dekk --help" for usage information.'
    )
  }

  return args
}

const HELP_TEXT = `Usage: dekk <path-or-url> [options]

Arguments:
  <path-or-url>    Local directory or GitHub URL containing decks

Options:
  --port, -p <n>   Port to serve on (default: 3000)
  --ref <ref>       Git ref to use for GitHub sources
  --no-open         Don't open browser automatically

Commands:
  --version, -v     Print version and exit
  --help, -h        Print this help message and exit
  --update          Update dekk via Homebrew
  --logout [host]   Remove stored credentials

Examples:
  dekk ./my-talks
  dekk https://github.com/org/repo/tree/main/decks
  dekk --port 8080 ./talks
  dekk --ref feature/new-talk https://github.com/org/repo`

async function getVersion(): Promise<string> {
  const thisFile = fileURLToPath(import.meta.url)
  const packageJsonPath = path.resolve(path.dirname(thisFile), 'package.json')
  const content = await readFile(packageJsonPath, 'utf-8')
  const pkg = JSON.parse(content) as { version: string }
  return pkg.version
}

async function handleVersion(): Promise<void> {
  const version = await getVersion()
  console.log(`dekk ${version}`)
}

function handleHelp(): void {
  console.log(HELP_TEXT)
}

async function handleUpdate(): Promise<void> {
  console.log('Updating dekk via Homebrew...')
  try {
    const { stdout } = await execFileAsync('brew', ['upgrade', 'dulvac/tap/dekk'])
    console.log(stdout)
    console.log('Update complete.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Update failed: ${message}`)
    process.exit(1)
  }
}

async function handleLogout(host?: string): Promise<void> {
  await deleteToken(host)
  if (host) {
    console.log(`Credentials removed for ${host}`)
  } else {
    console.log('All stored credentials removed')
  }
}

async function handleServe(args: CliArgs): Promise<void> {
  if (!args.source || !args.type) {
    throw new Error('No source specified')
  }

  let source: DeckSource

  if (args.type === 'github') {
    const parsed = parseGitHubUrl(args.source, args.ref)
    if (!parsed) {
      throw new Error(`Invalid GitHub URL: ${args.source}`)
    }

    // Try to get stored token first
    let token = await getToken(parsed.host)

    if (token) {
      const old = await isTokenOld(parsed.host)
      if (old) {
        console.warn(`Warning: Token for ${parsed.host} is over 90 days old. Consider refreshing it.`)
      }
    }

    // Create source — if it fails with auth error, prompt for token
    source = new GitHubSource({
      host: parsed.host,
      owner: parsed.owner,
      repo: parsed.repo,
      path: parsed.path,
      ref: parsed.ref,
      token: token ?? undefined,
    })

    // Test the connection by listing decks
    try {
      await source.listDecks()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('401') || msg.includes('403')) {
        console.log(`Authentication required for ${parsed.host}`)
        token = await promptForToken(parsed.host)
        await saveToken(parsed.host, token, 'cli-user')

        // Recreate source with token
        await source.dispose()
        source = new GitHubSource({
          host: parsed.host,
          owner: parsed.owner,
          repo: parsed.repo,
          path: parsed.path,
          ref: parsed.ref,
          token,
        })
      } else {
        throw err
      }
    }
  } else {
    // Validate local path
    const sourcePath = path.resolve(args.source)
    let sourceStat: Awaited<ReturnType<typeof stat>>
    try {
      sourceStat = await stat(sourcePath)
    } catch {
      throw new Error(`Path does not exist: ${sourcePath}`)
    }
    if (!sourceStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${sourcePath}`)
    }

    source = new LocalSource(sourcePath)
  }
  const thisFile = fileURLToPath(import.meta.url)
  const distDir = path.resolve(path.dirname(thisFile), 'dist')
  const server = createServer(source, distDir, args.port)

  const url = `http://127.0.0.1:${args.port}`
  console.log(`Serving decks from ${args.source}`)
  console.log(`Open ${url} in your browser`)

  if (args.open) {
    execFileAsync('open', [url]).catch(() => {
      // Silently ignore if 'open' command fails
    })
  }

  const shutdown = (): void => {
    console.log('\nShutting down...')
    server.close(() => {
      source.dispose().then(
        () => process.exit(0),
        () => process.exit(1)
      )
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  switch (args.command) {
    case 'version':
      await handleVersion()
      return
    case 'help':
      handleHelp()
      return
    case 'update':
      await handleUpdate()
      return
    case 'logout':
      await handleLogout(args.logoutHost)
      return
    default:
      await handleServe(args)
  }
}

// Only run main() when executed directly, not when imported by tests
const isDirectRun = !process.env['VITEST']

if (isDirectRun) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(message)
    process.exit(1)
  })
}
