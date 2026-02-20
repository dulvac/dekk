import { describe, it, expect, vi } from 'vitest'
import { createKeyboardHandler, type KeyboardActions } from './keyboard'

function makeActions(): KeyboardActions {
  return {
    nextSlide: vi.fn(),
    prevSlide: vi.fn(),
    firstSlide: vi.fn(),
    lastSlide: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleOverview: vi.fn(),
    toggleEditor: vi.fn(),
    escape: vi.fn(),
    goToSlide: vi.fn(),
  }
}

function fireKey(key: string, target?: EventTarget | null) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  return event
}

describe('createKeyboardHandler', () => {
  // Next slide bindings
  it('calls nextSlide on ArrowRight', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('ArrowRight'))
    expect(actions.nextSlide).toHaveBeenCalled()
  })

  it('calls nextSlide on Space', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey(' '))
    expect(actions.nextSlide).toHaveBeenCalled()
  })

  it('calls nextSlide on PageDown', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('PageDown'))
    expect(actions.nextSlide).toHaveBeenCalled()
  })

  // Prev slide bindings
  it('calls prevSlide on ArrowLeft', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('ArrowLeft'))
    expect(actions.prevSlide).toHaveBeenCalled()
  })

  it('calls prevSlide on Backspace', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('Backspace'))
    expect(actions.prevSlide).toHaveBeenCalled()
  })

  it('calls prevSlide on PageUp', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('PageUp'))
    expect(actions.prevSlide).toHaveBeenCalled()
  })

  // Navigation
  it('calls firstSlide on Home', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('Home'))
    expect(actions.firstSlide).toHaveBeenCalled()
  })

  it('calls lastSlide on End', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('End'))
    expect(actions.lastSlide).toHaveBeenCalled()
  })

  // Toggles
  it('calls toggleFullscreen on f', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('f'))
    expect(actions.toggleFullscreen).toHaveBeenCalled()
  })

  it('calls toggleFullscreen on F11', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('F11'))
    expect(actions.toggleFullscreen).toHaveBeenCalled()
  })

  it('calls toggleOverview on o', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('o'))
    expect(actions.toggleOverview).toHaveBeenCalled()
  })

  it('calls toggleEditor on e', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('e'))
    expect(actions.toggleEditor).toHaveBeenCalled()
  })

  it('calls escape on Escape', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('Escape'))
    expect(actions.escape).toHaveBeenCalled()
  })

  // Number keys
  it('calls goToSlide for number keys 1-9', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('3'))
    expect(actions.goToSlide).toHaveBeenCalledWith(2)
  })

  it('calls goToSlide(0) for key 1', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('1'))
    expect(actions.goToSlide).toHaveBeenCalledWith(0)
  })

  it('does not call any action for 0 key', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('0'))
    expect(actions.goToSlide).not.toHaveBeenCalled()
  })

  // Input suppression
  it('ignores keys when target is INPUT', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    const input = document.createElement('input')
    handler(fireKey('ArrowRight', input))
    expect(actions.nextSlide).not.toHaveBeenCalled()
  })

  it('ignores keys when target is TEXTAREA', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    const textarea = document.createElement('textarea')
    handler(fireKey('ArrowRight', textarea))
    expect(actions.nextSlide).not.toHaveBeenCalled()
  })

  it('ignores keys when target is contentEditable', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    const div = document.createElement('div')
    div.contentEditable = 'true'
    // jsdom doesn't implement isContentEditable, so mock it
    Object.defineProperty(div, 'isContentEditable', { value: true })

    handler(fireKey('ArrowRight', div))
    expect(actions.nextSlide).not.toHaveBeenCalled()
  })

  it('ignores keys when target is inside .cm-editor', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    const cmEditor = document.createElement('div')
    cmEditor.className = 'cm-editor'
    const inner = document.createElement('div')
    cmEditor.appendChild(inner)
    document.body.appendChild(cmEditor)

    handler(fireKey('ArrowRight', inner))
    expect(actions.nextSlide).not.toHaveBeenCalled()

    document.body.removeChild(cmEditor)
  })
})
