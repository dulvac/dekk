import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import rehypeSanitize from 'rehype-sanitize'
import { TitleBlock, SubtitleBlock } from './TitleBlock'
import { UnorderedList, OrderedList, ListItem } from './BulletList'
import { ImageBlock } from './ImageBlock'
import { CodeBlock } from './CodeBlock'
import { MermaidDiagram } from './MermaidDiagram'
import { Table, TableHead, TableRow, TableHeaderCell, TableCell } from './TableBlock'
import { ErrorBoundary } from './ErrorBoundary'
import styles from '../styles/slides.module.css'
import type { Components } from 'react-markdown'
import type { SlideData } from '../core/parser'

const components: Components = {
  h1: ({ children, ...props }) => <TitleBlock {...props}>{children}</TitleBlock>,
  h2: ({ children, ...props }) => (
    <SubtitleBlock {...props}>{children}</SubtitleBlock>
  ),
  h3: ({ children, ...props }) => (
    <h3 className={styles.h3} {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className={styles.h4} {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className={styles.h5} {...props}>{children}</h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className={styles.h6} {...props}>{children}</h6>
  ),
  ul: ({ children, ...props }) => (
    <UnorderedList {...props}>{children}</UnorderedList>
  ),
  ol: ({ children, ...props }) => (
    <OrderedList {...props}>{children}</OrderedList>
  ),
  li: ({ children, className, ...props }) => {
    if (className?.includes('task-list-item')) {
      return (
        <li className={styles.taskListItem} {...props}>{children}</li>
      )
    }
    return <ListItem className={className} {...props}>{children}</ListItem>
  },
  img: (props) => <ImageBlock {...props} />,
  a: ({ children, ...props }) => (
    <a className={styles.link} {...props}>{children}</a>
  ),
  del: ({ children, ...props }) => (
    <del className={styles.strikethrough} {...props}>{children}</del>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className={styles.blockquote} {...props}>{children}</blockquote>
  ),
  table: ({ children, ...props }) => <Table {...props}>{children}</Table>,
  thead: ({ children, ...props }) => <TableHead {...props}>{children}</TableHead>,
  tr: ({ children, ...props }) => <TableRow {...props}>{children}</TableRow>,
  th: ({ children, ...props }) => <TableHeaderCell {...props}>{children}</TableHeaderCell>,
  td: ({ children, ...props }) => <TableCell {...props}>{children}</TableCell>,
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
