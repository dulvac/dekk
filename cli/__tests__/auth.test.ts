// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  getToken,
  saveToken,
  deleteToken,
  isTokenOld,
  promptForToken,
} from '../auth'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dekk-auth-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('getToken', () => {
  it('returns null when no auth file exists', async () => {
    const token = await getToken('github.com', tmpDir)
    expect(token).toBeNull()
  })

  it('returns saved token after saveToken', async () => {
    await saveToken('github.com', 'ghp_abc123', 'testuser', tmpDir)
    const token = await getToken('github.com', tmpDir)
    expect(token).toBe('ghp_abc123')
  })

  it('returns null for unknown host', async () => {
    await saveToken('github.com', 'ghp_abc123', 'testuser', tmpDir)
    const token = await getToken('gitlab.com', tmpDir)
    expect(token).toBeNull()
  })

  it('handles corrupted JSON gracefully', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    await fs.writeFile(authPath, '{not valid json!!!', 'utf-8')
    const token = await getToken('github.com', tmpDir)
    expect(token).toBeNull()
  })
})

describe('saveToken', () => {
  it('creates auth.json with correct structure', async () => {
    await saveToken('github.com', 'ghp_abc123', 'testuser', tmpDir)
    const raw = await fs.readFile(path.join(tmpDir, 'auth.json'), 'utf-8')
    const data = JSON.parse(raw) as {
      hosts: Record<string, { token: string; user: string; savedAt: string }>
    }
    expect(data.hosts).toBeDefined()
    expect(data.hosts['github.com']).toBeDefined()
    expect(data.hosts['github.com'].token).toBe('ghp_abc123')
    expect(data.hosts['github.com'].user).toBe('testuser')
    expect(data.hosts['github.com'].savedAt).toBeTruthy()
    // Verify savedAt is a valid ISO date
    expect(new Date(data.hosts['github.com'].savedAt).toISOString()).toBe(
      data.hosts['github.com'].savedAt
    )
  })

  it('creates config directory if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'nested', 'config')
    await saveToken('github.com', 'ghp_abc123', 'testuser', nestedDir)
    const stat = await fs.stat(nestedDir)
    expect(stat.isDirectory()).toBe(true)
  })

  it('creates auth file with restrictive permissions (0o600)', async () => {
    await saveToken('github.com', 'ghp_abc123', 'testuser', tmpDir)
    const stat = await fs.stat(path.join(tmpDir, 'auth.json'))
    const mode = stat.mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('preserves existing host entries when adding new one', async () => {
    await saveToken('github.com', 'ghp_abc123', 'user1', tmpDir)
    await saveToken('gitlab.com', 'glpat_xyz789', 'user2', tmpDir)
    const tokenGh = await getToken('github.com', tmpDir)
    const tokenGl = await getToken('gitlab.com', tmpDir)
    expect(tokenGh).toBe('ghp_abc123')
    expect(tokenGl).toBe('glpat_xyz789')
  })
})

describe('deleteToken', () => {
  it('removes token for a specific host, keeps others', async () => {
    await saveToken('github.com', 'ghp_abc123', 'user1', tmpDir)
    await saveToken('gitlab.com', 'glpat_xyz789', 'user2', tmpDir)
    await deleteToken('github.com', tmpDir)
    const tokenGh = await getToken('github.com', tmpDir)
    const tokenGl = await getToken('gitlab.com', tmpDir)
    expect(tokenGh).toBeNull()
    expect(tokenGl).toBe('glpat_xyz789')
  })

  it('removes all tokens when no host is specified', async () => {
    await saveToken('github.com', 'ghp_abc123', 'user1', tmpDir)
    await saveToken('gitlab.com', 'glpat_xyz789', 'user2', tmpDir)
    await deleteToken(undefined, tmpDir)
    const tokenGh = await getToken('github.com', tmpDir)
    const tokenGl = await getToken('gitlab.com', tmpDir)
    expect(tokenGh).toBeNull()
    expect(tokenGl).toBeNull()
  })

  it('does not throw when deleting from nonexistent file', async () => {
    await expect(deleteToken('github.com', tmpDir)).resolves.toBeUndefined()
  })
})

describe('isTokenOld', () => {
  it('returns false for a fresh token', async () => {
    await saveToken('github.com', 'ghp_abc123', 'testuser', tmpDir)
    const old = await isTokenOld('github.com', tmpDir)
    expect(old).toBe(false)
  })

  it('returns true for a token older than 90 days', async () => {
    // Manually write a token with an old savedAt date
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 91)
    const data = {
      hosts: {
        'github.com': {
          token: 'ghp_old',
          user: 'testuser',
          savedAt: oldDate.toISOString(),
        },
      },
    }
    await fs.writeFile(
      path.join(tmpDir, 'auth.json'),
      JSON.stringify(data, null, 2),
      { mode: 0o600 }
    )
    const old = await isTokenOld('github.com', tmpDir)
    expect(old).toBe(true)
  })

  it('returns false for unknown host', async () => {
    const old = await isTokenOld('github.com', tmpDir)
    expect(old).toBe(false)
  })
})

describe('promptForToken', () => {
  it('is an exported function', () => {
    expect(typeof promptForToken).toBe('function')
  })
})
