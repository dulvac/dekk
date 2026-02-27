const STORAGE_KEY = 'dekk-github-token'

export function getToken(): string | null {
  try {
    const sessionToken = sessionStorage.getItem(STORAGE_KEY)
    if (sessionToken) return sessionToken
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string, storage: 'session' | 'local'): void {
  try {
    if (storage === 'session') {
      sessionStorage.setItem(STORAGE_KEY, token)
    } else {
      localStorage.setItem(STORAGE_KEY, token)
    }
  } catch {
    // Storage may be disabled
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage may be disabled
  }
}

export function hasToken(): boolean {
  return getToken() !== null
}
