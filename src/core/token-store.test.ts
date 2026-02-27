import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, setToken, clearToken, hasToken } from './token-store'

describe('token-store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('returns null when no token stored', () => {
    expect(getToken()).toBeNull()
  })

  it('stores in sessionStorage by default', () => {
    setToken('ghp_test123', 'session')
    expect(sessionStorage.getItem('dekk-github-token')).toBe('ghp_test123')
    expect(localStorage.getItem('dekk-github-token')).toBeNull()
  })

  it('stores in localStorage when opted in', () => {
    setToken('ghp_test123', 'local')
    expect(localStorage.getItem('dekk-github-token')).toBe('ghp_test123')
  })

  it('getToken checks sessionStorage first then localStorage', () => {
    localStorage.setItem('dekk-github-token', 'ghp_local')
    expect(getToken()).toBe('ghp_local')
    sessionStorage.setItem('dekk-github-token', 'ghp_session')
    expect(getToken()).toBe('ghp_session')
  })

  it('clearToken removes from both storages', () => {
    setToken('ghp_test', 'local')
    setToken('ghp_test', 'session')
    clearToken()
    expect(getToken()).toBeNull()
    expect(hasToken()).toBe(false)
  })

  it('hasToken returns true when token exists', () => {
    setToken('ghp_test', 'session')
    expect(hasToken()).toBe(true)
  })
})
