# Dekk Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static SPA for presenting markdown-authored slides with a highly branded dark visual identity, targeting developer talks.

**Architecture:** React 18 SPA built with Vite. Markdown is parsed via a unified/remark/rehype pipeline with a custom slide-splitting plugin. Slides are rendered through react-markdown with custom component mappings. State is managed with React Context + useReducer. Three views: PresentationView, EditorView (CodeMirror 6), and OverviewGrid.

**Tech Stack:** React 18, TypeScript, Vite, unified/remark/rehype, react-markdown, Shiki (code highlighting), Mermaid.js (diagrams), CodeMirror 6 (editor), CSS Modules + custom properties.

**Design doc:** `docs/plans/2026-02-20-dekk-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

**Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
```

Accept overwrite prompts for the empty directory.

**Step 2: Install production dependencies**

```bash
npm install react-markdown unified remark-parse remark-rehype remark-gfm remark-emoji rehype-raw shiki @shikijs/rehype @shikijs/transformers mermaid @uiw/react-codemirror @codemirror/lang-markdown @codemirror/view @codemirror/state
```

**Step 3: Install dev dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react @types/react-dom
```

**Step 4: Configure Vitest**

Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: true,
  },
})
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Update `tsconfig.json` to include vitest types:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

**Step 5: Add scripts to package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**Step 6: Verify scaffold works**

```bash
npm run build
npm run test:run
```

Expected: Build succeeds, test runner starts (may have 0 tests).

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project with dependencies"
```

---

## Task 2: CSS Foundation -- Brand Variables and Global Styles

**Files:**
- Create: `src/styles/variables.css`, `src/styles/global.css`
- Modify: `index.html` (link fonts)
- Modify: `src/main.tsx` (import styles)

**Step 1: Add font links to index.html**

Add Google Fonts CDN links in `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
```

**Step 2: Create CSS custom properties**

Create `src/styles/variables.css`:

```css
:root {
  /* Colors */
  --mp-bg: #0B0D17;
  --mp-surface: #141829;
  --mp-primary: #6C5CE7;
  --mp-secondary: #00CEC9;
  --mp-text: #E8E8F0;
  --mp-muted: #6B7394;
  --mp-success: #00E676;
  --mp-danger: #FF5252;
  --mp-code-bg: #1A1E2E;

  /* Typography */
  --mp-font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --mp-font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Sizes (at 1920x1080 logical resolution) */
  --mp-title-size: 72px;
  --mp-subtitle-size: 44px;
  --mp-body-size: 28px;
  --mp-bullet-size: 26px;
  --mp-code-size: 22px;
  --mp-inline-code-size: 24px;
  --mp-counter-size: 16px;

  /* Spacing */
  --mp-slide-padding: 80px;
  --mp-content-gap: 24px;

  /* Transitions */
  --mp-transition-duration: 200ms;
  --mp-transition-ease: ease-out;

  /* Radii */
  --mp-radius-code: 12px;
  --mp-radius-image: 8px;

  /* Gradient */
  --mp-gradient: linear-gradient(135deg, var(--mp-primary), var(--mp-secondary));
}
```

**Step 3: Create global reset and base styles**

Create `src/styles/global.css`:

```css
@import './variables.css';

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--mp-bg);
  color: var(--mp-text);
  font-family: var(--mp-font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background-color: rgba(108, 92, 231, 0.3);
  color: var(--mp-text);
}
```

**Step 4: Import global styles in main.tsx**

```typescript
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 5: Verify styles load**

```bash
npm run dev
```

Open browser, verify dark background and font loading.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add brand CSS variables, global styles, and fonts"
```

---

## Task 3: Custom remark-slides Plugin

**Files:**
- Create: `src/core/plugins/remark-slides.ts`
- Create: `src/core/plugins/remark-slides.test.ts`

**Step 1: Write the failing tests**

Create `src/core/plugins/remark-slides.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkSlides, type SlideNode } from './remark-slides'

function parseSlides(markdown: string): SlideNode[] {
  const processor = unified().use(remarkParse).use(remarkSlides)
  const tree = processor.runSync(processor.parse(markdown))
  return tree.children as SlideNode[]
}

describe('remark-slides', () => {
  it('wraps content without separators into a single slide', () => {
    const slides = parseSlides('# Hello\n\nSome text')
    expect(slides).toHaveLength(1)
    expect(slides[0].type).toBe('slide')
  })

  it('splits on --- into multiple slides', () => {
    const slides = parseSlides('# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3')
    expect(slides).toHaveLength(3)
    slides.forEach(s => expect(s.type).toBe('slide'))
  })

  it('handles empty slides gracefully', () => {
    const slides = parseSlides('---\n\n---')
    expect(slides.every(s => s.type === 'slide')).toBe(true)
  })

  it('extracts per-slide metadata from HTML comments', () => {
    const md = '<!-- bg: #ff0000 -->\n\n# Red Slide\n\n---\n\n<!-- layout: center -->\n\n# Centered'
    const slides = parseSlides(md)
    expect(slides[0].data?.metadata?.bg).toBe('#ff0000')
    expect(slides[1].data?.metadata?.layout).toBe('center')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/plugins/remark-slides.test.ts
```

Expected: FAIL -- module not found.

**Step 3: Implement the plugin**

Create `src/core/plugins/remark-slides.ts`:

```typescript
import type { Root, Content, RootContent } from 'mdast'
import type { Plugin } from 'unified'

export interface SlideMetadata {
  bg?: string
  class?: string
  layout?: string
  transition?: string
  [key: string]: string | undefined
}

export interface SlideNode {
  type: 'slide'
  children: Content[]
  data?: {
    metadata?: SlideMetadata
  }
}

const COMMENT_DIRECTIVE_RE = /^<!--\s*(\w+)\s*:\s*(.+?)\s*-->$/

function extractMetadata(children: RootContent[]): {
  metadata: SlideMetadata
  remaining: RootContent[]
} {
  const metadata: SlideMetadata = {}
  let startIndex = 0

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.type === 'html') {
      const match = COMMENT_DIRECTIVE_RE.exec(node.value)
      if (match) {
        metadata[match[1]] = match[2]
        startIndex = i + 1
        continue
      }
    }
    break
  }

  return { metadata, remaining: children.slice(startIndex) }
}

export const remarkSlides: Plugin<[], Root> = function () {
  return function (tree: Root) {
    const slides: SlideNode[] = []
    let currentChildren: RootContent[] = []

    for (const node of tree.children) {
      if (node.type === 'thematicBreak') {
        if (currentChildren.length > 0) {
          const { metadata, remaining } = extractMetadata(currentChildren)
          slides.push({
            type: 'slide',
            children: remaining as Content[],
            data: { metadata },
          })
        }
        currentChildren = []
      } else {
        currentChildren.push(node)
      }
    }

    // Last slide
    if (currentChildren.length > 0) {
      const { metadata, remaining } = extractMetadata(currentChildren)
      slides.push({
        type: 'slide',
        children: remaining as Content[],
        data: { metadata },
      })
    }

    tree.children = slides as unknown as RootContent[]
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/core/plugins/remark-slides.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/core/plugins/
git commit -m "feat: add remark-slides plugin for splitting markdown into slides"
```

---

## Task 4: Markdown Parser Pipeline

**Files:**
- Create: `src/core/parser.ts`
- Create: `src/core/parser.test.ts`

**Step 1: Write the failing tests**

Create `src/core/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseMarkdown } from './parser'

describe('parseMarkdown', () => {
  it('parses a single slide from markdown', () => {
    const result = parseMarkdown('# Hello World')
    expect(result.slides).toHaveLength(1)
  })

  it('parses multiple slides split by ---', () => {
    const result = parseMarkdown('# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3')
    expect(result.slides).toHaveLength(3)
  })

  it('extracts deck metadata from frontmatter', () => {
    const md = '---\ntitle: My Talk\nauthor: Jane\n---\n\n# First Slide'
    const result = parseMarkdown(md)
    expect(result.deckMetadata.title).toBe('My Talk')
    expect(result.deckMetadata.author).toBe('Jane')
  })

  it('preserves per-slide metadata', () => {
    const md = '<!-- bg: #ff0000 -->\n\n# Red Slide'
    const result = parseMarkdown(md)
    expect(result.slides[0].metadata?.bg).toBe('#ff0000')
  })

  it('stores raw content for each slide', () => {
    const md = '# Slide 1\n\nParagraph\n\n---\n\n# Slide 2'
    const result = parseMarkdown(md)
    expect(result.slides[0].rawContent).toContain('# Slide 1')
    expect(result.slides[1].rawContent).toContain('# Slide 2')
  })

  it('handles GFM tables', () => {
    const md = '| Col A | Col B |\n|-------|-------|\n| 1     | 2     |'
    const result = parseMarkdown(md)
    expect(result.slides).toHaveLength(1)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/parser.test.ts
```

Expected: FAIL -- module not found.

**Step 3: Implement the parser**

Create `src/core/parser.ts`:

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import { remarkSlides, type SlideNode, type SlideMetadata } from './plugins/remark-slides'
import type { Root, RootContent } from 'mdast'

export interface SlideData {
  children: RootContent[]
  metadata: SlideMetadata
  rawContent: string
}

export interface DeckMetadata {
  title?: string
  author?: string
  date?: string
  aspectRatio?: string
  [key: string]: string | undefined
}

export interface ParseResult {
  slides: SlideData[]
  deckMetadata: DeckMetadata
}

function extractFrontmatter(markdown: string): {
  deckMetadata: DeckMetadata
  body: string
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return { deckMetadata: {}, body: markdown }

  const deckMetadata: DeckMetadata = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      deckMetadata[key] = value
    }
  }

  const body = markdown.slice(match[0].length)
  return { deckMetadata, body }
}

function splitRawContent(body: string): string[] {
  // Split on --- that appears as its own paragraph (blank lines around it)
  return body.split(/\n---\n/).map(s => s.trim()).filter(Boolean)
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkEmoji)
  .use(remarkSlides)

export function parseMarkdown(markdown: string): ParseResult {
  const { deckMetadata, body } = extractFrontmatter(markdown)
  const tree = processor.runSync(processor.parse(body)) as Root
  const rawChunks = splitRawContent(body)

  const slides: SlideData[] = (tree.children as unknown as SlideNode[]).map(
    (node, i) => ({
      children: node.children as RootContent[],
      metadata: node.data?.metadata ?? {},
      rawContent: rawChunks[i] ?? '',
    })
  )

  return { slides, deckMetadata }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/core/parser.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/core/parser.ts src/core/parser.test.ts
git commit -m "feat: add markdown parser with unified pipeline, GFM, emoji, slide splitting"
```

---

## Task 5: Slide Store (State Management)

**Files:**
- Create: `src/core/store.ts`
- Create: `src/core/store.test.ts`

**Step 1: Write the failing tests**

Create `src/core/store.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { slideReducer, initialState } from './store'

describe('slideReducer', () => {
  const threeSlideState = {
    ...initialState,
    rawMarkdown: '# A\n\n---\n\n# B\n\n---\n\n# C',
    slides: [
      { children: [], metadata: {}, rawContent: '# A' },
      { children: [], metadata: {}, rawContent: '# B' },
      { children: [], metadata: {}, rawContent: '# C' },
    ],
    currentIndex: 0,
  }

  it('NEXT_SLIDE increments index', () => {
    const state = slideReducer(threeSlideState, { type: 'NEXT_SLIDE' })
    expect(state.currentIndex).toBe(1)
  })

  it('NEXT_SLIDE does not go past last slide', () => {
    const state = slideReducer(
      { ...threeSlideState, currentIndex: 2 },
      { type: 'NEXT_SLIDE' }
    )
    expect(state.currentIndex).toBe(2)
  })

  it('PREV_SLIDE decrements index', () => {
    const state = slideReducer(
      { ...threeSlideState, currentIndex: 1 },
      { type: 'PREV_SLIDE' }
    )
    expect(state.currentIndex).toBe(0)
  })

  it('PREV_SLIDE does not go below 0', () => {
    const state = slideReducer(threeSlideState, { type: 'PREV_SLIDE' })
    expect(state.currentIndex).toBe(0)
  })

  it('GO_TO_SLIDE jumps to valid index', () => {
    const state = slideReducer(threeSlideState, {
      type: 'GO_TO_SLIDE',
      index: 2,
    })
    expect(state.currentIndex).toBe(2)
  })

  it('GO_TO_SLIDE clamps out-of-range index', () => {
    const state = slideReducer(threeSlideState, {
      type: 'GO_TO_SLIDE',
      index: 99,
    })
    expect(state.currentIndex).toBe(2)
  })

  it('SET_MARKDOWN updates markdown and re-parses slides', () => {
    const state = slideReducer(initialState, {
      type: 'SET_MARKDOWN',
      markdown: '# One\n\n---\n\n# Two',
    })
    expect(state.rawMarkdown).toBe('# One\n\n---\n\n# Two')
    expect(state.slides).toHaveLength(2)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/store.test.ts
```

Expected: FAIL.

**Step 3: Implement the store**

Create `src/core/store.ts`:

```typescript
import { createContext, useContext, type Dispatch } from 'react'
import { parseMarkdown, type SlideData, type DeckMetadata } from './parser'

export interface SlideState {
  rawMarkdown: string
  slides: SlideData[]
  deckMetadata: DeckMetadata
  currentIndex: number
}

export type SlideAction =
  | { type: 'SET_MARKDOWN'; markdown: string }
  | { type: 'NEXT_SLIDE' }
  | { type: 'PREV_SLIDE' }
  | { type: 'GO_TO_SLIDE'; index: number }

export const initialState: SlideState = {
  rawMarkdown: '',
  slides: [],
  deckMetadata: {},
  currentIndex: 0,
}

export function slideReducer(
  state: SlideState,
  action: SlideAction
): SlideState {
  switch (action.type) {
    case 'SET_MARKDOWN': {
      const { slides, deckMetadata } = parseMarkdown(action.markdown)
      const clampedIndex = Math.min(
        state.currentIndex,
        Math.max(0, slides.length - 1)
      )
      return {
        rawMarkdown: action.markdown,
        slides,
        deckMetadata,
        currentIndex: clampedIndex,
      }
    }
    case 'NEXT_SLIDE':
      return {
        ...state,
        currentIndex: Math.min(
          state.currentIndex + 1,
          state.slides.length - 1
        ),
      }
    case 'PREV_SLIDE':
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
      }
    case 'GO_TO_SLIDE': {
      const clamped = Math.max(
        0,
        Math.min(action.index, state.slides.length - 1)
      )
      return { ...state, currentIndex: clamped }
    }
    default:
      return state
  }
}

export const SlideContext = createContext<SlideState>(initialState)
export const SlideDispatchContext = createContext<Dispatch<SlideAction>>(
  () => {}
)

export function useSlides() {
  return useContext(SlideContext)
}

export function useSlideDispatch() {
  return useContext(SlideDispatchContext)
}
```

**Step 4: Run tests**

```bash
npx vitest run src/core/store.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/store.ts src/core/store.test.ts
git commit -m "feat: add slide store with reducer, context, and navigation actions"
```

---

## Task 6: SlideFrame Component (16:9 Viewport)

**Files:**
- Create: `src/components/SlideFrame.tsx`
- Create: `src/styles/slides.module.css`
- Create: `src/components/SlideFrame.test.tsx`

**Step 1: Write the failing test**

Create `src/components/SlideFrame.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideFrame } from './SlideFrame'

describe('SlideFrame', () => {
  it('renders children inside a 16:9 viewport', () => {
    render(
      <SlideFrame>
        <p>Slide content</p>
      </SlideFrame>
    )
    expect(screen.getByText('Slide content')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/components/SlideFrame.test.tsx
```

**Step 3: Implement SlideFrame**

Create `src/styles/slides.module.css`:

```css
.frame {
  width: 1920px;
  height: 1080px;
  position: relative;
  overflow: hidden;
  background-color: var(--mp-surface);
  font-family: var(--mp-font-body);
  color: var(--mp-text);
  transform-origin: top left;
}

.frameContent {
  width: 100%;
  height: 100%;
  padding: var(--mp-slide-padding);
  display: flex;
  flex-direction: column;
  gap: var(--mp-content-gap);
}

.scaleWrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
```

Create `src/components/SlideFrame.tsx`:

```typescript
import { useRef, useEffect, useState, type ReactNode, type CSSProperties } from 'react'
import styles from '../styles/slides.module.css'

const SLIDE_WIDTH = 1920
const SLIDE_HEIGHT = 1080

interface SlideFrameProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function SlideFrame({ children, className, style }: SlideFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      if (!wrapperRef.current) return
      const { clientWidth, clientHeight } = wrapperRef.current
      const scaleX = clientWidth / SLIDE_WIDTH
      const scaleY = clientHeight / SLIDE_HEIGHT
      setScale(Math.min(scaleX, scaleY))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapperRef} className={styles.scaleWrapper}>
      <div
        className={`${styles.frame} ${className ?? ''}`}
        style={{ transform: `scale(${scale})`, ...style }}
      >
        <div className={styles.frameContent}>
          {children}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/SlideFrame.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/SlideFrame.tsx src/components/SlideFrame.test.tsx src/styles/slides.module.css
git commit -m "feat: add SlideFrame component with 16:9 viewport and responsive scaling"
```

---

## Task 7: SlideRenderer with Custom Components

**Files:**
- Create: `src/components/SlideRenderer.tsx`
- Create: `src/components/TitleBlock.tsx`
- Create: `src/components/BulletList.tsx`
- Create: `src/components/ImageBlock.tsx`
- Create: `src/components/CodeBlock.tsx` (basic, Shiki in Task 8)
- Create: `src/styles/code.module.css`
- Create: `src/components/SlideRenderer.test.tsx`

**Step 1: Write the failing test**

Create `src/components/SlideRenderer.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideRenderer } from './SlideRenderer'

describe('SlideRenderer', () => {
  it('renders a heading as a TitleBlock', () => {
    render(<SlideRenderer markdown="# Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders a subtitle (h2)', () => {
    render(<SlideRenderer markdown="## Subtitle" />)
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
  })

  it('renders bullet points', () => {
    render(<SlideRenderer markdown="- First\n- Second\n- Third" />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('renders paragraphs', () => {
    render(<SlideRenderer markdown="Some body text here." />)
    expect(screen.getByText('Some body text here.')).toBeInTheDocument()
  })

  it('renders images', () => {
    render(
      <SlideRenderer markdown="![alt text](https://example.com/img.png)" />
    )
    const img = screen.getByAltText('alt text')
    expect(img).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify failure**

```bash
npx vitest run src/components/SlideRenderer.test.tsx
```

**Step 3: Implement the components**

Create `src/components/TitleBlock.tsx`:

```typescript
import type { HTMLAttributes } from 'react'
import styles from '../styles/slides.module.css'

export function TitleBlock({
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={styles.title} {...props}>
      {children}
    </h1>
  )
}

export function SubtitleBlock({
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={styles.subtitle} {...props}>
      {children}
    </h2>
  )
}
```

Create `src/components/BulletList.tsx`:

```typescript
import type { HTMLAttributes, OlHTMLAttributes } from 'react'
import styles from '../styles/slides.module.css'

export function UnorderedList({
  children,
  ...props
}: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={styles.bulletList} {...props}>
      {children}
    </ul>
  )
}

export function OrderedList({
  children,
  ...props
}: OlHTMLAttributes<HTMLOListElement>) {
  return (
    <ol className={styles.orderedList} {...props}>
      {children}
    </ol>
  )
}

export function ListItem({
  children,
  ...props
}: HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={styles.bulletItem} {...props}>
      {children}
    </li>
  )
}
```

Create `src/components/ImageBlock.tsx`:

```typescript
import type { ImgHTMLAttributes } from 'react'
import styles from '../styles/slides.module.css'

export function ImageBlock(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={styles.image} {...props} />
}
```

Create `src/styles/code.module.css`:

```css
.codeBlockWrapper {
  position: relative;
  border-radius: var(--mp-radius-code);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.codeBlock {
  background-color: var(--mp-code-bg);
  padding: 24px 28px;
  font-family: var(--mp-font-mono);
  font-size: var(--mp-code-size);
  line-height: 1.6;
  overflow-x: auto;
  border-top: 3px solid;
  border-image: var(--mp-gradient) 1;
  margin: 0;
}

.languageLabel {
  position: absolute;
  top: 12px;
  right: 16px;
  font-family: var(--mp-font-mono);
  font-size: 13px;
  color: var(--mp-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  z-index: 1;
}

.inlineCode {
  font-family: var(--mp-font-mono);
  font-size: var(--mp-inline-code-size);
  background-color: var(--mp-code-bg);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--mp-secondary);
}
```

Create `src/components/CodeBlock.tsx` (basic version):

```typescript
import type { HTMLAttributes } from 'react'
import styles from '../styles/code.module.css'

interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  className?: string
  children?: React.ReactNode
}

export function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''

  if (!match) {
    return (
      <code className={styles.inlineCode} {...props}>
        {children}
      </code>
    )
  }

  return (
    <div className={styles.codeBlockWrapper}>
      {language && <span className={styles.languageLabel}>{language}</span>}
      <pre className={styles.codeBlock}>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}
```

Create `src/components/SlideRenderer.tsx`:

```typescript
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkEmoji from 'remark-emoji'
import { TitleBlock, SubtitleBlock } from './TitleBlock'
import { UnorderedList, OrderedList, ListItem } from './BulletList'
import { ImageBlock } from './ImageBlock'
import { CodeBlock } from './CodeBlock'
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
  code: ({ className, children, ...props }) => (
    <CodeBlock className={className} {...props}>
      {children}
    </CodeBlock>
  ),
}

interface SlideRendererProps {
  markdown?: string
  slide?: SlideData
}

export function SlideRenderer({ markdown, slide }: SlideRendererProps) {
  const content = markdown ?? slide?.rawContent ?? ''
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkEmoji]}
      components={components}
    >
      {content}
    </Markdown>
  )
}
```

**Step 4: Add slide typography styles**

Append to `src/styles/slides.module.css`:

```css
.title {
  font-size: var(--mp-title-size);
  font-weight: 700;
  color: var(--mp-text);
  line-height: 1.15;
  position: relative;
  padding-bottom: 16px;
}

.title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 120px;
  height: 4px;
  background: var(--mp-gradient);
  border-radius: 2px;
}

.subtitle {
  font-size: var(--mp-subtitle-size);
  font-weight: 500;
  color: var(--mp-muted);
  line-height: 1.3;
}

.bulletList,
.orderedList {
  font-size: var(--mp-bullet-size);
  line-height: 1.6;
  padding-left: 0;
  list-style: none;
}

.bulletItem {
  position: relative;
  padding-left: 32px;
  margin-bottom: 12px;
}

.bulletItem::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--mp-primary);
  box-shadow: 0 0 8px rgba(108, 92, 231, 0.4);
}

.orderedList {
  counter-reset: slide-counter;
}

.orderedList .bulletItem::before {
  content: counter(slide-counter);
  counter-increment: slide-counter;
  background: none;
  box-shadow: none;
  color: var(--mp-primary);
  font-weight: 700;
  font-size: 18px;
  top: 2px;
  left: 4px;
  width: auto;
  height: auto;
  border-radius: 0;
}

.image {
  max-width: 100%;
  max-height: 60%;
  border-radius: var(--mp-radius-image);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
```

**Step 5: Run tests**

```bash
npx vitest run src/components/SlideRenderer.test.tsx
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/ src/styles/
git commit -m "feat: add SlideRenderer with TitleBlock, BulletList, ImageBlock, CodeBlock"
```

---

## Task 8: Shiki Code Highlighting Integration

**Files:**
- Create: `src/core/highlighter.ts`
- Create: `src/core/highlighter.test.ts`
- Modify: `src/components/CodeBlock.tsx`
- Modify: `src/styles/code.module.css`

**Step 1: Write the failing test**

Create `src/core/highlighter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { highlightCode } from './highlighter'

describe('highlightCode', () => {
  it('returns highlighted HTML for a code string', async () => {
    const html = await highlightCode('const x = 1', 'typescript')
    expect(html).toContain('<pre')
    expect(html).toContain('const')
  })

  it('handles unknown languages gracefully', async () => {
    const html = await highlightCode('hello', 'unknownlang')
    expect(html).toBeTruthy()
  })
})
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/core/highlighter.test.ts
```

**Step 3: Implement the highlighter**

Create `src/core/highlighter.ts`:

```typescript
import { createHighlighter, type Highlighter } from 'shiki'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationFocus,
  transformerNotationErrorLevel,
  transformerMetaHighlight,
} from '@shikijs/transformers'

let highlighterPromise: Promise<Highlighter> | null = null

const COMMON_LANGS = [
  'typescript', 'javascript', 'tsx', 'jsx', 'python', 'rust', 'go',
  'java', 'c', 'cpp', 'csharp', 'ruby', 'swift', 'kotlin', 'bash',
  'shell', 'json', 'yaml', 'toml', 'html', 'css', 'sql', 'graphql',
  'markdown', 'dockerfile', 'plaintext',
]

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: COMMON_LANGS,
    })
  }
  return highlighterPromise
}

export async function highlightCode(
  code: string,
  lang: string,
  meta?: string
): Promise<string> {
  const highlighter = await getHighlighter()

  const loadedLangs = highlighter.getLoadedLanguages()
  const resolvedLang = loadedLangs.includes(lang) ? lang : 'plaintext'

  return highlighter.codeToHtml(code, {
    lang: resolvedLang,
    theme: 'github-dark',
    meta: meta ? { __raw: meta } : undefined,
    transformers: [
      transformerNotationDiff(),
      transformerNotationHighlight(),
      transformerNotationFocus(),
      transformerNotationErrorLevel(),
      transformerMetaHighlight(),
    ],
  })
}
```

**Step 4: Run tests**

```bash
npx vitest run src/core/highlighter.test.ts
```

Expected: PASS.

**Step 5: Update CodeBlock to use Shiki**

Replace `src/components/CodeBlock.tsx`:

```typescript
import { useEffect, useState, type HTMLAttributes } from 'react'
import { highlightCode } from '../core/highlighter'
import styles from '../styles/code.module.css'

interface CodeBlockProps extends HTMLAttributes<HTMLElement> {
  className?: string
  children?: React.ReactNode
}

export function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  if (!match) {
    return (
      <code className={styles.inlineCode} {...props}>
        {children}
      </code>
    )
  }

  return <HighlightedCodeBlock code={code} language={language} />
}

function HighlightedCodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    highlightCode(code, language).then(setHtml)
  }, [code, language])

  if (!html) {
    return (
      <div className={styles.codeBlockWrapper}>
        <span className={styles.languageLabel}>{language}</span>
        <pre className={styles.codeBlock}>
          <code>{code}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className={styles.codeBlockWrapper}>
      <span className={styles.languageLabel}>{language}</span>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
```

**Step 6: Add Shiki transformer CSS**

Append to `src/styles/code.module.css`:

```css
/* Shiki transformer styles */
:global(.shiki) {
  background-color: var(--mp-code-bg) !important;
  padding: 24px 28px;
  font-family: var(--mp-font-mono);
  font-size: var(--mp-code-size);
  line-height: 1.6;
  overflow-x: auto;
  border-top: 3px solid;
  border-image: var(--mp-gradient) 1;
  border-radius: var(--mp-radius-code);
  margin: 0;
}

:global(.shiki .line.diff.add) {
  background-color: rgba(0, 230, 118, 0.15);
}

:global(.shiki .line.diff.remove) {
  background-color: rgba(255, 82, 82, 0.15);
}

:global(.shiki .line.highlighted) {
  background-color: rgba(108, 92, 231, 0.15);
}

:global(.shiki.has-focused .line:not(.focused)) {
  opacity: 0.4;
  transition: opacity var(--mp-transition-duration) var(--mp-transition-ease);
}

:global(.shiki:hover .line:not(.focused)) {
  opacity: 0.8;
}

:global(.shiki .line.highlighted.error) {
  background-color: rgba(255, 82, 82, 0.15);
}

:global(.shiki .line.highlighted.warning) {
  background-color: rgba(255, 193, 7, 0.15);
}
```

**Step 7: Run all tests**

```bash
npx vitest run
```

Expected: PASS.

**Step 8: Commit**

```bash
git add src/core/highlighter.ts src/core/highlighter.test.ts src/components/CodeBlock.tsx src/styles/code.module.css
git commit -m "feat: add Shiki code highlighting with diff, focus, and line highlight"
```

---

## Task 9: Mermaid Diagram Component

**Files:**
- Create: `src/components/MermaidDiagram.tsx`
- Create: `src/components/MermaidDiagram.test.tsx`
- Modify: `src/components/SlideRenderer.tsx`
- Modify: `src/styles/slides.module.css`

**Step 1: Write the failing test**

Create `src/components/MermaidDiagram.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MermaidDiagram } from './MermaidDiagram'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg><text>mock diagram</text></svg>',
    }),
  },
}))

describe('MermaidDiagram', () => {
  it('renders a mermaid diagram', async () => {
    const { container } = render(
      <MermaidDiagram chart="graph LR; A-->B" id="test-1" />
    )
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy()
    })
  })
})
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/components/MermaidDiagram.test.tsx
```

**Step 3: Implement MermaidDiagram**

Create `src/components/MermaidDiagram.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import styles from '../styles/slides.module.css'

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#6C5CE7',
      primaryTextColor: '#E8E8F0',
      primaryBorderColor: '#6B7394',
      lineColor: '#6B7394',
      secondaryColor: '#00CEC9',
      tertiaryColor: '#1A1E2E',
      background: '#141829',
      mainBkg: '#1A1E2E',
      textColor: '#E8E8F0',
      fontSize: '16px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true },
  })
  mermaidInitialized = true
}

interface MermaidDiagramProps {
  chart: string
  id: string
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initMermaid()
    let cancelled = false

    async function renderDiagram() {
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Diagram render failed'
          )
        }
      }
    }

    renderDiagram()
    return () => {
      cancelled = true
    }
  }, [chart, id])

  if (error) {
    return <div className={styles.mermaidError}>Diagram error: {error}</div>
  }

  return <div ref={containerRef} className={styles.mermaidContainer} />
}
```

**Step 4: Add mermaid styles**

Append to `src/styles/slides.module.css`:

```css
.mermaidContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
}

.mermaidContainer svg {
  max-width: 100%;
  max-height: 500px;
}

.mermaidError {
  color: var(--mp-danger);
  font-family: var(--mp-font-mono);
  font-size: 16px;
  padding: 16px;
  background: var(--mp-code-bg);
  border-radius: var(--mp-radius-code);
}
```

**Step 5: Integrate into SlideRenderer**

Update `src/components/SlideRenderer.tsx` to detect mermaid code blocks:

Add import: `import { MermaidDiagram } from './MermaidDiagram'`

Update the `code` entry in the components map:

```typescript
let mermaidCounter = 0

const components: Components = {
  // ... existing mappings unchanged ...
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    if (match && match[1] === 'mermaid') {
      return (
        <MermaidDiagram
          chart={String(children).trim()}
          id={`slide-${++mermaidCounter}`}
        />
      )
    }
    return (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    )
  },
}
```

**Step 6: Run tests**

```bash
npx vitest run
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/components/MermaidDiagram.tsx src/components/MermaidDiagram.test.tsx src/components/SlideRenderer.tsx src/styles/slides.module.css
git commit -m "feat: add MermaidDiagram with branded theme integration"
```

---

## Task 10: Keyboard Manager

**Files:**
- Create: `src/core/keyboard.ts`
- Create: `src/core/keyboard.test.ts`

**Step 1: Write the failing test**

Create `src/core/keyboard.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createKeyboardHandler, type KeyboardActions } from './keyboard'

function makeActions(): KeyboardActions {
  return {
    nextSlide: vi.fn(),
    prevSlide: vi.fn(),
    firstSlide: vi.fn(),
    lastSlide: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleOverview: vi.fn(),
    toggleEditor: vi.fn(),
    escape: vi.fn(),
    goToSlide: vi.fn(),
  }
}

function fireKey(key: string) {
  return new KeyboardEvent('keydown', { key, bubbles: true })
}

describe('createKeyboardHandler', () => {
  it('calls nextSlide on ArrowRight', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('ArrowRight'))
    expect(actions.nextSlide).toHaveBeenCalled()
  })

  it('calls prevSlide on ArrowLeft', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('ArrowLeft'))
    expect(actions.prevSlide).toHaveBeenCalled()
  })

  it('calls toggleFullscreen on f', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('f'))
    expect(actions.toggleFullscreen).toHaveBeenCalled()
  })

  it('calls goToSlide for number keys 1-9', () => {
    const actions = makeActions()
    const handler = createKeyboardHandler(actions)
    handler(fireKey('3'))
    expect(actions.goToSlide).toHaveBeenCalledWith(2)
  })
})
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/core/keyboard.test.ts
```

**Step 3: Implement keyboard handler**

Create `src/core/keyboard.ts`:

```typescript
export interface KeyboardActions {
  nextSlide: () => void
  prevSlide: () => void
  firstSlide: () => void
  lastSlide: () => void
  toggleFullscreen: () => void
  toggleOverview: () => void
  toggleEditor: () => void
  escape: () => void
  goToSlide: (index: number) => void
}

export function createKeyboardHandler(actions: KeyboardActions) {
  return function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }
    if (target.closest('.cm-editor')) {
      return
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault()
        actions.nextSlide()
        break
      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault()
        actions.prevSlide()
        break
      case 'Home':
        e.preventDefault()
        actions.firstSlide()
        break
      case 'End':
        e.preventDefault()
        actions.lastSlide()
        break
      case 'f':
      case 'F11':
        e.preventDefault()
        actions.toggleFullscreen()
        break
      case 'o':
        e.preventDefault()
        actions.toggleOverview()
        break
      case 'e':
        e.preventDefault()
        actions.toggleEditor()
        break
      case 'Escape':
        actions.escape()
        break
      default:
        if (/^[1-9]$/.test(e.key)) {
          e.preventDefault()
          actions.goToSlide(parseInt(e.key, 10) - 1)
        }
        break
    }
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run src/core/keyboard.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/keyboard.ts src/core/keyboard.test.ts
git commit -m "feat: add keyboard handler for slide navigation and view toggling"
```

---

## Task 11: Content Loader

**Files:**
- Create: `src/core/loader.ts`
- Create: `src/core/loader.test.ts`
- Create: `src/assets/slides.md`

**Step 1: Create the default bundled presentation**

Create `src/assets/slides.md` with a demo deck showcasing all features (titles, code with diff/focus, mermaid diagram, bullet points, tables, emojis). See design doc for the full default deck content.

**Step 2: Write the failing test**

Create `src/core/loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  STORAGE_KEY,
} from './loader'

beforeEach(() => {
  localStorage.clear()
})

describe('loader', () => {
  it('saveToLocalStorage stores markdown', () => {
    saveToLocalStorage('# Test')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('# Test')
  })

  it('loadFromLocalStorage returns stored markdown', () => {
    localStorage.setItem(STORAGE_KEY, '# Stored')
    expect(loadFromLocalStorage()).toBe('# Stored')
  })

  it('loadFromLocalStorage returns null if empty', () => {
    expect(loadFromLocalStorage()).toBeNull()
  })
})
```

**Step 3: Run test to verify failure**

```bash
npx vitest run src/core/loader.test.ts
```

**Step 4: Implement the loader**

Create `src/core/loader.ts`:

```typescript
import defaultSlides from '../assets/slides.md?raw'

export const STORAGE_KEY = 'dekk-slides'

export function saveToLocalStorage(markdown: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, markdown)
  } catch {
    // Storage full or unavailable
  }
}

export function loadFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export async function loadFromUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load: ${response.status}`)
  return response.text()
}

export function getDefaultSlides(): string {
  return defaultSlides
}

export async function loadMarkdown(): Promise<string> {
  const stored = loadFromLocalStorage()
  if (stored) return stored

  const hash = window.location.hash
  const urlMatch = hash.match(/[?&]url=([^&]+)/)
  if (urlMatch) {
    try {
      return await loadFromUrl(decodeURIComponent(urlMatch[1]))
    } catch {
      // Fall through to default
    }
  }

  return getDefaultSlides()
}
```

**Step 5: Run tests**

```bash
npx vitest run src/core/loader.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/core/loader.ts src/core/loader.test.ts src/assets/slides.md
git commit -m "feat: add content loader with localStorage, URL, and bundled default"
```

---

## Task 12: PresentationView

**Files:**
- Create: `src/views/PresentationView.tsx`
- Create: `src/components/SlideNavigation.tsx`
- Modify: `src/styles/slides.module.css`

**Step 1: Create SlideNavigation**

Create `src/components/SlideNavigation.tsx`:

```typescript
import styles from '../styles/slides.module.css'

interface SlideNavigationProps {
  currentIndex: number
  totalSlides: number
}

export function SlideNavigation({
  currentIndex,
  totalSlides,
}: SlideNavigationProps) {
  const progress = totalSlides > 1 ? currentIndex / (totalSlides - 1) : 0

  return (
    <>
      <div className={styles.slideCounter}>
        {currentIndex + 1} / {totalSlides}
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  )
}
```

**Step 2: Add navigation styles**

Append to `src/styles/slides.module.css`:

```css
.slideCounter {
  position: fixed;
  bottom: 20px;
  right: 24px;
  font-family: var(--mp-font-mono);
  font-size: var(--mp-counter-size);
  font-weight: 300;
  color: var(--mp-muted);
  z-index: 10;
}

.progressBar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.05);
  z-index: 10;
}

.progressFill {
  height: 100%;
  background: var(--mp-gradient);
  transition: width var(--mp-transition-duration) var(--mp-transition-ease);
}

.presentationView {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: var(--mp-bg);
}

.slideTransition {
  transition: opacity var(--mp-transition-duration) var(--mp-transition-ease),
              transform var(--mp-transition-duration) var(--mp-transition-ease);
}
```

**Step 3: Create PresentationView**

Create `src/views/PresentationView.tsx`:

```typescript
import { useSlides } from '../core/store'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import styles from '../styles/slides.module.css'

export function PresentationView() {
  const { slides, currentIndex } = useSlides()

  if (slides.length === 0) {
    return (
      <div className={styles.presentationView}>
        <SlideFrame>
          <p>No slides loaded. Press E to open the editor.</p>
        </SlideFrame>
      </div>
    )
  }

  const currentSlide = slides[currentIndex]

  return (
    <div className={styles.presentationView}>
      <SlideFrame
        className={styles.slideTransition}
        style={{
          backgroundColor: currentSlide.metadata.bg || undefined,
        }}
      >
        <SlideRenderer slide={currentSlide} />
      </SlideFrame>
      <SlideNavigation
        currentIndex={currentIndex}
        totalSlides={slides.length}
      />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/views/PresentationView.tsx src/components/SlideNavigation.tsx src/styles/slides.module.css
git commit -m "feat: add PresentationView with navigation, progress bar, transitions"
```

---

## Task 13: OverviewGrid View

**Files:**
- Create: `src/views/OverviewGrid.tsx`
- Create: `src/styles/overview.module.css`

**Step 1: Create styles**

Create `src/styles/overview.module.css`:

```css
.grid {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 40px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  background-color: var(--mp-bg);
}

.thumbnail {
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 200ms ease, transform 200ms ease,
    box-shadow 200ms ease;
}

.thumbnail:hover {
  border-color: var(--mp-primary);
  transform: scale(1.02);
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.2);
}

.thumbnailActive {
  border-color: var(--mp-primary);
  box-shadow: 0 0 0 1px var(--mp-primary);
}

.thumbnailNumber {
  position: absolute;
  top: 8px;
  left: 12px;
  font-family: var(--mp-font-mono);
  font-size: 13px;
  color: var(--mp-muted);
  z-index: 1;
}

.thumbnailInner {
  position: relative;
  width: 100%;
  height: 100%;
}
```

**Step 2: Create OverviewGrid**

Create `src/views/OverviewGrid.tsx`:

```typescript
import { useSlides } from '../core/store'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import styles from '../styles/overview.module.css'

interface OverviewGridProps {
  onSelectSlide: (index: number) => void
}

export function OverviewGrid({ onSelectSlide }: OverviewGridProps) {
  const { slides, currentIndex } = useSlides()

  return (
    <div className={styles.grid}>
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`${styles.thumbnail} ${
            i === currentIndex ? styles.thumbnailActive : ''
          }`}
          onClick={() => onSelectSlide(i)}
        >
          <div className={styles.thumbnailInner}>
            <span className={styles.thumbnailNumber}>{i + 1}</span>
            <SlideFrame>
              <SlideRenderer slide={slide} />
            </SlideFrame>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/views/OverviewGrid.tsx src/styles/overview.module.css
git commit -m "feat: add OverviewGrid view with slide thumbnails"
```

---

## Task 14: EditorView with CodeMirror

**Files:**
- Create: `src/views/EditorView.tsx`
- Create: `src/components/MarkdownEditor.tsx`
- Create: `src/styles/editor.module.css`

**Step 1: Create editor styles**

Create `src/styles/editor.module.css`:

```css
.editorView {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: var(--mp-bg);
}

.editorPane {
  width: 50%;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid rgba(107, 115, 148, 0.2);
}

.previewPane {
  width: 50%;
  height: 100%;
  overflow: hidden;
}

.editor {
  width: 100%;
  height: 100%;
}
```

**Step 2: Create MarkdownEditor**

Create `src/components/MarkdownEditor.tsx`:

```typescript
import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import styles from '../styles/editor.module.css'

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0B0D17',
      color: '#E8E8F0',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#6C5CE7',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '15px',
      lineHeight: '1.6',
      padding: '24px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(108, 92, 231, 0.05)',
    },
    '.cm-gutters': {
      backgroundColor: '#0B0D17',
      color: '#6B7394',
      border: 'none',
      paddingLeft: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(108, 92, 231, 0.1)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(108, 92, 231, 0.3)',
    },
    '.cm-cursor': {
      borderLeftColor: '#6C5CE7',
      borderLeftWidth: '2px',
    },
  },
  { dark: true }
)

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val)
    },
    [onChange]
  )

  return (
    <div className={styles.editor}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={[markdown(), editorTheme]}
        onChange={handleChange}
        theme="none"
      />
    </div>
  )
}
```

**Step 3: Create EditorView**

Create `src/views/EditorView.tsx`:

```typescript
import { useCallback, useState, useEffect } from 'react'
import { useSlides, useSlideDispatch } from '../core/store'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { SlideFrame } from '../components/SlideFrame'
import { SlideRenderer } from '../components/SlideRenderer'
import { SlideNavigation } from '../components/SlideNavigation'
import { saveToLocalStorage } from '../core/loader'
import styles from '../styles/editor.module.css'

export function EditorView() {
  const { rawMarkdown, slides, currentIndex } = useSlides()
  const dispatch = useSlideDispatch()
  const [localMarkdown, setLocalMarkdown] = useState(rawMarkdown)

  useEffect(() => {
    setLocalMarkdown(rawMarkdown)
  }, [rawMarkdown])

  const handleChange = useCallback(
    (value: string) => {
      setLocalMarkdown(value)
      dispatch({ type: 'SET_MARKDOWN', markdown: value })
      saveToLocalStorage(value)
    },
    [dispatch]
  )

  const currentSlide = slides[currentIndex]

  return (
    <div className={styles.editorView}>
      <div className={styles.editorPane}>
        <MarkdownEditor value={localMarkdown} onChange={handleChange} />
      </div>
      <div className={styles.previewPane}>
        {currentSlide ? (
          <SlideFrame>
            <SlideRenderer slide={currentSlide} />
          </SlideFrame>
        ) : (
          <SlideFrame>
            <p>Start typing markdown on the left...</p>
          </SlideFrame>
        )}
        {slides.length > 0 && (
          <SlideNavigation
            currentIndex={currentIndex}
            totalSlides={slides.length}
          />
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/views/EditorView.tsx src/components/MarkdownEditor.tsx src/styles/editor.module.css
git commit -m "feat: add EditorView with CodeMirror live editor and split-pane preview"
```

---

## Task 15: App Shell -- Router, Context Provider, Keyboard Wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Wire everything together in App.tsx**

Replace `src/App.tsx` with the full app shell that:
- Creates the slide reducer and wraps with context providers
- Loads markdown on mount via the loader
- Sets up hash-based routing between views (presentation/editor/overview)
- Wires the keyboard handler to dispatch slide actions
- Handles file drop events
- Updates the URL hash on navigation

See the design doc for the full `App.tsx` implementation. Key structure:

```typescript
export default function App() {
  const [state, dispatch] = useReducer(slideReducer, initialState)
  const [view, setView] = useState<View>(getInitialView)
  // ... load markdown, setup keyboard, file drop, hash routing
  return (
    <SlideContext.Provider value={state}>
      <SlideDispatchContext.Provider value={dispatch}>
        {view === 'presentation' && <PresentationView />}
        {view === 'editor' && <EditorView />}
        {view === 'overview' && <OverviewGrid onSelectSlide={...} />}
      </SlideDispatchContext.Provider>
    </SlideContext.Provider>
  )
}
```

**Step 2: Verify the full app runs**

```bash
npm run dev
```

Verify in browser: slides render, keyboard nav works, E/O toggle views, F for fullscreen.

**Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire App shell with router, context, keyboard nav, file drop"
```

---

## Task 16: Polish and Final Integration Testing

**Step 1: Manual smoke test**

Run `npm run dev` and verify all features from the design doc checklist:
- Branded typography with gradient underline on h1
- Shiki syntax highlighting with diff/focus/line highlight
- Mermaid diagrams with brand colors
- Emoji rendering
- GFM tables
- Keyboard navigation (all keys)
- Overview grid
- Editor with live preview
- File drop
- localStorage persistence
- Progress bar and counter
- Fullscreen mode
- Slide transitions

**Step 2: Production build**

```bash
npm run build
npx serve dist
```

Verify the static build works correctly.

**Step 3: Fix any issues found**

Address visual or functional issues discovered during smoke testing.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: polish visual details and integration issues"
```

---

## Summary of Tasks

| # | Task | Key Deliverables |
|---|------|-----------------|
| 1 | Project Scaffolding | Vite + React + TS, all deps, vitest configured |
| 2 | CSS Foundation | Brand variables, global reset, fonts |
| 3 | remark-slides Plugin | Custom plugin: split AST on --- with metadata |
| 4 | Markdown Parser | Unified pipeline with GFM, emoji, slide splitting |
| 5 | Slide Store | React Context + useReducer, navigation actions |
| 6 | SlideFrame | 16:9 viewport with responsive CSS scaling |
| 7 | SlideRenderer | Custom components: titles, bullets, images, code |
| 8 | Shiki Integration | Code highlighting with diff, focus, line highlight |
| 9 | MermaidDiagram | Lazy client-side diagrams with brand theme |
| 10 | Keyboard Manager | Global hotkey handler for all navigation |
| 11 | Content Loader | localStorage, URL param, bundled default, file drop |
| 12 | PresentationView | Fullscreen slide display with navigation UI |
| 13 | OverviewGrid | Thumbnail grid for slide jumping |
| 14 | EditorView | CodeMirror split-pane with live preview |
| 15 | App Shell | Router, context wiring, keyboard, file drop |
| 16 | Polish | Smoke testing, production build, bug fixes |
