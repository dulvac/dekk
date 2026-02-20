# Marko Pollo - Design Document

**Date:** 2026-02-20
**Status:** Approved

## Overview

Marko Pollo is a static single-page web application for presenting beautiful-looking slides authored in markdown. It targets developer talks at tech conferences, meetups, and internal engineering presentations. The app provides a highly branded, dark, cinematic visual identity with custom rendering of every markdown element.

## Requirements

### Core Features
- Single `.md` file with `---` separators as the slide format
- In-browser live editor with split-pane preview
- Custom branded rendering of titles, subtitles, bullet points, code blocks
- Syntax highlighting with line focus, diffs, and line highlighting
- Mermaid diagram rendering
- Emoji shortcode support (`:rocket:` etc.)
- GFM support (tables, strikethrough, task lists)
- Responsive images

### Presentation Features
- Keyboard navigation (arrows, space, page up/down)
- Fullscreen mode
- Overview grid (thumbnail view of all slides)
- Subtle slide transitions (horizontal slide + opacity fade)
- Progress bar and slide counter

### Non-Goals
- No export (PDF, PPTX, etc.) — the web app is the delivery format
- No presenter notes / dual-screen presenter mode
- No rich animations (per-element fly-in, etc.)
- No light mode — dark is the brand identity
- No backend / user accounts / cloud storage

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Build | Vite + React 18 + TypeScript | Fast HMR, mature ecosystem, strong typing |
| Markdown pipeline | unified -> remark-parse -> remark-rehype -> react-markdown | Most extensible AST pipeline; custom components per element |
| Code highlighting | Shiki (@shikijs/rehype + @shikijs/transformers) | VS Code-grade highlighting; built-in diff, focus, line highlight |
| Diagrams | Mermaid.js v11 (client-side, startOnLoad: false) | 20+ diagram types; lazy render per slide; themeable |
| Emojis | remark-emoji | Converts :emoji: shortcodes to unicode |
| GFM | remark-gfm | Tables, strikethrough, task lists, autolinks |
| Live editor | CodeMirror 6 (@uiw/react-codemirror + @codemirror/lang-markdown) | Smaller bundle than Monaco (~400KB vs ~3MB), better mobile support |
| Styling | CSS Modules + CSS custom properties | Scoped styles, no runtime overhead, brand variables |
| Transitions | CSS transitions + View Transitions API (with fallback) | Subtle, performant slide transitions without a library |

### Key Lessons from Existing Frameworks
- **From Slidev:** Vite-based build, frontmatter per slide, progressive complexity
- **From Marp/Marpit:** `---` delimiter, CSS-scoped theming per slide section, forgiving parser
- **From reveal.js:** Keyboard nav patterns (arrows, space, ESC for overview, F for fullscreen), fixed aspect ratio scaling
- **From MDX Deck:** React component mapping for custom rendering

## Architecture

### Views

| View | Route | Description |
|------|-------|-------------|
| PresentationView | `/#/{n}` | Fullscreen slide display. One slide at a time. Keyboard nav. |
| EditorView | `/#/edit` | Split pane: CodeMirror left, live slide preview right. |
| OverviewGrid | `/#/overview` | Thumbnail grid. Click to jump to any slide. |

### Component Tree

```
App
├── Router (hash-based)
│   ├── PresentationView
│   │   ├── SlideFrame (16:9 viewport with CSS scale)
│   │   │   └── SlideRenderer
│   │   │       ├── TitleBlock (branded h1/h2)
│   │   │       ├── BulletList (custom bullets)
│   │   │       ├── CodeBlock (Shiki-highlighted)
│   │   │       ├── MermaidDiagram (lazy-rendered)
│   │   │       ├── ImageBlock (responsive)
│   │   │       └── TextBlock (paragraphs, emphasis, links)
│   │   └── SlideNavigation
│   │       ├── ProgressBar
│   │       ├── SlideCounter
│   │       └── NavigationHints
│   ├── EditorView
│   │   ├── MarkdownEditor (CodeMirror)
│   │   └── SlideFrame (preview)
│   └── OverviewGrid
│       └── SlideFrame[] (thumbnails)
└── Core Services
    ├── MarkdownParser (unified pipeline)
    ├── SlideStore (React context + useReducer)
    └── KeyboardManager (global hotkeys)
```

### Data Flow

```
Markdown string
    |
    v
MarkdownParser (unified pipeline)
    |  remark-parse -> remark-gfm -> remark-emoji
    |  -> remark-slides (custom: split on ---)
    |  -> remark-rehype -> rehype-shiki
    |  -> react-markdown with custom components
    |
    v
Slide[] array (each slide = parsed AST subtree)
    |
    v
SlideStore (context): slides[], currentIndex, rawMarkdown
    |
    v
SlideRenderer (renders slides[currentIndex])
```

### State Management

React Context + `useReducer`. No external state library.

**State shape:**
```typescript
interface SlideState {
  rawMarkdown: string
  slides: SlideData[]
  currentIndex: number
}

interface SlideData {
  ast: Node          // parsed AST subtree for this slide
  metadata: {        // per-slide frontmatter / HTML comment directives
    bg?: string
    class?: string
    layout?: 'default' | 'center'
    transition?: 'fade' | 'slide' | 'none'
  }
}
```

**Actions:** `SET_MARKDOWN`, `NEXT_SLIDE`, `PREV_SLIDE`, `GO_TO_SLIDE`

### Markdown Parsing Pipeline

The unified pipeline is configured once and reused:

```
unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkEmoji)
  .use(remarkSlides)          // custom: split on thematicBreak (---)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeShiki, {
    theme: 'custom-marko-pollo',
    transformers: [
      transformerNotationDiff(),
      transformerNotationHighlight(),
      transformerNotationFocus(),
      transformerNotationErrorLevel(),
      transformerMetaHighlight()
    ]
  })
```

Rendering is handled by `react-markdown` with a `components` map that routes each HTML element to a custom React component (TitleBlock, BulletList, CodeBlock, etc.).

### Custom remark-slides Plugin

Walks the AST, finds `thematicBreak` nodes, and splits the tree:

1. Iterate over `tree.children`
2. On each `thematicBreak`, close current slide, start new one
3. Extract HTML comment directives (`<!-- key: value -->`) from the first node of each slide
4. Output: array of slide subtrees with metadata

## Markdown Format Specification

### Deck Structure

```markdown
---
title: My Talk Title
author: Jane Dev
---

# Slide 1 Title

Content here.

---

# Slide 2 Title

More content.

---
```

### Supported Syntax

| Feature | Syntax | Notes |
|---------|--------|-------|
| Slide separator | `---` | Horizontal rule, tolerant of surrounding blank lines |
| Deck metadata | YAML frontmatter at top | title, author, date, aspectRatio |
| Per-slide metadata | `<!-- key: value -->` at start of slide | bg, class, layout, transition |
| Titles | `# H1` | Branded large typography with gradient underline |
| Subtitles | `## H2` | Smaller, muted color |
| Code blocks | Triple backtick + language | Shiki highlighting with transformers |
| Code diff | `// [!code ++]` / `// [!code --]` | Green/red diff highlighting |
| Code focus | `// [!code focus]` | Dims all other lines |
| Line highlight | ` ```ts {1,3-5} ` | Highlights specific lines via meta string |
| Mermaid | ` ```mermaid ` | Client-side rendered diagram |
| Emojis | `:name:` | Converted to unicode |
| Images | `![alt](url)` | Responsive, centered in slide |
| Tables | GFM pipe tables | Branded styling |
| Lists | `- item` or `1. item` | Custom bullet styling |

### Per-Slide Metadata

HTML comments at the start of a slide section:

- `<!-- bg: #hex -->` or `<!-- bg: url(image.jpg) -->` — custom background
- `<!-- class: classname -->` — add CSS class
- `<!-- layout: center -->` — override content alignment
- `<!-- transition: fade | slide | none -->` — per-slide transition

## Visual Identity

### Design Philosophy

Dark, cinematic, developer-native. Slides should feel like a polished keynote at a top-tier tech conference.

### Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background | #0B0D17 | Page/app background |
| Surface | #141829 | Slide background |
| Primary | #6C5CE7 | Accent, titles, highlights |
| Secondary | #00CEC9 | Links, secondary accents |
| Text | #E8E8F0 | Body text |
| Muted | #6B7394 | Subtitles, metadata |
| Success | #00E676 | Code diff additions |
| Danger | #FF5252 | Code diff removals |
| Code BG | #1A1E2E | Code block background |

### Typography

| Role | Font | Weight | Size (at 1920x1080) |
|------|------|--------|---------------------|
| Slide title (h1) | Inter | 700 | 72px |
| Subtitle (h2) | Inter | 500 | 44px |
| Body text | Inter | 400 | 28px |
| Bullet points | Inter | 400 | 26px |
| Code blocks | JetBrains Mono | 400 | 22px |
| Inline code | JetBrains Mono | 400 | 24px |
| Slide counter | JetBrains Mono | 300 | 16px |

### Distinctive Visual Elements

- **Title accent:** Short gradient underline (purple -> teal) beneath h1 titles
- **Bullet points:** Small filled circles in primary purple with subtle glow; left border accent that fades vertically
- **Code blocks:** Rounded corners (12px), subtle box shadow, thin top border in primary gradient, language label top-right
- **Mermaid diagrams:** Base theme with brand purple/teal overrides
- **Images:** Rounded corners (8px), soft drop shadow
- **Progress bar:** 3px gradient bar (purple -> teal) at bottom of screen
- **Slide transitions:** Horizontal slide + opacity fade (200ms ease-out)

### Editor View

- Same dark palette with custom CodeMirror theme
- Markdown syntax highlighting uses muted brand colors (purple for headings, teal for links)
- Thin vertical divider between editor and preview

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Right / Space / PageDown | Next slide |
| Left / Backspace / PageUp | Previous slide |
| Home | First slide |
| End | Last slide |
| F / F11 | Toggle fullscreen |
| O | Toggle overview grid |
| E | Toggle editor view |
| Escape | Exit fullscreen / overview / back to presentation |
| 1-9 | Jump to slide 1-9 |
| G + number + Enter | Go to any slide number |

## Content Loading

Priority order (highest wins):

1. **Editor / file drop** — user edits or drops a .md file
2. **URL param** — `/#/?url=https://example.com/slides.md`
3. **Bundled default** — `src/assets/slides.md` imported via Vite `?raw`

Current markdown persisted to `localStorage` so refreshing preserves editor changes.

## Slide Viewport

Fixed 16:9 aspect ratio (1920x1080 logical pixels). Scaled to fit the browser viewport using CSS `transform: scale()`. Content is authored at the logical resolution and the frame handles responsive scaling.

## Project Structure

```
marko-pollo/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── fonts/                      (Inter + JetBrains Mono)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── views/
│   │   ├── PresentationView.tsx
│   │   ├── EditorView.tsx
│   │   └── OverviewGrid.tsx
│   ├── components/
│   │   ├── SlideRenderer.tsx
│   │   ├── SlideFrame.tsx
│   │   ├── SlideNavigation.tsx
│   │   ├── TitleBlock.tsx
│   │   ├── BulletList.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── MermaidDiagram.tsx
│   │   ├── ImageBlock.tsx
│   │   └── MarkdownEditor.tsx
│   ├── core/
│   │   ├── parser.ts
│   │   ├── plugins/
│   │   │   └── remark-slides.ts
│   │   ├── store.ts
│   │   ├── keyboard.ts
│   │   └── loader.ts
│   ├── styles/
│   │   ├── variables.css
│   │   ├── global.css
│   │   ├── slides.module.css
│   │   ├── code.module.css
│   │   ├── editor.module.css
│   │   └── overview.module.css
│   └── assets/
│       └── slides.md
└── docs/
    └── plans/
```

## Dependencies

### Production
```
react, react-dom
react-markdown
unified, remark-parse, remark-rehype, remark-gfm, remark-emoji
rehype-raw
shiki, @shikijs/rehype, @shikijs/transformers
mermaid
@uiw/react-codemirror, @codemirror/lang-markdown, @codemirror/view, @codemirror/state
```

### Development
```
vite
typescript
@types/react, @types/react-dom
```
