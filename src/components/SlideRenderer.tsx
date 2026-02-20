import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import rehypeSanitize from 'rehype-sanitize'
import { TitleBlock, SubtitleBlock } from './TitleBlock'
import { UnorderedList, OrderedList, ListItem } from './BulletList'
import { ImageBlock } from './ImageBlock'
import { CodeBlock } from './CodeBlock'
import { MermaidDiagram } from './MermaidDiagram'
import { ErrorBoundary } from './ErrorBoundary'
import type { Components } from 'react-markdown'
import type { SlideData } from '../core/parser'

const components: Components = {
  h1: ({ children, ...props }) => <TitleBlock {...props}>{children}</TitleBlock>,
  h2: ({ children, ...props }) => (
    <SubtitleBlock {...props}>{children}</SubtitleBlock>
  ),
  ul: ({ children, ...props }) => (
    <UnorderedList {...props}>{children}</UnorderedList>
  ),
  ol: ({ children, ...props }) => (
    <OrderedList {...props}>{children}</OrderedList>
  ),
  li: ({ children, ...props }) => <ListItem {...props}>{children}</ListItem>,
  img: (props) => <ImageBlock {...props} />,
  code: ({ className, children, ...props }) => {
    const langMatch = (className || '').match(/language-(\w+)/)
    if (langMatch && langMatch[1] === 'mermaid') {
      return (
        <ErrorBoundary>
          <MermaidDiagram chart={String(children).trim()} />
        </ErrorBoundary>
      )
    }
    return (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    )
  },
}

interface SlideRendererProps {
  markdown?: string
  slide?: SlideData
}

export function SlideRenderer({ markdown, slide }: SlideRendererProps) {
  const content = markdown ?? slide?.rawContent ?? ''
  return (
    <ErrorBoundary>
      <Markdown
        remarkPlugins={[remarkGfm, remarkEmoji]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </Markdown>
    </ErrorBoundary>
  )
}
