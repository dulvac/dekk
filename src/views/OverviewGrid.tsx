import { memo, useCallback, type KeyboardEvent } from 'react'
import { useSlides } from '../core/store'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import styles from '../styles/overview.module.css'

interface OverviewGridProps {
  onSelectSlide: (index: number) => void
}

const MemoizedSlideRenderer = memo(SlideRenderer)

export function OverviewGrid({ onSelectSlide }: OverviewGridProps) {
  const { slides, currentIndex } = useSlides()

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelectSlide(index)
      }
    },
    [onSelectSlide]
  )

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.grid} role="grid" aria-label="Slide overview">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`${styles.thumbnail} ${
              i === currentIndex ? styles.thumbnailActive : ''
            }`}
            role="button"
            tabIndex={0}
            aria-label={`Slide ${i + 1}`}
            onClick={() => onSelectSlide(i)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          >
            <div className={styles.thumbnailInner}>
              <span className={styles.thumbnailNumber}>{i + 1}</span>
              <SlideFrame>
                <MemoizedSlideRenderer slide={slide} />
              </SlideFrame>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
