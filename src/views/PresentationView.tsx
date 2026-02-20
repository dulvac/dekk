import { useSlides } from '../core/store'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import styles from '../styles/slides.module.css'

// Validate CSS color value to prevent injection attacks
function isValidCSSColor(color: string | undefined): boolean {
  if (!color) return false

  // Reject dangerous patterns
  const dangerous = /javascript:|url\(|expression\(/i
  if (dangerous.test(color)) return false

  // Accept valid CSS color formats
  const validColor = /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-z]+)$/i
  return validColor.test(color)
}

export function PresentationView() {
  const { slides, currentIndex } = useSlides()

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

  // Guard against out-of-bounds access
  if (!currentSlide) {
    return (
      <div className={styles.presentationView}>
        <SlideFrame>
          <p>No slides loaded. Press E to open the editor.</p>
        </SlideFrame>
      </div>
    )
  }

  // Validate background color before applying
  const bgColor = currentSlide.metadata.bg
  const backgroundColor = isValidCSSColor(bgColor) ? bgColor : undefined

  return (
    <div className={styles.presentationView}>
      <SlideFrame
        className={styles.slideTransition}
        style={{
          backgroundColor,
        }}
      >
        <SlideRenderer slide={currentSlide} />
      </SlideFrame>
      <SlideNavigation
        currentIndex={currentIndex}
        totalSlides={slides.length}
      />
    </div>
  )
}
