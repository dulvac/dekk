import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveButton } from './SaveButton'

describe('SaveButton', () => {
  it('renders in idle state with "Save" text', () => {
    render(<SaveButton status="idle" onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows spinner/text when saving', () => {
    render(<SaveButton status="saving" onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows "Saved" when saved', () => {
    render(<SaveButton status="saved" onSave={vi.fn()} />)
    expect(screen.getByText(/saved/i)).toBeInTheDocument()
  })

  it('shows error message when error', () => {
    render(<SaveButton status="error" onSave={vi.fn()} errorMessage="Network error" />)
    expect(screen.getByText(/network error/i)).toBeInTheDocument()
  })

  it('shows PR link when prLink is set', () => {
    render(
      <SaveButton
        status="pr-created"
        onSave={vi.fn()}
        prUrl="https://github.com/owner/repo/pull/1"
      />
    )
    const link = screen.getByRole('link', { name: /view pull request/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://github.com/owner/repo/pull/1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('calls onSave when clicked in idle state', async () => {
    const onSave = vi.fn()
    render(<SaveButton status="idle" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('does not call onSave when disabled', async () => {
    const onSave = vi.fn()
    render(<SaveButton status="saving" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSave).not.toHaveBeenCalled()
  })
})
