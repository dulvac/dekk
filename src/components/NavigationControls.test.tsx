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
  return { ...render(
    <SlideDispatchContext.Provider value={dispatch}>
      {ui}
    </SlideDispatchContext.Provider>
  ), dispatch }
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
    expect(screen.getByRole('button', { name: /^fullscreen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^exit/i })).toBeInTheDocument()
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
    const { container } = renderWithDispatch(<NavigationControls {...defaultProps} visible={false} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('hidden')
  })

  it('does not apply hidden class when visible', () => {
    const { container } = renderWithDispatch(<NavigationControls {...defaultProps} visible />)
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
    await userEvent.click(screen.getByRole('button', { name: /^fullscreen/i }))
    expect(onFullscreen).toHaveBeenCalledOnce()
  })

  it('calls onEscape when escape button clicked', async () => {
    const onEscape = vi.fn()
    renderWithDispatch(<NavigationControls {...defaultProps} onEscape={onEscape} />)
    await userEvent.click(screen.getByRole('button', { name: /^exit/i }))
    expect(onEscape).toHaveBeenCalledOnce()
  })
})
