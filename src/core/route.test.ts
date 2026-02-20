import { describe, it, expect } from 'vitest'
import { hashToRoute, routeToHash, type Route } from './route'

describe('hashToRoute', () => {
  it('empty hash -> picker', () => {
    expect(hashToRoute('')).toEqual({ view: 'picker' })
  })

  it('#/ -> picker', () => {
    expect(hashToRoute('#/')).toEqual({ view: 'picker' })
  })

  it('#deck/my-talk -> presentation slide 0', () => {
    expect(hashToRoute('#deck/my-talk')).toEqual({
      view: 'presentation', deckId: 'my-talk', slideIndex: 0,
    })
  })

  it('#deck/my-talk/3 -> presentation slide 3', () => {
    expect(hashToRoute('#deck/my-talk/3')).toEqual({
      view: 'presentation', deckId: 'my-talk', slideIndex: 3,
    })
  })

  it('#deck/my-talk/editor -> editor', () => {
    expect(hashToRoute('#deck/my-talk/editor')).toEqual({
      view: 'editor', deckId: 'my-talk',
    })
  })

  it('#deck/my-talk/overview -> overview', () => {
    expect(hashToRoute('#deck/my-talk/overview')).toEqual({
      view: 'overview', deckId: 'my-talk',
    })
  })

  it('NaN slide index -> 0', () => {
    expect(hashToRoute('#deck/my-talk/abc')).toEqual({
      view: 'presentation', deckId: 'my-talk', slideIndex: 0,
    })
  })

  it('deckId over 64 chars -> picker', () => {
    const longId = 'a'.repeat(65)
    expect(hashToRoute(`#deck/${longId}`)).toEqual({ view: 'picker' })
  })

  it('invalid format -> picker', () => {
    expect(hashToRoute('#garbage')).toEqual({ view: 'picker' })
  })
})

describe('routeToHash', () => {
  it('picker -> empty', () => {
    expect(routeToHash({ view: 'picker' })).toBe('')
  })

  it('presentation -> deck/{id}/{n}', () => {
    expect(routeToHash({ view: 'presentation', deckId: 'foo', slideIndex: 2 }))
      .toBe('deck/foo/2')
  })

  it('editor -> deck/{id}/editor', () => {
    expect(routeToHash({ view: 'editor', deckId: 'foo' })).toBe('deck/foo/editor')
  })

  it('overview -> deck/{id}/overview', () => {
    expect(routeToHash({ view: 'overview', deckId: 'foo' })).toBe('deck/foo/overview')
  })
})

describe('round-trip', () => {
  const routes: Route[] = [
    { view: 'picker' },
    { view: 'presentation', deckId: 'test', slideIndex: 0 },
    { view: 'presentation', deckId: 'test', slideIndex: 5 },
    { view: 'editor', deckId: 'test' },
    { view: 'overview', deckId: 'test' },
  ]

  for (const route of routes) {
    it(`round-trips: ${JSON.stringify(route)}`, () => {
      const hash = routeToHash(route)
      const parsed = hashToRoute(hash ? `#${hash}` : '')
      expect(parsed).toEqual(route)
    })
  }
})
