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
        label={"\u2190"}
        onClick={() => dispatch({ type: 'PREV_SLIDE' })}
        ariaLabel="Previous slide (Left arrow key)"
        disabled={isFirst}
        className={styles.arrowLeft}
      />
      <KeycapButton
        label={"\u2192"}
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
