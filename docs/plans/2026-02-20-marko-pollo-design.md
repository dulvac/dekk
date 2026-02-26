# Marko Pollo - Design Document

**Date:** 2026-02-20
**Updated:** 2026-02-21 (post-cohesive implementation)
**Status:** Approved

## Overview

Marko Pollo is a static single-page web application for presenting beautiful-looking slides authored in markdown. It targets developer talks at tech conferences, meetups, and internal engineering presentations. The app provides a highly branded, dark, cinematic visual identity with custom rendering of every markdown element.

## Requirements

### Core Features
- Multiple presentation decks in `presentations/*/slides.md`, discovered at build time
- Single `.md` file per deck with `---` separators as the slide format
- In-browser live editor with split-pane preview
- Custom branded rendering of titles, subtitles, bullet points, code blocks
- Syntax highlighting with line focus, diffs, and line highlighting
- Mermaid diagram rendering
- Emoji shortcode support (`:rocket:` etc.)
- GFM support (tables, strikethrough, task lists)
- Responsive images

### Presentation Features
- Deck picker landing page (browse all available presentations)
- Keyboard navigation (arrows, space, page up/down)
- Fullscreen mode
- Overview grid (thumbnail view of all slides)
- Subtle slide transitions (horizontal slide + opacity fade)
- Progress bar and slide counter

### Editor Features
- Markdown file export via Ctrl+S / Cmd+S (File System Access API with download fallback)
- Export button in editor toolbar
- Environment-aware persistence:
  - **Dev server:** Direct file write via Vite plugin (`/__marko-pollo/write-file`)
  - **GitHub Pages:** GitHub API flow — creates branch, updates file, opens pull request
  - **Unknown:** Falls back to file download
- GitHub Personal Access Token authentication (session or local storage)

### Non-Goals
- No PDF/PPTX export — the web app is the delivery format; markdown source export is supported
- No presenter notes / dual-screen presenter mode
- No rich animations (per-element fly-in, etc.)
- No light mode — dark is the brand identity
- No user accounts — GitHub PAT is optional and stored client-side only

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Build | Vite 6 + React 19 + TypeScript | Fast HMR, mature ecosystem, strong typing |
| Markdown pipeline | unified -> remark-parse -> remark-rehype -> react-markdown | Most extensible AST pipeline; custom components per element |
| Code highlighting | Shiki (@shikijs/transformers) | VS Code-grade highlighting; built-in diff, focus, line highlight |
| Diagrams | Mermaid.js v11 (client-side, startOnLoad: false) | 20+ diagram types; lazy render per slide; themeable |
| Emojis | remark-emoji | Converts :emoji: shortcodes to unicode |
| GFM | remark-gfm | Tables, strikethrough, task lists, autolinks |
| Sanitization | rehype-sanitize | XSS protection for rendered markdown |
| Live editor | CodeMirror 6 (@uiw/react-codemirror + @codemirror/lang-markdown) | Smaller bundle than Monaco (~400KB vs ~3MB), better mobile support |
| Styling | CSS Modules + CSS custom properties | Scoped styles, no runtime overhead, brand variables |
| Transitions | CSS transitions + View Transitions API (with fallback) | Subtle, performant slide transitions without a library |
| Persistence | Vite dev plugin + GitHub REST API + File System Access API | Environment-aware save; dev writes to disk, prod creates PRs |
| Testing | Vitest + @testing-library/react + Playwright | Unit, component, and E2E testing |
| CI/CD | GitHub Actions | Build, test, deploy to GitHub Pages on push to main |

### Key Lessons from Existing Frameworks
- **From Slidev:** Vite-based build, frontmatter per slide, progressive complexity
- **From Marp/Marpit:** `---` delimiter, CSS-scoped theming per slide section, forgiving parser
- **From reveal.js:** Keyboard nav patterns (arrows, space, ESC for overview, F for fullscreen), fixed aspect ratio scaling
- **From MDX Deck:** React component mapping for custom rendering

## Architecture

### Views

| View | Route | Description |
|------|-------|-------------|
| PickerView | `#/` (root) | Deck picker landing page. Cards for each presentation. |
| PresentationView | `#deck/{id}/{n}` | Fullscreen slide display. One slide at a time. Keyboard nav. |
| EditorView | `#deck/{id}/editor` | Split pane: CodeMirror left, live slide preview right. Save button with persistence. |
| OverviewGrid | `#deck/{id}/overview` | Thumbnail grid. Click to jump to any slide. |

Routing is deck-scoped: every view (except the picker) operates on a specific deck identified by `{id}`. The `Route` type is a discriminated union parsed from `window.location.hash` by the `useRoute` hook in `src/core/route.ts`.

### Component Tree

```
App (ErrorBoundary wrapper)
├── useRoute (hash-based deck-scoped routing)
├── SlideContext / SlideDispatchContext providers
│
├── PickerView (lazy)
│   └── DeckCard[] (button per presentation)
│
├── PresentationView (lazy)
│   ├── SlideFrame (16:9 viewport with CSS scale)
│   │   └── ErrorBoundary
│   │       └── SlideRenderer
│   │           ├── TitleBlock (branded h1)
│   │           ├── SubtitleBlock (branded h2)
│   │           ├── BulletList (custom ul/ol/li)
│   │           ├── CodeBlock (Shiki-highlighted, async)
│   │           ├── MermaidDiagram (lazy-rendered)
│   │           ├── ImageBlock (responsive)
│   │           ├── TableBlock (branded GFM tables)
│   │           └── TextBlock (paragraphs, emphasis, links, strikethrough)
│   └── SlideNavigation
│       ├── ProgressBar (gradient, ARIA progressbar)
│       └── SlideCounter
│
├── EditorView (lazy)
│   ├── Toolbar
│   │   └── SaveButton (idle | saving | saved | error | pr-created)
│   ├── MarkdownEditor (CodeMirror 6, lazy)
│   ├── SlideFrame (live preview)
│   └── GitHubAuthModal (shown when GitHub auth needed)
│
└── OverviewGrid (lazy)
    └── SlideFrame[] (memoized thumbnails)

Core Services
├── DeckRegistry (build-time glob → DeckEntry[])
├── Route (hashToRoute / routeToHash / useRoute hook)
├── MarkdownParser (unified pipeline)
├── SlideStore (React Context + useReducer)
├── Loader (per-deck localStorage + registry fallback)
├── Exporter (File System Access API + download fallback)
├── Persistence (environment detection + dev/GitHub/download save flows)
├── TokenStore (GitHub PAT in session/localStorage)
├── GitHubAPI (typed fetch wrappers for GitHub REST API)
├── KeyboardManager (global hotkeys)
└── Highlighter (Shiki singleton with transformers)
```

### Data Flow

```
[App mount / route change]
    |
    v
useRoute() parses window.location.hash → Route
    |
    ├── { view: 'picker' } → render PickerView (shows deckRegistry)
    |
    └── { view: *, deckId } → loadDeck(deckId)
            |
            ├── localStorage draft (marko-pollo-deck-{id}) if present
            └── deckRegistry entry (build-time bundled markdown)
                    |
                    v
            dispatch({ type: 'LOAD_DECK', deckId, markdown })
                    |
                    v
            MarkdownParser (unified pipeline)
                |  remark-parse -> remark-gfm -> remark-emoji
                |  -> remark-slides (custom: split on ---)
                |  -> remark-rehype -> rehype-sanitize
                |  -> react-markdown with custom components
                |
                v
            Slide[] array (each slide = parsed markdown subtree)
                |
                v
            SlideStore (context): slides[], currentIndex, rawMarkdown, currentDeck
                |
                v
            SlideRenderer (renders slides[currentIndex])

[Save flow (Ctrl+S or Save button)]
    |
    v
detectEnvironment() → 'dev' | 'github-pages' | 'unknown'
    |
    ├── dev → POST /__marko-pollo/write-file (Vite plugin writes to disk)
    ├── github-pages → GitHub API (branch → update file → open PR)
    └── unknown → exportMarkdown() (File System Access API / download fallback)
```

### State Management

React Context + `useReducer`. No external state library. Two contexts: `SlideContext` (state) and `SlideDispatchContext` (dispatch). Hooks: `useSlides()`, `useSlideDispatch()`.

**State shape:**
```typescript
interface SlideState {
  rawMarkdown: string
  slides: SlideData[]
  deckMetadata: DeckMetadata
  currentIndex: number
  currentDeck: string | null    // active deck ID, null when at picker
}

interface DeckMetadata {
  title?: string
  author?: string
}

interface SlideData {
  content: string     // raw markdown for this slide section
  metadata: {         // per-slide HTML comment directives
    bg?: string
    class?: string
    layout?: 'default' | 'center'
    transition?: 'fade' | 'slide' | 'none'
  }
}
```

**Actions:** `SET_MARKDOWN`, `LOAD_DECK`, `UNLOAD_DECK`, `NEXT_SLIDE`, `PREV_SLIDE`, `GO_TO_SLIDE`

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

Rendering is handled by `react-markdown` with a `components` map that routes each HTML element to a custom React component (TitleBlock, BulletList, CodeBlock, TableBlock, etc.). Code highlighting is performed asynchronously by a shared Shiki singleton (`src/core/highlighter.ts`) rather than as a rehype plugin, allowing non-blocking rendering.

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
| Ctrl+S / Cmd+S | Export/save markdown (global — works from all views including editor) |

## Content Loading

### Deck Discovery

Presentations live in `presentations/*/slides.md`. Vite's `import.meta.glob` discovers all decks at build time and bundles them into a `deckRegistry` (array of `DeckEntry` objects with id, title, author, slideCount, rawMarkdown).

### Per-Deck Loading Priority (highest wins)

1. **Editor / file drop** — user edits in the editor or drops a `.md` file
2. **localStorage draft** — per-deck key `marko-pollo-deck-{id}` preserves editor changes across refreshes
3. **Registry entry** — build-time bundled markdown from `presentations/{id}/slides.md`

### Legacy Migration

On first load, `migrateOldStorage()` moves the old single-deck key (`marko-pollo-slides`) to `marko-pollo-deck-default`.

## Slide Viewport

Fixed 16:9 aspect ratio (1920x1080 logical pixels). Scaled to fit the browser viewport using CSS `transform: scale()`. Content is authored at the logical resolution and the frame handles responsive scaling.

## Project Structure

```
marko-pollo/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vite-plugin-dev-write.ts          (Vite dev server file-write plugin)
├── playwright.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml                    (build + test + GitHub Pages deploy)
├── presentations/                    (deck content — each subfolder = one deck)
│   ├── default/slides.md
│   ├── intro-to-typescript/slides.md
│   ├── architecture-patterns/slides.md
│   └── getting-started/slides.md
├── e2e/
│   └── app.spec.ts                   (Playwright E2E tests)
├── public/
│   └── fonts/                        (Inter + JetBrains Mono)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── test-setup.ts
│   ├── integration.test.tsx
│   ├── views/
│   │   ├── PickerView.tsx            (deck selection landing page)
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
│   │   ├── TableBlock.tsx            (branded GFM table components)
│   │   ├── MarkdownEditor.tsx
│   │   ├── SaveButton.tsx            (multi-state save indicator)
│   │   ├── GitHubAuthModal.tsx       (GitHub PAT input modal)
│   │   └── ErrorBoundary.tsx         (error boundary with fallback UI)
│   ├── core/
│   │   ├── parser.ts
│   │   ├── plugins/
│   │   │   └── remark-slides.ts
│   │   ├── store.ts                  (SlideContext + useReducer)
│   │   ├── route.ts                  (Route type + useRoute hook)
│   │   ├── deckRegistry.ts           (build-time deck discovery)
│   │   ├── loader.ts                 (per-deck loading + localStorage)
│   │   ├── exporter.ts              (file download + File System Access API)
│   │   ├── persistence.ts           (environment detection + save flows)
│   │   ├── github-api.ts            (GitHub REST API typed wrappers)
│   │   ├── token-store.ts           (GitHub PAT session/localStorage)
│   │   ├── highlighter.ts           (shared Shiki instance)
│   │   ├── keyboard.ts
│   │   └── hooks.ts                 (useFileDrop)
│   └── styles/
│       ├── variables.css
│       ├── global.css
│       ├── slides.module.css
│       ├── code.module.css
│       ├── editor.module.css
│       ├── overview.module.css
│       ├── picker.module.css
│       └── modal.module.css
└── docs/
    └── plans/
```

## Dependencies

### Production
```
react (19.1), react-dom
react-markdown (10.x)
unified, remark-parse, remark-rehype, remark-gfm, remark-emoji
rehype-sanitize
shiki, @shikijs/transformers
mermaid (11.x)
@uiw/react-codemirror, @codemirror/lang-markdown, @codemirror/view, @codemirror/state
```

### Development
```
vite (6.x), @vitejs/plugin-react
typescript (~5.8)
vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
@playwright/test
@types/react, @types/react-dom
```

### Build-Time Code Splitting

Vite is configured to split large vendor bundles:
- `vendor-mermaid` — Mermaid.js (lazy-loaded)
- `vendor-shiki` — Shiki + transformers
- `vendor-codemirror` — CodeMirror packages
