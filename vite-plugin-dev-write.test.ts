// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateWritePath } from './vite-plugin-dev-write'

describe('validateWritePath', () => {
  const root = '/project'

  it('accepts valid src path', () => {
    expect(validateWritePath(root, 'src/assets/slides.md')).toBe('/project/src/assets/slides.md')
  })

  it('accepts presentations path', () => {
    expect(validateWritePath(root, 'presentations/my-talk/slides.md'))
      .toBe('/project/presentations/my-talk/slides.md')
  })

  it('rejects .. traversal', () => {
    expect(validateWritePath(root, 'src/../etc/passwd')).toBeNull()
  })

  it('rejects absolute path', () => {
    expect(validateWritePath(root, '/etc/passwd')).toBeNull()
  })

  it('rejects non-.md extension', () => {
    expect(validateWritePath(root, 'src/assets/slides.js')).toBeNull()
  })

  it('rejects paths outside src/ and presentations/', () => {
    expect(validateWritePath(root, 'public/slides.md')).toBeNull()
  })
})
