# Navigation Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auto-hiding, keycap-styled clickable navigation buttons to PresentationView that mirror all keyboard shortcuts.

**Architecture:** A new `NavigationControls` component renders as a fixed overlay inside PresentationView, containing `KeycapButton` sub-components for each action. `NavigationControls` uses `useSlideDispatch()` from context for slide navigation (prev/next) to avoid prop threading. A `useAutoHide` hook tracks mouse movement and hides controls after 3 seconds of inactivity. The `H` key is added as a new keyboard shortcut for navigating to the deck picker.

**Tech Stack:** React 19 + TypeScript, CSS Modules, Vitest + @testing-library/react, Playwright E2E

**Design doc:** `docs/plans/2026-03-06-navigation-controls-design.md`

**Review notes:** Plan incorporates fixes from Ada's architecture review — timer cleanup on unmount, proper type narrowing (no `as` casts), native `disabled` attribute, `pointer-events` toggle for hover tracking, fullscreen button added, Playwright assertion polling instead of hardcoded waits.

---

### Task 1: Add `goHome` to keyboard handler

**Files:**
- Modify: `src/core/keyboard.ts:1-11` (KeyboardActions interface)
- Modify: `src/core/keyboard.ts:29-72` (switch statement)
- Test: `src/core/keyboard.test.ts`

**Step 1: Write failing tests**

Add to `src/core/keyboard.test.ts` before the closing `})`:

```typescript
it('calls goHome on h', () => {
  const actions = makeActions()
  const handler = createKeyboardHandler(actions)
  handler(fireKey('h'))
  expect(actions.goHome).toHaveBeenCalled()
})
```

Also update `makeActions()` to include `goHome: vi.fn()`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/keyboard.test.ts`
Expected: FAIL — `goHome` not in `KeyboardActions`

**Step 3: Implement**

In `src/core/keyboard.ts`:

1. Add `goHome: () => void` to the `KeyboardActions` interface (after `goToSlide`).
2. Add a new case in the switch statement (before the `default`):
   ```typescript
   case 'h':
     e.preventDefault()
     actions.goHome()
     break
   ```

**Step 4: Run tests**

Run: `npx vitest run src/core/keyboard.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/core/keyboard.ts src/core/keyboard.test.ts
git commit -m "feat(keyboard): add goHome action bound to H key"
```

---

### Task 2: Wire `goHome` in `useKeyboardNavigation`

**Files:**
- Modify: `src/hooks/useKeyboardNavigation.ts:24-73` (createKeyboardHandler call)
- Test: `src/hooks/useKeyboardNavigation.test.ts`

**Step 1: Write failing tests**

Add to `src/hooks/useKeyboardNavigation.test.ts` before the closing `})`:

```typescript
it('navigates to picker on h key', () => {
  const route: Route = { view: 'presentation', deckId: 'test', slideIndex: 0 }
  renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

  fireKey('h')

  expect(setRoute).toHaveBeenCalledWith({ view: 'picker' })
})

it('navigates to picker from overview on h key', () => {
  const route: Route = { view: 'overview', deckId: 'test' }
  renderHook(() => useKeyboardNavigation(route, 5, dispatch, setRoute))

  fireKey('h')

  expect(setRoute).toHaveBeenCalledWith({ view: 'picker' })
})

it('does not navigate home from picker view on h key', () => {
  const route: Route = { view: 'picker' }
  renderHook(() => useKeyboardNavigation(route, 0, dispatch, setRoute))

  fireKey('h')

  expect(setRoute).not.toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useKeyboardNavigation.test.ts`
Expected: FAIL — `goHome` property missing from actions object

**Step 3: Implement**

In `src/hooks/useKeyboardNavigation.ts`, add `goHome` to the `createKeyboardHandler` call inside the `useEffect`:

```typescript
goHome: () => {
  if (route.view === 'picker') return
  setRoute({ view: 'picker' })
},
```

**Step 4: Run tests**

Run: `npx vitest run src/hooks/useKeyboardNavigation.test.ts`
Expected: ALL PASS

**Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: ALL PASS (existing tests should not break since `goHome` is additive)

**Step 6: Commit**

```bash
git add src/hooks/useKeyboardNavigation.ts src/hooks/useKeyboardNavigation.test.ts
git commit -m "feat(keyboard): wire H key to navigate home via useKeyboardNavigation"
```

---

### Task 3: Create `useAutoHide` hook

**Files:**
- Create: `src/hooks/useAutoHide.ts`
- Create: `src/hooks/useAutoHide.test.ts`

**Step 1: Write failing tests**

Create `src/hooks/useAutoHide.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoHide } from './useAutoHide'

describe('useAutoHide', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts hidden', () => {
    const { result } = renderHook(() => useAutoHide())
    expect(result.current.visible).toBe(false)
  })

  it('becomes visible on mouse move', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      result.current.containerProps.onMouseMove()
    })

    expect(result.current.visible).toBe(true)
  })

  it('hides after 3 seconds', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      result.current.containerProps.onMouseMove()
    })
    expect(result.current.visible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.visible).toBe(false)
  })

  it('resets timer on each mouse move', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      result.current.containerProps.onMouseMove()
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.visible).toBe(true)

    // Move again — should reset the timer
    act(() => {
      result.current.containerProps.onMouseMove()
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    // Still visible because timer was reset
    expect(result.current.visible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // Now hidden (3s after last move)
    expect(result.current.visible).toBe(false)
  })

  it('stays visible while hovering controls', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      result.current.containerProps.onMouseMove()
    })
    act(() => {
      result.current.controlProps.onMouseEnter()
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // Still visible because mouse is over controls
    expect(result.current.visible).toBe(true)
  })

  it('starts hide timer after leaving controls', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => {
      result.current.containerProps.onMouseMove()
    })
    act(() => {
      result.current.controlProps.onMouseEnter()
    })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.visible).toBe(true)

    act(() => {
      result.current.controlProps.onMouseLeave()
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.visible).toBe(false)
  })

  it('clears timer on unmount', () => {
    const { result, unmount } = renderHook(() => useAutoHide())

    act(() => {
      result.current.containerProps.onMouseMove()
    })
    expect(result.current.visible).toBe(true)

    // Unmount while timer is pending — should not throw or warn
    unmount()

    // Advancing timers after unmount should be safe (no state update on unmounted)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useAutoHide.test.ts`
Expected: FAIL — module not found

**Step 3: Implement**

Create `src/hooks/useAutoHide.ts`:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react'

const HIDE_TIMEOUT = 3000

export function useAutoHide() {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveringRef = useRef(false)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!hoveringRef.current) {
        setVisible(false)
      }
    }, HIDE_TIMEOUT)
  }, [])

  const onMouseMove = useCallback(() => {
    setVisible(true)
    startTimer()
  }, [startTimer])

  const onMouseEnter = useCallback(() => {
    hoveringRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const onMouseLeave = useCallback(() => {
    hoveringRef.current = false
    startTimer()
  }, [startTimer])

  return {
    visible,
    containerProps: { onMouseMove },
    controlProps: { onMouseEnter, onMouseLeave },
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/hooks/useAutoHide.test.ts`
Expected: ALL PASS

**Step 5: Export from hooks barrel**

Add to `src/hooks/index.ts`:
```typescript
export { useAutoHide } from './useAutoHide'
```

**Step 6: Commit**

```bash
git add src/hooks/useAutoHide.ts src/hooks/useAutoHide.test.ts src/hooks/index.ts
git commit -m "feat(hooks): add useAutoHide hook for mouse-tracking auto-hide"
```

---

### Task 4: Create `KeycapButton` component

**Files:**
- Create: `src/components/KeycapButton.tsx`
- Create: `src/components/KeycapButton.test.tsx`
- Create: `src/styles/navigation.module.css` (partial — keycap styles only)

**Step 1: Write failing tests**

Create `src/components/KeycapButton.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeycapButton } from './KeycapButton'

describe('KeycapButton', () => {
  it('renders the key label', () => {
    render(<KeycapButton label="O" onClick={() => {}} ariaLabel="Overview" />)
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveTextContent('O')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<KeycapButton label="E" onClick={onClick} ariaLabel="Editor" />)

    await userEvent.click(screen.getByRole('button', { name: 'Editor' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<KeycapButton label="←" onClick={onClick} ariaLabel="Previous slide" disabled />)

    const btn = screen.getByRole('button', { name: 'Previous slide' })
    await userEvent.click(btn)

    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets native disabled attribute when disabled', () => {
    render(<KeycapButton label="←" onClick={() => {}} ariaLabel="Previous slide" disabled />)
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<KeycapButton label="→" onClick={() => {}} ariaLabel="Next slide" className="custom" />)
    expect(screen.getByRole('button', { name: 'Next slide' }).className).toContain('custom')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/KeycapButton.test.tsx`
Expected: FAIL — module not found

**Step 3: Create CSS Module**

Create `src/styles/navigation.module.css`:

```css
/* Keycap button base */

.keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  background: rgba(50, 45, 43, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(138, 125, 90, 0.25);
  border-bottom: 2px solid rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  color: var(--mp-muted);
  font-family: var(--mp-font-mono);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition:
    color var(--mp-transition-duration) var(--mp-transition-ease),
    border-color var(--mp-transition-duration) var(--mp-transition-ease),
    box-shadow var(--mp-transition-duration) var(--mp-transition-ease),
    transform 100ms var(--mp-transition-ease);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.keycap:hover:not(:disabled) {
  color: var(--mp-primary);
  border-color: rgba(228, 197, 108, 0.4);
  box-shadow:
    0 0 8px rgba(228, 197, 108, 0.15),
    0 1px 3px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.keycap:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow:
    0 0 4px rgba(228, 197, 108, 0.1),
    inset 0 1px 2px rgba(0, 0, 0, 0.1);
  border-bottom-width: 1px;
}

.keycap:focus-visible {
  outline: 2px solid var(--mp-primary);
  outline-offset: 2px;
}

.keycap:disabled {
  opacity: 0.3;
  cursor: default;
}
```

**Step 4: Implement component**

Create `src/components/KeycapButton.tsx`:

```typescript
import styles from '../styles/navigation.module.css'

interface KeycapButtonProps {
  label: string
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}

export function KeycapButton({
  label,
  onClick,
  ariaLabel,
  disabled = false,
  className,
}: KeycapButtonProps) {
  return (
    <button
      className={`${styles.keycap} ${className ?? ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {label}
    </button>
  )
}
```

**Step 5: Run tests**

Run: `npx vitest run src/components/KeycapButton.test.tsx`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/KeycapButton.tsx src/components/KeycapButton.test.tsx src/styles/navigation.module.css
git commit -m "feat(components): add KeycapButton with keycap styling"
```

---

### Task 5: Create `NavigationControls` component

**Files:**
- Create: `src/components/NavigationControls.tsx`
- Create: `src/components/NavigationControls.test.tsx`
- Modify: `src/styles/navigation.module.css` (add layout styles)

**Step 1: Write failing tests**

Create `src/components/NavigationControls.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavigationControls } from './NavigationControls'
import { SlideDispatchContext } from '../core/store'
import type { Dispatch } from 'react'
import type { SlideAction } from '../core/store'

function renderWithDispatch(
  ui: React.ReactElement,
  dispatch: Dispatch<SlideAction> = vi.fn()
) {
  return render(
    <SlideDispatchContext.Provider value={dispatch}>
      {ui}
    </SlideDispatchContext.Provider>
  )
}

const defaultProps = {
  visible: true,
  onOverview: vi.fn(),
  onEditor: vi.fn(),
  onFullscreen: vi.fn(),
  onEscape: vi.fn(),
  onHome: vi.fn(),
  isFirst: false,
  isLast: false,
  controlProps: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn() },
}

describe('NavigationControls', () => {
  it('renders all 7 buttons', () => {
    renderWithDispatch(<NavigationControls {...defaultProps} />)

    expect(screen.getByRole('button', { name: /previous slide/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next slide/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editor/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /deck picker/i })).toBeInTheDocument()
  })

  it('dispatches PREV_SLIDE when left arrow clicked', async () => {
    const dispatch = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} />, dispatch)

    await userEvent.click(screen.getByRole('button', { name: /previous slide/i }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'PREV_SLIDE' })
  })

  it('dispatches NEXT_SLIDE when right arrow clicked', async () => {
    const dispatch = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} />, dispatch)

    await userEvent.click(screen.getByRole('button', { name: /next slide/i }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'NEXT_SLIDE' })
  })

  it('disables prev button on first slide', () => {
    renderWithDispatch(<NavigationControls {...defaultProps} isFirst />)

    expect(screen.getByRole('button', { name: /previous slide/i })).toBeDisabled()
  })

  it('disables next button on last slide', () => {
    renderWithDispatch(<NavigationControls {...defaultProps} isLast />)

    expect(screen.getByRole('button', { name: /next slide/i })).toBeDisabled()
  })

  it('applies hidden class when not visible', () => {
    const { container } = renderWithDispatch(
      <NavigationControls {...defaultProps} visible={false} />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('hidden')
  })

  it('does not apply hidden class when visible', () => {
    const { container } = renderWithDispatch(
      <NavigationControls {...defaultProps} visible />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).not.toContain('hidden')
  })

  it('calls onHome when deck picker button clicked', async () => {
    const onHome = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} onHome={onHome} />)

    await userEvent.click(screen.getByRole('button', { name: /deck picker/i }))

    expect(onHome).toHaveBeenCalledOnce()
  })

  it('calls onOverview when overview button clicked', async () => {
    const onOverview = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} onOverview={onOverview} />)

    await userEvent.click(screen.getByRole('button', { name: /overview/i }))

    expect(onOverview).toHaveBeenCalledOnce()
  })

  it('calls onEditor when editor button clicked', async () => {
    const onEditor = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} onEditor={onEditor} />)

    await userEvent.click(screen.getByRole('button', { name: /editor/i }))

    expect(onEditor).toHaveBeenCalledOnce()
  })

  it('calls onFullscreen when fullscreen button clicked', async () => {
    const onFullscreen = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} onFullscreen={onFullscreen} />)

    await userEvent.click(screen.getByRole('button', { name: /fullscreen/i }))

    expect(onFullscreen).toHaveBeenCalledOnce()
  })

  it('calls onEscape when escape button clicked', async () => {
    const onEscape = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} onEscape={onEscape} />)

    await userEvent.click(screen.getByRole('button', { name: /exit/i }))

    expect(onEscape).toHaveBeenCalledOnce()
  })

  it('spreads controlProps on wrapper for auto-hide hover tracking', () => {
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()
    const { container } = renderWithDispatch(
      <NavigationControls
        {...defaultProps}
        controlProps={{ onMouseEnter, onMouseLeave }}
      />
    )

    const wrapper = container.firstChild as HTMLElement
    wrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    wrapper.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    expect(onMouseEnter).toHaveBeenCalled()
    expect(onMouseLeave).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/NavigationControls.test.tsx`
Expected: FAIL — module not found

**Step 3: Add layout styles to CSS Module**

Append to `src/styles/navigation.module.css`:

```css
/* NavigationControls layout */

.controls {
  position: fixed;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  transition: opacity 200ms var(--mp-transition-ease);
}

.controls.visible {
  pointer-events: auto;
}

.controls.hidden {
  opacity: 0;
  pointer-events: none;
}

/* Arrow buttons — vertically centered on edges */

.arrowLeft,
.arrowRight {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  min-width: 44px;
  height: 44px;
  font-size: 18px;
}

.arrowLeft {
  left: 16px;
}

.arrowRight {
  right: 16px;
}

/* Bottom toolbar */

.toolbar {
  position: absolute;
  bottom: 20px;
  left: 24px;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}
```

**Step 4: Implement component**

Create `src/components/NavigationControls.tsx`:

```typescript
import { useSlideDispatch } from '../core/store'
import { KeycapButton } from './KeycapButton'
import styles from '../styles/navigation.module.css'

interface NavigationControlsProps {
  visible: boolean
  onOverview: () => void
  onEditor: () => void
  onFullscreen: () => void
  onEscape: () => void
  onHome: () => void
  isFirst: boolean
  isLast: boolean
  controlProps: {
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
}

export function NavigationControls({
  visible,
  onOverview,
  onEditor,
  onFullscreen,
  onEscape,
  onHome,
  isFirst,
  isLast,
  controlProps,
}: NavigationControlsProps) {
  const dispatch = useSlideDispatch()

  return (
    <div
      className={`${styles.controls} ${visible ? styles.visible : styles.hidden}`}
      onMouseEnter={controlProps.onMouseEnter}
      onMouseLeave={controlProps.onMouseLeave}
    >
      <KeycapButton
        label="←"
        onClick={() => dispatch({ type: 'PREV_SLIDE' })}
        ariaLabel="Previous slide (Left arrow key)"
        disabled={isFirst}
        className={styles.arrowLeft}
      />
      <KeycapButton
        label="→"
        onClick={() => dispatch({ type: 'NEXT_SLIDE' })}
        ariaLabel="Next slide (Right arrow key)"
        disabled={isLast}
        className={styles.arrowRight}
      />
      <div className={styles.toolbar}>
        <KeycapButton label="H" onClick={onHome} ariaLabel="Deck picker (H key)" />
        <KeycapButton label="O" onClick={onOverview} ariaLabel="Overview (O key)" />
        <KeycapButton label="E" onClick={onEditor} ariaLabel="Editor (E key)" />
        <KeycapButton label="F" onClick={onFullscreen} ariaLabel="Fullscreen (F key)" />
        <KeycapButton label="Esc" onClick={onEscape} ariaLabel="Exit fullscreen or view (Escape key)" />
      </div>
    </div>
  )
}
```

**Step 5: Run tests**

Run: `npx vitest run src/components/NavigationControls.test.tsx`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/NavigationControls.tsx src/components/NavigationControls.test.tsx src/styles/navigation.module.css
git commit -m "feat(components): add NavigationControls with keycap toolbar layout"
```

---

### Task 6: Wire `NavigationControls` into PresentationView

**Files:**
- Modify: `src/views/PresentationView.tsx`
- Modify: `src/App.tsx:54` (pass props to PresentationView)
- Modify: `src/views/PresentationView.test.tsx`

**Step 1: Update existing tests to pass required props**

In `src/views/PresentationView.test.tsx`:

1. Add `vi` to the vitest import: `import { describe, it, expect, vi } from 'vitest'`
2. Update every `<PresentationView />` to `<PresentationView route={{ view: 'presentation', deckId: 'test', slideIndex: 0 }} setRoute={() => {}} />`. There are 4 instances at lines 31, 52, 76, and 100.

**Step 2: Add new tests**

Add to `src/views/PresentationView.test.tsx` before the closing `})`:

```typescript
it('renders navigation control buttons when slides exist', () => {
  const state: SlideState = {
    rawMarkdown: '# Slide 1\n---\n# Slide 2',
    slides: [
      { metadata: {}, rawContent: '# Slide 1' },
      { metadata: {}, rawContent: '# Slide 2' },
    ],
    deckMetadata: {},
    currentIndex: 0,
    currentDeck: 'test',
  }

  renderWithContext(
    <PresentationView
      route={{ view: 'presentation', deckId: 'test', slideIndex: 0 }}
      setRoute={() => {}}
    />,
    state
  )

  // Navigation buttons should exist in the DOM (hidden by default via opacity)
  expect(screen.getByRole('button', { name: /previous slide/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /next slide/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /editor/i })).toBeInTheDocument()
})

it('does not render navigation controls when no slides', () => {
  const state: SlideState = {
    rawMarkdown: '',
    slides: [],
    deckMetadata: {},
    currentIndex: 0,
    currentDeck: null,
  }

  renderWithContext(
    <PresentationView
      route={{ view: 'presentation', deckId: 'test', slideIndex: 0 }}
      setRoute={() => {}}
    />,
    state
  )

  expect(screen.queryByRole('button', { name: /previous slide/i })).not.toBeInTheDocument()
})
```

**Step 3: Run test to verify failures**

Run: `npx vitest run src/views/PresentationView.test.tsx`
Expected: FAIL — PresentationView doesn't accept props yet

**Step 4: Implement**

Update `src/views/PresentationView.tsx`:

```typescript
import { useSlides, useSlideDispatch } from '../core/store'
import type { Route } from '../core/route'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import { NavigationControls } from '../components/NavigationControls'
import { useAutoHide } from '../hooks'
import styles from '../styles/slides.module.css'

// Validate CSS color value to prevent injection attacks
function isValidCSSColor(color: string | undefined): boolean {
  if (!color) return false
  const dangerous = /javascript:|url\(|expression\(/i
  if (dangerous.test(color)) return false
  const validColor = /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i
  return validColor.test(color)
}

interface PresentationViewProps {
  route: Route
  setRoute: (route: Route) => void
}

export function PresentationView({ route, setRoute }: PresentationViewProps) {
  const { slides, currentIndex } = useSlides()
  const dispatch = useSlideDispatch()
  const { visible, containerProps, controlProps } = useAutoHide()

  if (slides.length === 0) {
    return (
      <div className={styles.presentationView}>
        <SlideFrame>
          <p>No slides loaded. Press E to open the editor.</p>
        </SlideFrame>
      </div>
    )
  }

  const currentSlide = slides[currentIndex]

  if (!currentSlide) {
    return (
      <div className={styles.presentationView}>
        <SlideFrame>
          <p>No slides loaded. Press E to open the editor.</p>
        </SlideFrame>
      </div>
    )
  }

  const bgColor = currentSlide.metadata.bg
  const backgroundColor = isValidCSSColor(bgColor) ? bgColor : undefined

  return (
    <div
      className={`${styles.presentationView} ${visible ? '' : styles.cursorHidden}`}
      {...containerProps}
    >
      <SlideFrame
        className={styles.slideTransition}
        style={{ backgroundColor }}
      >
        <SlideRenderer slide={currentSlide} />
      </SlideFrame>
      <SlideNavigation
        currentIndex={currentIndex}
        totalSlides={slides.length}
      />
      <NavigationControls
        visible={visible}
        onOverview={() => {
          if ('deckId' in route) {
            setRoute({ view: 'overview', deckId: route.deckId })
          }
        }}
        onEditor={() => {
          if ('deckId' in route) {
            setRoute({ view: 'editor', deckId: route.deckId })
          }
        }}
        onFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
          } else {
            document.exitFullscreen()
          }
        }}
        onEscape={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen()
          }
        }}
        onHome={() => setRoute({ view: 'picker' })}
        isFirst={currentIndex === 0}
        isLast={currentIndex === slides.length - 1}
        controlProps={controlProps}
      />
    </div>
  )
}
```

Update `src/App.tsx` line 54:

```typescript
{route.view === 'presentation' && <PresentationView route={route} setRoute={setRoute} />}
```

**Step 5: Run tests**

Run: `npx vitest run src/views/PresentationView.test.tsx`
Expected: ALL PASS

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS. If `App.test.tsx` or `integration.test.tsx` fail because they render `PresentationView` directly (unlikely — they render `App` which handles routing), fix those too.

**Step 7: Commit**

```bash
git add src/views/PresentationView.tsx src/views/PresentationView.test.tsx src/App.tsx
git commit -m "feat(presentation): integrate NavigationControls with auto-hide"
```

---

### Task 7: Add cursor auto-hide CSS

**Files:**
- Modify: `src/styles/navigation.module.css` (add cursorHidden class)

**Step 1: Add CSS**

Add to `src/styles/navigation.module.css`:

```css
/* Cursor auto-hide — applied to presentation container when controls are hidden */

.cursorHidden {
  cursor: none;
}
```

Note: This class is imported from `navigation.module.css` in PresentationView (not `slides.module.css`) since it's part of the navigation controls feature.

Actually — PresentationView currently imports `styles from '../styles/slides.module.css'`. To avoid adding a second CSS Module import, add the `cursorHidden` class to `src/styles/slides.module.css` instead (after the `.presentationView` rule):

```css
.cursorHidden {
  cursor: none;
}
```

**Step 2: Verify manually**

Run: `npm run dev`
Navigate to a presentation. Move the mouse — controls and cursor should appear. Stop moving — after 3 seconds both controls and cursor should hide.

**Step 3: Commit**

```bash
git add src/styles/slides.module.css
git commit -m "feat(presentation): auto-hide cursor when navigation controls are hidden"
```

---

### Task 8: E2E tests for navigation controls

**Files:**
- Modify: `e2e/app.spec.ts`

**Step 1: Write E2E tests**

Append to `e2e/app.spec.ts`:

```typescript
test.describe('Navigation Controls', () => {
  test('controls appear on mouse move and disappear after timeout', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    // Controls should be hidden initially
    const prevBtn = page.getByRole('button', { name: /previous slide/i })
    await expect(prevBtn).toBeHidden()

    // Move mouse to trigger controls
    await page.mouse.move(400, 300)
    await expect(prevBtn).toBeVisible()

    // Wait for auto-hide — use polling assertion instead of hardcoded wait
    await expect(prevBtn).toBeHidden({ timeout: 5000 })
  })

  test('clicking next arrow advances slide', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible()

    // Show controls
    await page.mouse.move(400, 300)
    const nextBtn = page.getByRole('button', { name: /next slide/i })
    await expect(nextBtn).toBeVisible()

    await nextBtn.click()
    await expect(page.getByText(/2 \/ \d+/)).toBeVisible()
  })

  test('clicking prev arrow goes back', async ({ page }) => {
    await page.goto('./#deck/default/1')
    await expect(page.getByText(/2 \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    const prevBtn = page.getByRole('button', { name: /previous slide/i })
    await prevBtn.click()
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible()
  })

  test('clicking O button switches to overview', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    await page.getByRole('button', { name: /overview/i }).click()
    await expect(page).toHaveURL(/#deck\/default\/overview/)
  })

  test('clicking E button switches to editor', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    await page.getByRole('button', { name: /editor/i }).click()
    await expect(page).toHaveURL(/#deck\/default\/editor/)
  })

  test('clicking H button goes to picker', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.mouse.move(400, 300)
    await page.getByRole('button', { name: /deck picker/i }).click()
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()
  })

  test('H key navigates to picker', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

    await page.keyboard.press('h')
    await expect(page.getByRole('heading', { name: 'dekk' })).toBeVisible()
  })

  test('prev button disabled on first slide', async ({ page }) => {
    await page.goto('./#deck/default/0')
    await page.mouse.move(400, 300)

    const prevBtn = page.getByRole('button', { name: /previous slide/i })
    await expect(prevBtn).toBeDisabled()
  })
})
```

**Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: ALL PASS

If any test fails, debug and fix the implementation. Common issues:
- Hidden state: Playwright considers elements with `opacity: 0` as hidden when they also have `pointer-events: none`
- Selectors: verify `aria-label` strings match exactly

**Step 3: Commit**

```bash
git add e2e/app.spec.ts
git commit -m "test(e2e): add navigation controls E2E tests"
```

---

### Task 9: Visual QA and polish

**Files:**
- Possibly adjust: `src/styles/navigation.module.css` (spacing, sizing, colors)

**Step 1: Visual inspection**

Run: `npm run dev`

Check the following:
- [ ] Keycap buttons have the correct 3D appearance (lighter top, darker bottom border)
- [ ] Hover shows gold accent on text and border
- [ ] Active/pressed state shows downward movement
- [ ] Left/right arrows are vertically centered on their respective edges
- [ ] Toolbar is at bottom-left, above the progress bar, not overlapping the slide counter
- [ ] Disabled state (first/last slide) shows reduced opacity
- [ ] Auto-hide works: move mouse → controls appear, wait 3s → controls fade out
- [ ] Cursor hides when controls hide
- [ ] Controls stay visible when hovering over them
- [ ] Controls stay visible when hovering anywhere in the controls area (not just on buttons)
- [ ] Buttons work in fullscreen mode
- [ ] Controls don't appear in editor or overview views
- [ ] Fullscreen button toggles fullscreen correctly

**Step 2: Adjust styling if needed**

Common adjustments:
- If toolbar overlaps progress bar, increase `bottom` offset
- If arrow buttons overlap slide content, adjust left/right offsets
- If backdrop blur is too aggressive, reduce blur radius
- If buttons are too prominent, reduce background opacity

**Step 3: Run full test suite**

Run: `npx vitest run && npx playwright test`
Expected: ALL PASS

**Step 4: Commit any polish changes**

```bash
git add src/styles/navigation.module.css
git commit -m "style(navigation): polish keycap button appearance and layout"
```

---

### Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|---------------|
| 1 | Add `goHome` to keyboard handler | — | `keyboard.ts`, `keyboard.test.ts` |
| 2 | Wire `goHome` in `useKeyboardNavigation` | — | `useKeyboardNavigation.ts`, `useKeyboardNavigation.test.ts` |
| 3 | Create `useAutoHide` hook | `useAutoHide.ts`, `useAutoHide.test.ts` | `hooks/index.ts` |
| 4 | Create `KeycapButton` component | `KeycapButton.tsx`, `KeycapButton.test.tsx`, `navigation.module.css` | — |
| 5 | Create `NavigationControls` component | `NavigationControls.tsx`, `NavigationControls.test.tsx` | `navigation.module.css` |
| 6 | Wire into PresentationView + App | — | `PresentationView.tsx`, `PresentationView.test.tsx`, `App.tsx` |
| 7 | Add cursor auto-hide CSS | — | `slides.module.css` |
| 8 | E2E tests | — | `e2e/app.spec.ts` |
| 9 | Visual QA and polish | — | `navigation.module.css` (if needed) |

**New test count:** ~28 unit tests + ~8 E2E tests

### Review fixes incorporated

| Finding | Fix |
|---------|-----|
| H-1: `H` key vs `Home` confusion | Label changed to "Deck picker", not "Home" |
| H-2: Unsafe `as` cast | Proper narrowing with `'deckId' in route` |
| H-3: Timer leak on unmount | Added cleanup `useEffect` + test |
| M-1: Too many callback props | `NavigationControls` uses `useSlideDispatch()` from context |
| M-2: `pointer-events: none` breaks hover | Toggle `pointer-events: auto` when visible via `.visible` class |
| M-3: `disabled` not native | Uses native HTML `disabled` attribute |
| M-4: Configurable timeout (YAGNI) | Hardcoded `HIDE_TIMEOUT = 3000` constant |
| M-5: Flaky `waitForTimeout` in E2E | Uses `toBeHidden({ timeout: 5000 })` polling assertion |
| L-3: Missing fullscreen button | Added `F` button to toolbar |
