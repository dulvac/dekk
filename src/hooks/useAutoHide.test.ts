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
    act(() => {
      result.current.containerProps.onMouseMove()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.visible).toBe(true)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
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
    unmount()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // No errors = timer was cleaned up
  })
})
