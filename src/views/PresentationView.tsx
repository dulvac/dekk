import { useSlides } from '../core/store'
import type { Route } from '../core/route'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import { NavigationControls } from '../components/NavigationControls'
import { useAutoHide } from '../hooks'
import styles from '../styles/slides.module.css'

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
      <SlideFrame className={styles.slideTransition} style={{ backgroundColor }}>
        <SlideRenderer slide={currentSlide} />
      </SlideFrame>
      <SlideNavigation currentIndex={currentIndex} totalSlides={slides.length} visible={visible} />
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
