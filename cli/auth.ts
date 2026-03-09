import { readFile, mkdir, open as fsOpen } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'

interface AuthEntry {
  token: string
  user: string
  savedAt: string // ISO date string
}

interface AuthData {
  hosts: Record<string, AuthEntry>
}

const DEFAULT_CONFIG_DIR = join(homedir(), '.config', 'dekk')
const AUTH_FILE = 'auth.json'
const TOKEN_MAX_AGE_DAYS = 90

export function getConfigDir(override?: string): string {
  return override ?? DEFAULT_CONFIG_DIR
}

function authFilePath(configDir: string): string {
  return join(configDir, AUTH_FILE)
}

async function readAuthData(configDir: string): Promise<AuthData> {
  try {
    const raw = await readFile(authFilePath(configDir), 'utf-8')
    const data: unknown = JSON.parse(raw)
    if (
      typeof data !== 'object' ||
      data === null ||
      !('hosts' in data) ||
      typeof (data as AuthData).hosts !== 'object' ||
      (data as AuthData).hosts === null
    ) {
      return { hosts: {} }
    }
    return data as AuthData
  } catch {
    return { hosts: {} }
  }
}

async function writeAuthData(
  configDir: string,
  data: AuthData
): Promise<void> {
  await mkdir(configDir, { recursive: true })
  const filePath = authFilePath(configDir)
  const content = JSON.stringify(data, null, 2)
  // Write with restricted permissions (owner read/write only)
  const fd = await fsOpen(filePath, 'w', 0o600)
  try {
    await fd.writeFile(content, 'utf-8')
    await fd.datasync()
  } finally {
    await fd.close()
  }
}

/**
 * Retrieve a stored token for the given host.
 * Returns null if no token is found or the auth file is missing/corrupted.
 */
export async function getToken(
  host: string,
  configDir?: string
): Promise<string | null> {
  const dir = getConfigDir(configDir)
  const data = await readAuthData(dir)
  const entry = data.hosts[host]
  if (!entry || typeof entry.token !== 'string') {
    return null
  }
  return entry.token
}

/**
 * Save a token for the given host. Creates the config directory and auth file
 * if they do not exist. Merges with existing entries.
 */
export async function saveToken(
  host: string,
  token: string,
  user: string,
  configDir?: string
): Promise<void> {
  const dir = getConfigDir(configDir)
  const data = await readAuthData(dir)
  data.hosts[host] = {
    token,
    user,
    savedAt: new Date().toISOString(),
  }
  await writeAuthData(dir, data)
}

/**
 * Delete a stored token. If host is provided, only that host's entry is removed.
 * If host is omitted, all tokens are removed.
 */
export async function deleteToken(
  host?: string,
  configDir?: string
): Promise<void> {
  const dir = getConfigDir(configDir)
  const data = await readAuthData(dir)

  if (host !== undefined) {
    delete data.hosts[host]
  } else {
    data.hosts = {}
  }

  await writeAuthData(dir, data)
}

/**
 * Check whether a stored token is older than TOKEN_MAX_AGE_DAYS.
 * Returns false if the token does not exist or has no savedAt date.
 */
export async function isTokenOld(
  host: string,
  configDir?: string
): Promise<boolean> {
  const dir = getConfigDir(configDir)
  const data = await readAuthData(dir)
  const entry = data.hosts[host]
  if (!entry || typeof entry.savedAt !== 'string') {
    return false
  }

  const savedAt = new Date(entry.savedAt)
  const now = new Date()
  const ageMs = now.getTime() - savedAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return ageDays > TOKEN_MAX_AGE_DAYS
}

/**
 * Prompt the user to enter a GitHub personal access token via the terminal.
 * Uses readline to read from stdin with echo disabled for security.
 */
export async function promptForToken(host: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  })

  return new Promise<string>((resolve, reject) => {
    rl.question(
      `Enter personal access token for ${host}: `,
      (answer: string) => {
        rl.close()
        const trimmed = answer.trim()
        if (trimmed.length === 0) {
          reject(new Error('Token cannot be empty'))
          return
        }
        resolve(trimmed)
      }
    )
  })
}
