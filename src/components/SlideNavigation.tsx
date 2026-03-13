import styles from '../styles/slides.module.css'

interface SlideNavigationProps {
  currentIndex: number
  totalSlides: number
  visible?: boolean
}

export function SlideNavigation({
  currentIndex,
  totalSlides,
  visible = true,
}: SlideNavigationProps) {
  const progress = totalSlides > 1 ? currentIndex / (totalSlides - 1) : 0
  const fadeClass = visible ? '' : styles.navHidden

  return (
    <>
      <div className={`${styles.slideCounter} ${fadeClass}`}>
        {currentIndex + 1} / {totalSlides}
      </div>
      <div
        className={`${styles.progressBar} ${fadeClass}`}
        role="progressbar"
        aria-label="Slide progress"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalSlides}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  )
}
