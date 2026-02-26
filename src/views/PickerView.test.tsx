import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickerView } from './PickerView'

describe('PickerView', () => {
  it('renders a card for each deck entry', () => {
    const entries = [
      { id: 'talk-1', title: 'Talk 1', slideCount: 5, rawMarkdown: '' },
      { id: 'talk-2', title: 'Talk 2', slideCount: 3, rawMarkdown: '' },
    ]
    const onSelect = vi.fn()
    render(<PickerView entries={entries} onSelectDeck={onSelect} />)
    expect(screen.getByText('Talk 1')).toBeInTheDocument()
    expect(screen.getByText('Talk 2')).toBeInTheDocument()
    expect(screen.getByText('5 slides')).toBeInTheDocument()
  })

  it('calls onSelectDeck when a card is clicked', async () => {
    const entries = [{ id: 'talk-1', title: 'Talk 1', slideCount: 5, rawMarkdown: '' }]
    const onSelect = vi.fn()
    render(<PickerView entries={entries} onSelectDeck={onSelect} />)
    await userEvent.click(screen.getByText('Talk 1'))
    expect(onSelect).toHaveBeenCalledWith('talk-1')
  })

  it('cards are keyboard accessible', async () => {
    const entries = [{ id: 'talk-1', title: 'Talk 1', slideCount: 5, rawMarkdown: '' }]
    const onSelect = vi.fn()
    render(<PickerView entries={entries} onSelectDeck={onSelect} />)
    const card = screen.getByRole('button', { name: /Talk 1/ })
    expect(card).toBeInTheDocument()
  })
})
