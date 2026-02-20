import { useRef, useEffect, useState, type ReactNode, type CSSProperties } from 'react'
import styles from '../styles/slides.module.css'

const SLIDE_WIDTH = 1920
const SLIDE_HEIGHT = 1080

interface SlideFrameProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function SlideFrame({ children, className, style }: SlideFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      if (!wrapperRef.current) return
      const { clientWidth, clientHeight } = wrapperRef.current
      const scaleX = clientWidth / SLIDE_WIDTH
      const scaleY = clientHeight / SLIDE_HEIGHT
      setScale(Math.min(scaleX, scaleY))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapperRef} className={styles.scaleWrapper}>
      <div
        style={{
          width: SLIDE_WIDTH * scale,
          height: SLIDE_HEIGHT * scale,
          overflow: 'hidden',
        }}
      >
        <div
          className={`${styles.frame} ${className ?? ''}`}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', ...style }}
        >
          <div className={styles.frameContent}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
