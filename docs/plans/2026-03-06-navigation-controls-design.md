# Navigation Controls Design

**Date:** 2026-03-06
**Status:** Proposed

## Problem

Navigation in PresentationView is entirely keyboard-driven. There are no clickable controls for slide navigation, view switching, or returning to the deck picker. Users presenting with a mouse/trackpad or on touch devices have no way to interact. The only visible navigation elements are the slide counter (bottom-right) and progress bar (bottom).

## Solution: Auto-hiding Keycap Controls

Add subtle, auto-hiding clickable buttons to PresentationView that mirror every keyboard shortcut. Each button renders as a **keyboard keycap** — visually showing the shortcut key — serving as both a clickable control and a keyboard shortcut hint.

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Always-visible buttons | Simple to implement | Distracting during presentations | Rejected |
| Single toggle button | Clean, one click to reveal | Extra click required to access any control | Rejected |
| **Auto-hide on mouse move** | Professional UX, controls appear when needed | Slightly more complex (timers) | **Selected** |

## Button Inventory

| Button | Key Label | Keyboard Shortcut | Action |
|--------|-----------|-------------------|--------|
| Previous slide | `←` | ArrowLeft | `dispatch({ type: 'PREV_SLIDE' })` |
| Next slide | `→` | ArrowRight | `dispatch({ type: 'NEXT_SLIDE' })` |
| Overview | `O` | O | Navigate to overview view |
| Editor | `E` | E | Navigate to editor view |
| Fullscreen | `F` | F | Toggle fullscreen mode |
| Escape | `Esc` | Escape | Exit fullscreen or return to presentation |
| Deck picker | `H` | H (new shortcut) | Navigate to picker view |

> **Note:** `H` (deck picker) is distinct from the `Home` key (jump to first slide). The button label says "H" and the tooltip says "Deck picker" to avoid confusion.

## Layout

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│  [←]              SLIDE CONTENT            [→]  │
│                                                 │
│                                                 │
│  [H] [O] [E] [F] [Esc]                3 / 12    │
│  ███████████████████████████░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────────────────┘
```

- **Arrow buttons**: Left/right edges, vertically centered, 44×44px
- **Toolbar**: Bottom-left, horizontal row of keycap buttons, positioned above the progress bar
- **Existing elements**: Slide counter (bottom-right) and progress bar (bottom) remain unchanged

## Visual Design: Keycap Buttons

Buttons styled to look like physical keyboard keys with subtle 3D depth:

- **Background**: Semi-transparent dark with backdrop blur — `rgba(50, 45, 43, 0.6)` + `backdrop-filter: blur(8px)`
- **Border**: Subtle muted border with thicker bottom edge for 3D effect — `1px solid rgba(138, 125, 90, 0.25)`, `border-bottom: 2px solid rgba(0, 0, 0, 0.3)`
- **Border radius**: 6px
- **Text**: Muted color (`--mp-muted`), JetBrains Mono font, 13px
- **Shadow**: `0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
- **Hover**: Gold text (`--mp-primary`), gold-tinted border, subtle glow `0 0 8px rgba(228, 197, 108, 0.15)`
- **Active/pressed**: Translate Y 1px, reduce shadow (simulate key press)

### Sizing

- Arrow buttons: 44 × 44px (larger hit targets for easy clicking)
- Toolbar buttons: 36px height, auto width with 12px horizontal padding
- Gap between toolbar buttons: 8px

## Auto-hide Behavior

1. **Hidden by default** — Controls start at `opacity: 0` with `pointer-events: none`. When visible, `pointer-events: auto` is set on the wrapper so hover tracking works across the entire controls area (not just individual buttons)
2. **Show on mouse move** — Any mouse movement shows controls (200ms fade-in)
3. **Auto-hide after 3s** — Timer resets on each mouse move. After 3s of inactivity, controls fade out (400ms)
4. **Stay visible on hover** — Mouse over any control button pauses the hide timer
5. **Cursor auto-hide** — Mouse cursor hides after 3s via `cursor: none` on the container

### Implementation: `useAutoHide` Hook

```typescript
function useAutoHide(): {
  visible: boolean
  containerProps: {
    onMouseMove: () => void
  }
  controlProps: {
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
}
```

- `containerProps` — spread on the PresentationView wrapper
- `controlProps` — spread on the NavigationControls wrapper
- Uses `useRef` for timer IDs, `useState` for visibility

## Component Architecture

### New Components

**`KeycapButton`** — Reusable keycap button. Renders a styled button element with keycap appearance.

```typescript
interface KeycapButtonProps {
  label: string           // Key label displayed on the cap (e.g., "←", "O", "Esc")
  onClick: () => void
  ariaLabel: string       // Accessible description (e.g., "Previous slide")
  disabled?: boolean
  className?: string      // For position-specific styling (e.g., left arrow, right arrow)
}
```

**`NavigationControls`** — Container rendering all keycap buttons in the correct layout positions. Uses `useSlideDispatch()` from context for slide navigation (prev/next), receives only view-navigation callbacks as props.

```typescript
interface NavigationControlsProps {
  visible: boolean
  onOverview: () => void
  onEditor: () => void
  onFullscreen: () => void
  onEscape: () => void
  onHome: () => void
  isFirst: boolean        // Disable prev at first slide
  isLast: boolean         // Disable next at last slide
  controlProps: { onMouseEnter: () => void; onMouseLeave: () => void }
}
```

### New Files

| File | Purpose |
|------|---------|
| `src/components/NavigationControls.tsx` | Layout container for all navigation buttons |
| `src/components/KeycapButton.tsx` | Reusable keycap-styled button |
| `src/hooks/useAutoHide.ts` | Mouse-tracking auto-hide timer hook |
| `src/styles/navigation.module.css` | Keycap styles, layout positioning, auto-hide transitions |

### Modified Files

| File | Change |
|------|--------|
| `src/views/PresentationView.tsx` | Render `NavigationControls`, accept `route`/`setRoute` props, integrate `useAutoHide` |
| `src/App.tsx` | Pass `route`/`setRoute` props to `PresentationView` |
| `src/core/keyboard.ts` | Add `goHome` to `KeyboardActions` interface |
| `src/hooks/useKeyboardNavigation.ts` | Wire `H` key to navigate to picker view |

## Props Flow

```
App.tsx (has route, setRoute, dispatch, state)
  └── PresentationView (receives route, setRoute)
        ├── SlideFrame + SlideRenderer (unchanged)
        ├── SlideNavigation (unchanged)
        └── NavigationControls
              ├── uses useSlideDispatch() directly for PREV/NEXT
              ├── receives view-navigation callbacks as props
              └── KeycapButton × 7
```

## Accessibility

- All buttons have `aria-label` describing the action (e.g., "Previous slide (Left arrow key)")
- All buttons have `title` with the keyboard shortcut hint
- Focus ring uses gold accent color (`--mp-primary`)
- Arrow buttons use native HTML `disabled` attribute at slide boundaries
- Tab order: `←` → `→` → `H` → `O` → `E` → `Esc`

## Edge Cases

- **First slide**: `←` button visually muted and disabled
- **Last slide**: `→` button visually muted and disabled
- **Fullscreen**: Controls work identically (fixed positioning works in fullscreen)
- **Editor/Overview views**: NavigationControls does not render (PresentationView only)
- **No slides loaded**: Controls do not render (empty state fallback)

## Testing Strategy

- **Unit tests**: `KeycapButton` renders with correct label, fires onClick, handles disabled state
- **Unit tests**: `NavigationControls` renders all 6 buttons, passes correct disabled states
- **Unit tests**: `useAutoHide` — visible on mouse move, hides after timeout, pauses on hover
- **Integration tests**: Clicking buttons dispatches correct actions and navigates views
- **E2E tests**: Full flow — mouse move shows controls, click navigates, auto-hide works
- **Visual QA**: Keycap appearance, hover states, disabled states, layout positioning

## What This Does NOT Change

- All existing keyboard shortcuts remain identical
- SlideNavigation (counter + progress bar) is unchanged
- State management, routing, and slide parsing are unchanged
- No new external dependencies
