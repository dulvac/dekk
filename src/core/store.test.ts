import { describe, it, expect } from 'vitest'
import { slideReducer, initialState } from './store'

describe('slideReducer', () => {
  const threeSlideState = {
    ...initialState,
    rawMarkdown: '# A\n\n---\n\n# B\n\n---\n\n# C',
    slides: [
      { children: [], metadata: {}, rawContent: '# A' },
      { children: [], metadata: {}, rawContent: '# B' },
      { children: [], metadata: {}, rawContent: '# C' },
    ],
    currentIndex: 0,
  }

  it('NEXT_SLIDE increments index', () => {
    const state = slideReducer(threeSlideState, { type: 'NEXT_SLIDE' })
    expect(state.currentIndex).toBe(1)
  })

  it('NEXT_SLIDE does not go past last slide', () => {
    const state = slideReducer(
      { ...threeSlideState, currentIndex: 2 },
      { type: 'NEXT_SLIDE' }
    )
    expect(state.currentIndex).toBe(2)
  })

  it('PREV_SLIDE decrements index', () => {
    const state = slideReducer(
      { ...threeSlideState, currentIndex: 1 },
      { type: 'PREV_SLIDE' }
    )
    expect(state.currentIndex).toBe(0)
  })

  it('PREV_SLIDE does not go below 0', () => {
    const state = slideReducer(threeSlideState, { type: 'PREV_SLIDE' })
    expect(state.currentIndex).toBe(0)
  })

  it('GO_TO_SLIDE jumps to valid index', () => {
    const state = slideReducer(threeSlideState, {
      type: 'GO_TO_SLIDE',
      index: 2,
    })
    expect(state.currentIndex).toBe(2)
  })

  it('GO_TO_SLIDE clamps out-of-range index', () => {
    const state = slideReducer(threeSlideState, {
      type: 'GO_TO_SLIDE',
      index: 99,
    })
    expect(state.currentIndex).toBe(2)
  })

  it('SET_MARKDOWN updates markdown and re-parses slides', () => {
    const state = slideReducer(initialState, {
      type: 'SET_MARKDOWN',
      markdown: '# One\n\n---\n\n# Two',
    })
    expect(state.rawMarkdown).toBe('# One\n\n---\n\n# Two')
    expect(state.slides).toHaveLength(2)
  })

  it('GO_TO_SLIDE clamps negative index to 0', () => {
    const state = slideReducer(threeSlideState, {
      type: 'GO_TO_SLIDE',
      index: -1,
    })
    expect(state.currentIndex).toBe(0)
  })

  it('SET_MARKDOWN with empty string produces no slides', () => {
    const state = slideReducer(threeSlideState, {
      type: 'SET_MARKDOWN',
      markdown: '',
    })
    expect(state.slides).toHaveLength(0)
    expect(state.currentIndex).toBe(0)
  })
})
