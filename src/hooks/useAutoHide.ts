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
