import { createContext, useContext, type Dispatch } from 'react'
import { parseMarkdown, type SlideData, type DeckMetadata } from './parser'

export interface SlideState {
  rawMarkdown: string
  slides: SlideData[]
  deckMetadata: DeckMetadata
  currentIndex: number
}

export type SlideAction =
  | { type: 'SET_MARKDOWN'; markdown: string }
  | { type: 'NEXT_SLIDE' }
  | { type: 'PREV_SLIDE' }
  | { type: 'GO_TO_SLIDE'; index: number }

export const initialState: SlideState = {
  rawMarkdown: '',
  slides: [],
  deckMetadata: {},
  currentIndex: 0,
}

export function slideReducer(
  state: SlideState,
  action: SlideAction
): SlideState {
  switch (action.type) {
    case 'SET_MARKDOWN': {
      const { slides, deckMetadata } = parseMarkdown(action.markdown)
      const clampedIndex = Math.min(
        state.currentIndex,
        Math.max(0, slides.length - 1)
      )
      return {
        rawMarkdown: action.markdown,
        slides,
        deckMetadata,
        currentIndex: clampedIndex,
      }
    }
    case 'NEXT_SLIDE':
      return {
        ...state,
        currentIndex: Math.min(
          state.currentIndex + 1,
          state.slides.length - 1
        ),
      }
    case 'PREV_SLIDE':
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
      }
    case 'GO_TO_SLIDE': {
      const clamped = Math.max(
        0,
        Math.min(action.index, state.slides.length - 1)
      )
      return { ...state, currentIndex: clamped }
    }
    default:
      return state
  }
}

export const SlideContext = createContext<SlideState>(initialState)
export const SlideDispatchContext = createContext<Dispatch<SlideAction>>(
  () => {
    throw new Error('useSlideDispatch must be used within a SlideDispatchContext.Provider')
  }
)

export function useSlides() {
  return useContext(SlideContext)
}

export function useSlideDispatch() {
  return useContext(SlideDispatchContext)
}
