import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitHubAuthModal } from './GitHubAuthModal'

describe('GitHubAuthModal', () => {
  it('shows token input field', () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByLabelText(/github token/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'password')
  })

  it('has "Remember token" checkbox', () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: /remember/i })).toBeInTheDocument()
  })

  it('shows warning about localStorage', () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/stored in your browser/i)).toBeInTheDocument()
  })

  it('calls onAuthorize with token and remember preference', async () => {
    const onAuthorize = vi.fn()
    render(<GitHubAuthModal onAuthorize={onAuthorize} onCancel={vi.fn()} />)

    const input = screen.getByLabelText(/github token/i)
    await userEvent.type(input, 'ghp_test123')

    const checkbox = screen.getByRole('checkbox', { name: /remember/i })
    await userEvent.click(checkbox)

    const authorizeBtn = screen.getByRole('button', { name: /authorize/i })
    await userEvent.click(authorizeBtn)

    expect(onAuthorize).toHaveBeenCalledWith('ghp_test123', 'local')
  })

  it('calls onAuthorize with session storage by default', async () => {
    const onAuthorize = vi.fn()
    render(<GitHubAuthModal onAuthorize={onAuthorize} onCancel={vi.fn()} />)

    const input = screen.getByLabelText(/github token/i)
    await userEvent.type(input, 'ghp_test456')

    const authorizeBtn = screen.getByRole('button', { name: /authorize/i })
    await userEvent.click(authorizeBtn)

    expect(onAuthorize).toHaveBeenCalledWith('ghp_test456', 'session')
  })

  it('calls onCancel when cancel clicked', async () => {
    const onCancel = vi.fn()
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={onCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelBtn)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables Authorize button when token is empty', () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const authorizeBtn = screen.getByRole('button', { name: /authorize/i })
    expect(authorizeBtn).toBeDisabled()
  })

  it('disables Authorize button when token does not start with ghp_ or github_pat_', async () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByLabelText(/github token/i)
    await userEvent.type(input, 'invalid_token')
    const authorizeBtn = screen.getByRole('button', { name: /authorize/i })
    expect(authorizeBtn).toBeDisabled()
  })

  it('enables Authorize button when token starts with ghp_', async () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByLabelText(/github token/i)
    await userEvent.type(input, 'ghp_validtoken')
    const authorizeBtn = screen.getByRole('button', { name: /authorize/i })
    expect(authorizeBtn).not.toBeDisabled()
  })

  it('enables Authorize button when token starts with github_pat_', async () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByLabelText(/github token/i)
    await userEvent.type(input, 'github_pat_validtoken')
    const authorizeBtn = screen.getByRole('button', { name: /authorize/i })
    expect(authorizeBtn).not.toBeDisabled()
  })

  it('has password reveal toggle', async () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByLabelText(/github token/i)
    expect(input).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /show|reveal/i })
    await userEvent.click(toggleBtn)

    expect(input).toHaveAttribute('type', 'text')
  })

  it('has autocomplete off and spellcheck false', () => {
    render(<GitHubAuthModal onAuthorize={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByLabelText(/github token/i)
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('spellcheck', 'false')
  })
})
