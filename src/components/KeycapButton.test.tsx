import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeycapButton } from './KeycapButton'

describe('KeycapButton', () => {
  it('renders the key label', () => {
    render(<KeycapButton label="O" onClick={() => {}} ariaLabel="Overview" />)
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveTextContent('O')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<KeycapButton label="E" onClick={onClick} ariaLabel="Editor" />)
    await userEvent.click(screen.getByRole('button', { name: 'Editor' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<KeycapButton label="←" onClick={onClick} ariaLabel="Previous slide" disabled />)
    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets native disabled attribute when disabled', () => {
    render(<KeycapButton label="←" onClick={() => {}} ariaLabel="Previous slide" disabled />)
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<KeycapButton label="→" onClick={() => {}} ariaLabel="Next slide" className="custom" />)
    expect(screen.getByRole('button', { name: 'Next slide' }).className).toContain('custom')
  })
})
