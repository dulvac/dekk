export interface KeyboardActions {
  nextSlide: () => void
  prevSlide: () => void
  firstSlide: () => void
  lastSlide: () => void
  toggleFullscreen: () => void
  toggleOverview: () => void
  toggleEditor: () => void
  escape: () => void
  goToSlide: (index: number) => void
  goHome: () => void
}

export function createKeyboardHandler(actions: KeyboardActions) {
  return function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null
    if (target) {
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      if (target.closest('.cm-editor')) {
        return
      }
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault()
        actions.nextSlide()
        break
      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault()
        actions.prevSlide()
        break
      case 'Home':
        e.preventDefault()
        actions.firstSlide()
        break
      case 'End':
        e.preventDefault()
        actions.lastSlide()
        break
      case 'f':
      case 'F11':
        e.preventDefault()
        actions.toggleFullscreen()
        break
      case 'o':
        e.preventDefault()
        actions.toggleOverview()
        break
      case 'e':
        e.preventDefault()
        actions.toggleEditor()
        break
      case 'h':
        e.preventDefault()
        actions.goHome()
        break
      case 'Escape':
        actions.escape()
        break
      default:
        if (/^[1-9]$/.test(e.key)) {
          e.preventDefault()
          actions.goToSlide(parseInt(e.key, 10) - 1)
        }
        break
    }
  }
}
