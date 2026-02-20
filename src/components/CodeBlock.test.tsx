import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CodeBlock } from './CodeBlock'

vi.mock('../core/highlighter', () => ({
  highlightCode: vi.fn().mockResolvedValue('<pre><code>highlighted</code></pre>'),
}))

describe('CodeBlock', () => {
  it('renders inline code when no language class', () => {
    render(<CodeBlock>inline snippet</CodeBlock>)
    const code = screen.getByText('inline snippet')
    expect(code.tagName).toBe('CODE')
  })

  it('renders inline code when className has no language prefix', () => {
    render(<CodeBlock className="some-class">text</CodeBlock>)
    expect(screen.getByText('text').tagName).toBe('CODE')
  })

  it('renders code block with language label for language-* class', async () => {
    render(
      <CodeBlock className="language-typescript">{'const x = 1\n'}</CodeBlock>
    )
    // Should show fallback pre/code while loading
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
    // Language label should appear
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  it('renders fallback pre/code before highlight loads', () => {
    render(
      <CodeBlock className="language-javascript">{'let a = 2\n'}</CodeBlock>
    )
    const pre = screen.getByText('let a = 2').closest('pre')
    expect(pre).toBeInTheDocument()
  })

  it('calls highlightCode with correct arguments', async () => {
    const { highlightCode } = await import('../core/highlighter')
    vi.mocked(highlightCode).mockClear()

    render(
      <CodeBlock className="language-python">{'print("hi")\n'}</CodeBlock>
    )

    await waitFor(() => {
      expect(highlightCode).toHaveBeenCalledWith('print("hi")', 'python')
    })
  })

  it('strips trailing newline from code', async () => {
    const { highlightCode } = await import('../core/highlighter')
    vi.mocked(highlightCode).mockClear()

    render(
      <CodeBlock className="language-rust">{'fn main()\n'}</CodeBlock>
    )

    await waitFor(() => {
      expect(highlightCode).toHaveBeenCalledWith('fn main()', 'rust')
    })
  })
})
