# Marko Pollo Feature Suite — Cohesive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship four interconnected features — GitHub Pages deployment, multi-presentation folders, file export, and editor persistence — in a dependency-aware order that avoids rework.

**Architecture:** Multi-presentation folders is the architectural foundation (new routing, per-deck state, presentations directory). All other features build on it. Deploy is CI-only and ships first. File export is standalone but gains deck context. Editor persistence depends on both the folder structure and the export module.

**Tech Stack:** Vite 6 + React 19 + TypeScript, GitHub Actions, Vitest + Testing Library + Playwright, GitHub REST API (direct fetch)

**Implementation order:** Deploy → Multi-Presentation → File Export → Editor Persistence

---

## Phase 1: GitHub Pages Auto-Deploy

CI-only changes. No application code modified.

---

### Task 1.1: Add Playwright E2E to CI pipeline

**Files:**
- Modify: `.github/workflows/ci.yml:36` (after `npx vitest run`)

**Step 1: Add Playwright steps to build-and-test job**

Add after the existing `Run tests` step in `ci.yml`:

```yaml
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test
```

**Step 2: Verify locally**

Run: `npx playwright test`
Expected: 5 tests pass

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Playwright E2E tests to build-and-test job"
```

---

### Task 1.2: Add deploy job to CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml` (append deploy job after build-and-test)

**Step 1: Add the deploy job**

Append to `ci.yml` after the `build-and-test` job:

```yaml
  deploy:
    needs: build-and-test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for GitHub Pages
        run: npm run build -- --base /marko-pollo/

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Verify YAML is valid**

Run: `cat .github/workflows/ci.yml | python3 -c "import yaml, sys; yaml.safe_load(sys.stdin)"`
Expected: No error

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Pages deploy job gated on CI success"
```

**Note:** After pushing to main, manually set GitHub repo Settings → Pages → Source to "GitHub Actions" (one-time).

---

## Phase 2: Multi-Presentation Folders

The architectural foundation. New routing, deck registry, per-deck state, PickerView. All existing E2E tests will be updated in Task 2.10.

---

### Task 2.1: Create presentations directory and move default slides

**Files:**
- Create: `presentations/default/slides.md` (copy from `src/assets/slides.md`)
- Delete: `src/assets/slides.md`

**Step 1: Create the presentations directory and move the file**

```bash
mkdir -p presentations/default
cp src/assets/slides.md presentations/default/slides.md
rm src/assets/slides.md
```

**Step 2: Verify the build still works (it won't — the import in loader.ts will fail)**

This is expected. Task 2.2 will fix the import.

**Step 3: Commit the file move only**

```bash
git add presentations/default/slides.md
git rm src/assets/slides.md
git commit -m "refactor: move default slides to presentations/default/slides.md"
```

---

### Task 2.1b: Add example presentation decks

**Files:**
- Create: `presentations/intro-to-typescript/slides.md`
- Create: `presentations/architecture-patterns/slides.md`
- Create: `presentations/getting-started/slides.md`

**Step 1: Create example presentations**

Create 3 example decks that showcase different Marko Pollo features. Each should use frontmatter with `title` and `author`, and exercise features like code blocks, Mermaid diagrams, tables, task lists, and emoji.

**`presentations/intro-to-typescript/slides.md`** — A short tech talk (5-6 slides) about TypeScript basics. Exercises: code blocks with `typescript` language, bullet lists, bold/italic.

**`presentations/architecture-patterns/slides.md`** — A software architecture talk (5-6 slides). Exercises: Mermaid diagrams (flowchart, sequence), tables, nested lists.

**`presentations/getting-started/slides.md`** — A Marko Pollo tutorial deck (4-5 slides) explaining how to use the app. Exercises: keyboard shortcut reference, task lists, emoji.

**Step 2: Verify all decks parse correctly**

Run: `node -e "const fs = require('fs'); const dirs = fs.readdirSync('presentations'); console.log(dirs)"`
Expected: `['architecture-patterns', 'default', 'getting-started', 'intro-to-typescript']`

**Step 3: Commit**

```bash
git add presentations/
git commit -m "content: add 3 example presentation decks"
```

---

### Task 2.2: Create deck registry module

**Files:**
- Create: `src/core/deckRegistry.ts`
- Create: `src/core/deckRegistry.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/core/deckRegistry.test.ts
import { describe, it, expect } from 'vitest'
import { buildRegistry, type DeckEntry } from './deckRegistry'

describe('buildRegistry', () => {
  const mockFiles: Record<string, string> = {
    '/presentations/my-talk/slides.md': '---\ntitle: My Talk\nauthor: Jane\n---\n# Slide 1\n---\n# Slide 2',
    '/presentations/demo/slides.md': '# Just One Slide',
  }

  it('creates entries for each file', () => {
    const entries = buildRegistry(mockFiles)
    expect(entries).toHaveLength(2)
  })

  it('extracts deck id from path', () => {
    const entries = buildRegistry(mockFiles)
    expect(entries.map(e => e.id)).toContain('my-talk')
    expect(entries.map(e => e.id)).toContain('demo')
  })

  it('extracts title from frontmatter', () => {
    const entries = buildRegistry(mockFiles)
    const myTalk = entries.find(e => e.id === 'my-talk')!
    expect(myTalk.title).toBe('My Talk')
    expect(myTalk.author).toBe('Jane')
  })

  it('falls back to id for title when no frontmatter', () => {
    const entries = buildRegistry(mockFiles)
    const demo = entries.find(e => e.id === 'demo')!
    expect(demo.title).toBe('demo')
  })

  it('counts slides correctly', () => {
    const entries = buildRegistry(mockFiles)
    expect(entries.find(e => e.id === 'my-talk')!.slideCount).toBe(2)
    expect(entries.find(e => e.id === 'demo')!.slideCount).toBe(1)
  })

  it('returns empty array for empty input', () => {
    expect(buildRegistry({})).toEqual([])
  })
})

describe('getDeck', () => {
  it('returns undefined for unknown id', () => {
    // getDeck is tested via the actual registry — import in integration test
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/deckRegistry.test.ts`
Expected: FAIL — module not found

**Step 3: Implement deckRegistry.ts**

```typescript
// src/core/deckRegistry.ts
export interface DeckEntry {
  id: string
  title: string
  author?: string
  slideCount: number
  rawMarkdown: string
}

function extractTitle(markdown: string): { title?: string; author?: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return {}
  const result: { title?: string; author?: string } = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key === 'title') result.title = value
    if (key === 'author') result.author = value
  }
  return result
}

function countSlides(markdown: string): number {
  // Remove frontmatter before counting
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '')
  if (!body.trim()) return 0
  return body.split(/\n---\n/).length
}

export function buildRegistry(files: Record<string, string>): DeckEntry[] {
  return Object.entries(files)
    .map(([filePath, rawMarkdown]) => {
      const match = filePath.match(/\/presentations\/([^/]+)\/slides\.md$/)
      if (!match) return null
      const id = match[1]
      const { title, author } = extractTitle(rawMarkdown)
      return {
        id,
        title: title || id,
        author,
        slideCount: countSlides(rawMarkdown),
        rawMarkdown,
      }
    })
    .filter((entry): entry is DeckEntry => entry !== null)
    .sort((a, b) => a.id.localeCompare(b.id))
}

// Build-time glob — Vite resolves this at compile time
const markdownFiles = import.meta.glob<string>(
  '/presentations/*/slides.md',
  { eager: true, query: '?raw', import: 'default' }
)

export const deckRegistry: DeckEntry[] = buildRegistry(markdownFiles as Record<string, string>)

export function getDeck(id: string): DeckEntry | undefined {
  return deckRegistry.find(entry => entry.id === id)
}
```

**Step 4: Run tests**

Run: `npx vitest run src/core/deckRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/deckRegistry.ts src/core/deckRegistry.test.ts
git commit -m "feat: add deck registry with build-time presentation discovery"
```

---

### Task 2.3: Create route module (hashToRoute / routeToHash)

**Files:**
- Create: `src/core/route.ts`
- Create: `src/core/route.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/core/route.test.ts
import { describe, it, expect } from 'vitest'
import { hashToRoute, routeToHash, type Route } from './route'

describe('hashToRoute', () => {
  it('empty hash → picker', () => {
    expect(hashToRoute('')).toEqual({ view: 'picker' })
  })

  it('#/ → picker', () => {
    expect(hashToRoute('#/')).toEqual({ view: 'picker' })
  })

  it('#deck/my-talk → presentation slide 0', () => {
    expect(hashToRoute('#deck/my-talk')).toEqual({
      view: 'presentation', deckId: 'my-talk', slideIndex: 0,
    })
  })

  it('#deck/my-talk/3 → presentation slide 3', () => {
    expect(hashToRoute('#deck/my-talk/3')).toEqual({
      view: 'presentation', deckId: 'my-talk', slideIndex: 3,
    })
  })

  it('#deck/my-talk/editor → editor', () => {
    expect(hashToRoute('#deck/my-talk/editor')).toEqual({
      view: 'editor', deckId: 'my-talk',
    })
  })

  it('#deck/my-talk/overview → overview', () => {
    expect(hashToRoute('#deck/my-talk/overview')).toEqual({
      view: 'overview', deckId: 'my-talk',
    })
  })

  it('NaN slide index → 0', () => {
    expect(hashToRoute('#deck/my-talk/abc')).toEqual({
      view: 'presentation', deckId: 'my-talk', slideIndex: 0,
    })
  })

  it('deckId over 64 chars → picker', () => {
    const longId = 'a'.repeat(65)
    expect(hashToRoute(`#deck/${longId}`)).toEqual({ view: 'picker' })
  })

  it('invalid format → picker', () => {
    expect(hashToRoute('#garbage')).toEqual({ view: 'picker' })
  })
})

describe('routeToHash', () => {
  it('picker → empty', () => {
    expect(routeToHash({ view: 'picker' })).toBe('')
  })

  it('presentation → deck/{id}/{n}', () => {
    expect(routeToHash({ view: 'presentation', deckId: 'foo', slideIndex: 2 }))
      .toBe('deck/foo/2')
  })

  it('editor → deck/{id}/editor', () => {
    expect(routeToHash({ view: 'editor', deckId: 'foo' })).toBe('deck/foo/editor')
  })

  it('overview → deck/{id}/overview', () => {
    expect(routeToHash({ view: 'overview', deckId: 'foo' })).toBe('deck/foo/overview')
  })
})

describe('round-trip', () => {
  const routes: Route[] = [
    { view: 'picker' },
    { view: 'presentation', deckId: 'test', slideIndex: 0 },
    { view: 'presentation', deckId: 'test', slideIndex: 5 },
    { view: 'editor', deckId: 'test' },
    { view: 'overview', deckId: 'test' },
  ]

  for (const route of routes) {
    it(`round-trips: ${JSON.stringify(route)}`, () => {
      const hash = routeToHash(route)
      const parsed = hashToRoute(hash ? `#${hash}` : '')
      expect(parsed).toEqual(route)
    })
  }
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/route.test.ts`
Expected: FAIL

**Step 3: Implement route.ts (pure functions only — no hook yet)**

```typescript
// src/core/route.ts
export type Route =
  | { view: 'picker' }
  | { view: 'presentation'; deckId: string; slideIndex: number }
  | { view: 'editor'; deckId: string }
  | { view: 'overview'; deckId: string }

const MAX_DECK_ID_LENGTH = 64

export function hashToRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  if (!raw || !raw.startsWith('deck/')) return { view: 'picker' }

  const parts = raw.split('/')
  // parts: ["deck", deckId, ...rest]
  const deckId = parts[1]
  if (!deckId || deckId.length > MAX_DECK_ID_LENGTH) return { view: 'picker' }

  const rest = parts[2]
  if (rest === 'editor') return { view: 'editor', deckId }
  if (rest === 'overview') return { view: 'overview', deckId }

  const slideIndex = rest ? parseInt(rest, 10) : 0
  return {
    view: 'presentation',
    deckId,
    slideIndex: Number.isNaN(slideIndex) ? 0 : Math.max(0, slideIndex),
  }
}

export function routeToHash(route: Route): string {
  if (route.view === 'picker') return ''
  if (route.view === 'presentation') return `deck/${route.deckId}/${route.slideIndex}`
  return `deck/${route.deckId}/${route.view}`
}
```

**Step 4: Run tests**

Run: `npx vitest run src/core/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/route.ts src/core/route.test.ts
git commit -m "feat: add route module with hash serialization for deck-scoped URLs"
```

---

### Task 2.4: Add useRoute hook with cycle guard

**Files:**
- Modify: `src/core/route.ts` (add useRoute hook)
- Modify: `src/core/route.test.ts` (add hook tests)

**Step 1: Write the failing tests**

```typescript
// Add to route.test.ts
import { renderHook, act } from '@testing-library/react'
import { useRoute } from './route'

describe('useRoute', () => {
  afterEach(() => { window.location.hash = '' })

  it('returns picker for empty hash', () => {
    window.location.hash = ''
    const { result } = renderHook(() => useRoute())
    expect(result.current[0]).toEqual({ view: 'picker' })
  })

  it('parses initial hash', () => {
    window.location.hash = '#deck/test/2'
    const { result } = renderHook(() => useRoute())
    expect(result.current[0]).toEqual({
      view: 'presentation', deckId: 'test', slideIndex: 2,
    })
  })

  it('updates hash when setRoute is called', () => {
    const { result } = renderHook(() => useRoute())
    act(() => {
      result.current[1]({ view: 'editor', deckId: 'foo' })
    })
    expect(window.location.hash).toBe('#deck/foo/editor')
  })

  it('responds to external hashchange', async () => {
    const { result } = renderHook(() => useRoute())
    act(() => {
      window.location.hash = '#deck/bar/overview'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toEqual({ view: 'overview', deckId: 'bar' })
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/core/route.test.ts`
Expected: FAIL — useRoute not exported

**Step 3: Implement useRoute with cycle guard**

Add to `src/core/route.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRouteState] = useState<Route>(() => hashToRoute(window.location.hash))
  const isInternalPush = useRef(false)

  const setRoute = useCallback((newRoute: Route) => {
    isInternalPush.current = true
    const hash = routeToHash(newRoute)
    window.location.hash = hash ? `#${hash}` : ''
    setRouteState(newRoute)
    // Reset after the current microtask so the hashchange handler skips
    queueMicrotask(() => { isInternalPush.current = false })
  }, [])

  useEffect(() => {
    function onHashChange() {
      if (isInternalPush.current) return // cycle guard
      setRouteState(hashToRoute(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return [route, setRoute]
}
```

**Step 4: Run tests**

Run: `npx vitest run src/core/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/route.ts src/core/route.test.ts
git commit -m "feat: add useRoute hook with cycle guard for bidirectional hash sync"
```

---

### Task 2.5: Update store with LOAD_DECK / UNLOAD_DECK actions

**Files:**
- Modify: `src/core/store.ts`
- Modify: `src/core/store.test.ts`

**Step 1: Write the failing tests**

Add to `store.test.ts`:

```typescript
it('LOAD_DECK sets currentDeck and parses markdown', () => {
  const state = slideReducer(initialState, {
    type: 'LOAD_DECK',
    deckId: 'my-talk',
    markdown: '# Slide 1\n---\n# Slide 2',
  })
  expect(state.currentDeck).toBe('my-talk')
  expect(state.slides).toHaveLength(2)
  expect(state.currentIndex).toBe(0)
})

it('UNLOAD_DECK resets to initial state', () => {
  const loaded = slideReducer(initialState, {
    type: 'LOAD_DECK',
    deckId: 'test',
    markdown: '# Slide 1',
  })
  const unloaded = slideReducer(loaded, { type: 'UNLOAD_DECK' })
  expect(unloaded.currentDeck).toBeNull()
  expect(unloaded.slides).toEqual([])
  expect(unloaded.rawMarkdown).toBe('')
})
```

**Step 2: Run tests — expect fail**

**Step 3: Update store.ts**

Add `currentDeck: string | null` to `SlideState` and `initialState`. Add `LOAD_DECK` and `UNLOAD_DECK` to `SlideAction` union and the reducer switch.

**Step 4: Run ALL store tests**

Run: `npx vitest run src/core/store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/store.ts src/core/store.test.ts
git commit -m "feat: add LOAD_DECK/UNLOAD_DECK actions to store"
```

---

### Task 2.6: Update loader for per-deck localStorage

**Files:**
- Modify: `src/core/loader.ts`
- Modify: `src/core/loader.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to loader.test.ts
describe('loadDeck', () => {
  it('returns localStorage draft when present', () => {
    localStorage.setItem('marko-pollo-deck-my-talk', '# Draft')
    const result = loadDeck('my-talk')
    expect(result).toBe('# Draft')
  })

  it('falls back to registry entry when no draft', () => {
    // getDeck is imported from deckRegistry — mock it
    const result = loadDeck('default')
    expect(result).toBeTruthy()
  })

  it('returns null for unknown deck', () => {
    expect(loadDeck('nonexistent')).toBeNull()
  })
})

describe('saveDeckDraft', () => {
  it('writes to deck-specific key', () => {
    saveDeckDraft('my-talk', '# Updated')
    expect(localStorage.getItem('marko-pollo-deck-my-talk')).toBe('# Updated')
  })
})

describe('migration', () => {
  it('migrates old key to default deck', () => {
    localStorage.setItem('marko-pollo-slides', '# Old Content')
    migrateOldStorage()
    expect(localStorage.getItem('marko-pollo-deck-default')).toBe('# Old Content')
    expect(localStorage.getItem('marko-pollo-slides')).toBeNull()
  })
})
```

**Step 2: Run tests — expect fail**

**Step 3: Implement loadDeck, saveDeckDraft, migrateOldStorage in loader.ts**

Replace the existing `loadMarkdown()` with new functions. Keep `saveToLocalStorage` for backwards compat during transition. Add:

```typescript
import { getDeck } from './deckRegistry'

const DECK_KEY_PREFIX = 'marko-pollo-deck-'
const OLD_STORAGE_KEY = 'marko-pollo-slides'

export function loadDeck(deckId: string): string | null {
  try {
    const draft = localStorage.getItem(`${DECK_KEY_PREFIX}${deckId}`)
    if (draft) return draft
  } catch { /* ignore */ }

  const entry = getDeck(deckId)
  return entry?.rawMarkdown ?? null
}

export function saveDeckDraft(deckId: string, markdown: string): boolean {
  try {
    localStorage.setItem(`${DECK_KEY_PREFIX}${deckId}`, markdown)
    return true
  } catch { return false }
}

export function migrateOldStorage(): void {
  try {
    const old = localStorage.getItem(OLD_STORAGE_KEY)
    if (old && !localStorage.getItem(`${DECK_KEY_PREFIX}default`)) {
      localStorage.setItem(`${DECK_KEY_PREFIX}default`, old)
      localStorage.removeItem(OLD_STORAGE_KEY)
    }
  } catch { /* ignore */ }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/core/loader.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/loader.ts src/core/loader.test.ts
git commit -m "feat: add per-deck localStorage loading with migration from old key"
```

---

### Task 2.7: Create PickerView component

**Files:**
- Create: `src/views/PickerView.tsx`
- Create: `src/styles/picker.module.css`
- Create: `src/views/PickerView.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/views/PickerView.test.tsx
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
```

**Step 2: Run tests — expect fail**

**Step 3: Implement PickerView and picker.module.css**

```typescript
// src/views/PickerView.tsx
import type { DeckEntry } from '../core/deckRegistry'
import styles from '../styles/picker.module.css'

interface PickerViewProps {
  entries: DeckEntry[]
  onSelectDeck: (deckId: string) => void
}

export function PickerView({ entries, onSelectDeck }: PickerViewProps) {
  return (
    <div className={styles.pickerView}>
      <header className={styles.header}>
        <h1 className={styles.logo}>marko pollo</h1>
      </header>
      <div className={styles.grid}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            className={styles.card}
            onClick={() => onSelectDeck(entry.id)}
            aria-label={`${entry.title} — ${entry.slideCount} slides`}
          >
            <span className={styles.cardTitle}>{entry.title}</span>
            {entry.author && (
              <span className={styles.cardAuthor}>{entry.author}</span>
            )}
            <span className={styles.cardMeta}>{entry.slideCount} slides</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

CSS uses `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` with brand tokens.

**Step 4: Run tests**

Run: `npx vitest run src/views/PickerView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/views/PickerView.tsx src/styles/picker.module.css src/views/PickerView.test.tsx
git commit -m "feat: add PickerView with responsive deck card grid"
```

---

### Task 2.8: Rewire App.tsx with useRoute and deck loading

**Files:**
- Modify: `src/App.tsx` (replace useHashRouting with useRoute, add PickerView, wire LOAD_DECK)
- Modify: `src/core/hooks.ts` (remove useHashRouting, keep useFileDrop)
- Modify: `src/core/keyboard.ts` (add navigateSlide callback for route-aware navigation)

**Step 1: Update keyboard.ts to accept a route-aware slide navigator**

Add `navigateSlide` to `KeyboardActions`:

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
```

The existing interface already works — App.tsx will provide callbacks that update BOTH the reducer and the route. No structural change to keyboard.ts itself; the change is in how App.tsx wires the callbacks.

**Step 2: Rewrite App.tsx**

Replace the `useHashRouting` import with `useRoute`. Add a lazy `PickerView`. Add a `useEffect` that dispatches `LOAD_DECK` when `route.deckId` changes. Wire keyboard callbacks to also update the route. Run migration on mount.

Key changes:
- `const [route, setRoute] = useRoute()`
- When `route.view !== 'picker'`, load the deck: `dispatch({ type: 'LOAD_DECK', deckId: route.deckId, markdown: loadDeck(route.deckId) })`
- Keyboard `nextSlide`/`prevSlide` update `currentIndex` via dispatch AND then call `setRoute` with the new index
- `toggleEditor` and `toggleOverview` use `setRoute` instead of `setView`
- Remove the old `loadMarkdown()` call on mount
- Call `migrateOldStorage()` on mount

**Step 3: Remove useHashRouting from hooks.ts**

Delete the `useHashRouting` function and `View` type from `src/core/hooks.ts`. Keep `useFileDrop`. Update `useFileDrop` to accept a `deckId` parameter for per-deck draft saving.

**Step 4: Update EditorView to use saveDeckDraft**

Replace `saveToLocalStorage(value)` with `saveDeckDraft(currentDeck, value)` where `currentDeck` comes from `useSlides().currentDeck`.

**Step 5: Run all unit tests**

Run: `npx vitest run`
Expected: Some existing tests may need minor updates (adding `currentDeck` to test state objects)

**Step 6: Fix any broken tests**

Update test fixtures that create `SlideState` objects to include `currentDeck: null`.

**Step 7: Commit**

```bash
git add src/App.tsx src/core/hooks.ts src/core/keyboard.ts src/views/EditorView.tsx
git commit -m "feat: rewire App.tsx with deck-scoped routing and LOAD_DECK"
```

---

### Task 2.9: Update all existing unit tests for new state shape

**Files:**
- Modify: All test files that create `SlideState` objects or mock the store

**Step 1: Run all tests and identify failures**

Run: `npx vitest run`
Note which tests fail due to missing `currentDeck` field.

**Step 2: Fix each failing test**

Add `currentDeck: null` (or `currentDeck: 'test'`) to any test state objects.

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "test: update test fixtures for currentDeck state field"
```

---

### Task 2.10: Update E2E tests for new routing

**Files:**
- Modify: `e2e/app.spec.ts`

**Step 1: Rewrite E2E tests for deck-scoped routes**

The root URL now shows the Picker. Tests need to navigate to a specific deck first:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Marko Pollo E2E', () => {
  test('root shows presentation picker', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('marko pollo')).toBeVisible()
    // At least the default deck should appear
    await expect(page.getByRole('button')).toHaveCount.greaterThanOrEqual(1)
  })

  test('clicking a deck card navigates to presentation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button').first().click()
    await expect(page).toHaveURL(/#deck\//)
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('navigates between slides with arrow keys', async ({ page }) => {
    await page.goto('/#deck/default/0')
    const counter = page.getByText(/\d+ \/ \d+/)
    await expect(counter).toHaveText(/1 \/ \d+/)
    await page.keyboard.press('ArrowRight')
    await expect(counter).toHaveText(/2 \/ \d+/)
  })

  test('E key switches to editor view', async ({ page }) => {
    await page.goto('/#deck/default/0')
    await page.keyboard.press('e')
    await expect(page).toHaveURL(/#deck\/default\/editor/)
    await expect(page.locator('.cm-editor')).toBeVisible()
  })

  test('O key switches to overview', async ({ page }) => {
    await page.goto('/#deck/default/0')
    await page.keyboard.press('o')
    await expect(page).toHaveURL(/#deck\/default\/overview/)
  })

  test('progress bar has ARIA attributes', async ({ page }) => {
    await page.goto('/#deck/default/0')
    const progressbar = page.getByRole('progressbar', { name: 'Slide progress' })
    await expect(progressbar).toBeVisible()
  })

  test('browser back returns to picker from deck', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button').first().click()
    await expect(page).toHaveURL(/#deck\//)
    await page.goBack()
    await expect(page.getByText('marko pollo')).toBeVisible()
  })
})
```

**Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add e2e/app.spec.ts
git commit -m "test: rewrite E2E tests for deck-scoped routing"
```

---

## Phase 3: File Export

Standalone module. Uses `currentDeck` for filename derivation.

---

### Task 3.1: Add jsdom mocks for download APIs

**Files:**
- Modify: `src/test-setup.ts`

**Step 1: Add mocks**

```typescript
// Add to test-setup.ts
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
globalThis.URL.revokeObjectURL = vi.fn()
```

**Step 2: Commit**

```bash
git add src/test-setup.ts
git commit -m "test: add URL.createObjectURL/revokeObjectURL mocks for jsdom"
```

---

### Task 3.2: Create exporter module with TDD

**Files:**
- Create: `src/core/exporter.ts`
- Create: `src/core/exporter.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/core/exporter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { slugify, downloadMarkdown, exportMarkdown } from './exporter'

describe('slugify', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(slugify('My Tech Talk')).toBe('my-tech-talk')
  })

  it('returns "presentation" for empty string', () => {
    expect(slugify('')).toBe('presentation')
  })

  it('returns "presentation" for all special chars', () => {
    expect(slugify('!!!')).toBe('presentation')
  })

  it('returns "presentation" for all non-ASCII', () => {
    expect(slugify('日本語')).toBe('presentation')
  })

  it('truncates to 100 characters', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(100)
  })

  it('strips special characters', () => {
    expect(slugify('Hello @World! #2026')).toBe('hello-world-2026')
  })
})

describe('downloadMarkdown', () => {
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
      style: {},
    } as unknown as HTMLAnchorElement)
  })

  it('creates a blob with text/markdown type', () => {
    downloadMarkdown('# Hello')
    expect(URL.createObjectURL).toHaveBeenCalled()
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/markdown')
  })

  it('uses slugified title as filename', () => {
    downloadMarkdown('# Hello', 'My Talk')
    const anchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(anchor.download).toBe('my-talk.md')
  })

  it('uses "presentation.md" when no title', () => {
    downloadMarkdown('# Hello')
    const anchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(anchor.download).toBe('presentation.md')
  })

  it('prefers deckId for filename when provided', () => {
    downloadMarkdown('# Hello', undefined, 'rust-talk')
    const anchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(anchor.download).toBe('rust-talk.md')
  })

  it('returns false for empty markdown', () => {
    expect(downloadMarkdown('')).toBe(false)
  })

  it('revokes blob URL after download', () => {
    vi.useFakeTimers()
    downloadMarkdown('# Hello')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    vi.useRealTimers()
  })
})
```

**Step 2: Run tests — expect fail**

**Step 3: Implement exporter.ts**

```typescript
// src/core/exporter.ts
let saving = false

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return slug || 'presentation'
}

export function downloadMarkdown(
  markdown: string,
  title?: string,
  deckId?: string
): boolean {
  if (!markdown.trim()) return false

  const filename = `${deckId || (title ? slugify(title) : 'presentation')}.md`
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}

export async function saveMarkdownToFile(
  markdown: string,
  title?: string,
  deckId?: string
): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `${deckId || (title ? slugify(title) : 'presentation')}.md`,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(markdown)
    await writable.close()
    return true
  } catch (err: any) {
    if (err?.name === 'AbortError') return false // user cancelled
    return false
  }
}

export async function exportMarkdown(
  markdown: string,
  title?: string,
  deckId?: string
): Promise<boolean> {
  if (!markdown.trim() || saving) return false
  saving = true
  try {
    const saved = await saveMarkdownToFile(markdown, title, deckId)
    if (!saved) return downloadMarkdown(markdown, title, deckId)
    return true
  } finally {
    saving = false
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/core/exporter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/exporter.ts src/core/exporter.test.ts
git commit -m "feat: add exporter module with slugify, download, and File System Access API"
```

---

### Task 3.3: Add Ctrl+S standalone listener in App.tsx

**Files:**
- Modify: `src/App.tsx` (add useEffect for Ctrl+S/Cmd+S)

**Step 1: Add the save shortcut listener**

In `App.tsx`, add a `useEffect` that listens for `Ctrl+S` / `Cmd+S` globally — NOT through `createKeyboardHandler`. This fires from ALL contexts including `.cm-editor`:

```typescript
// In App.tsx, add:
import { exportMarkdown } from './core/exporter'

useEffect(() => {
  const handleSave = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      exportMarkdown(state.rawMarkdown, state.deckMetadata.title, state.currentDeck ?? undefined)
    }
  }
  window.addEventListener('keydown', handleSave)
  return () => window.removeEventListener('keydown', handleSave)
}, [state.rawMarkdown, state.deckMetadata.title, state.currentDeck])
```

**Step 2: Add test for Ctrl+S in App.test.tsx or a new save-shortcut test**

Verify `Ctrl+S` fires even when target is inside `.cm-editor`.

**Step 3: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Ctrl+S/Cmd+S global save shortcut (works inside CodeMirror)"
```

---

### Task 3.4: Add export button to EditorView

**Files:**
- Modify: `src/views/EditorView.tsx`
- Modify: `src/styles/editor.module.css`

**Step 1: Restructure editorPane to flex column**

Update `editor.module.css`:
```css
.editorPane {
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(107, 115, 148, 0.2);
}
```

**Step 2: Add export button and save indicator to EditorView**

Add a toolbar row above CodeMirror with an export button. The button calls `exportMarkdown(localMarkdown, deckMetadata.title, currentDeck)` directly using `localMarkdown` (not stale `rawMarkdown`). Show "Saved" indicator for 2 seconds after successful export.

**Step 3: Run tests**

Run: `npx vitest run src/views/EditorView.test.tsx`
Expected: PASS (update test if needed)

**Step 4: Commit**

```bash
git add src/views/EditorView.tsx src/styles/editor.module.css
git commit -m "feat: add export button and save indicator to editor toolbar"
```

---

### Task 3.5: Add CSP blob: directive and E2E download test

**Files:**
- Modify: `index.html` (add `blob:` to CSP)
- Modify: `e2e/app.spec.ts` (add download E2E test)

**Step 1: Update CSP**

In `index.html`, update the CSP meta tag to include `blob:` in `default-src`:

```html
default-src 'self' blob:;
```

**Step 2: Add E2E download test**

```typescript
test('Ctrl+S downloads presentation as .md', async ({ page }) => {
  await page.goto('/#deck/default/0')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Control+s'),
  ])
  expect(download.suggestedFilename()).toMatch(/\.md$/)
})

test('Ctrl+S works from editor view', async ({ page }) => {
  await page.goto('/#deck/default/editor')
  await expect(page.locator('.cm-editor')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Control+s'),
  ])
  expect(download.suggestedFilename()).toMatch(/\.md$/)
})
```

**Step 3: Run E2E**

Run: `npx playwright test`
Expected: PASS

**Step 4: Commit**

```bash
git add index.html e2e/app.spec.ts
git commit -m "feat: add blob: to CSP and E2E tests for Ctrl+S download"
```

---

## Phase 4: Editor Persistence

Builds on the multi-presentation folder structure and the exporter module.

---

### Task 4.1: Create Vite dev-write plugin

**Files:**
- Create: `vite-plugin-dev-write.ts`
- Modify: `vite.config.ts`

**Step 1: Implement the plugin**

```typescript
// vite-plugin-dev-write.ts
import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs/promises'

const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10 MB

function validateWritePath(root: string, rawPath: string): string | null {
  if (rawPath.includes('..') || path.isAbsolute(rawPath)) return null
  if (!/^(src|presentations)\/[a-zA-Z0-9_/-]+\.md$/.test(rawPath)) return null
  const resolved = path.resolve(root, rawPath)
  if (!resolved.startsWith(root + path.sep)) return null
  return resolved
}

export function vitePluginDevWrite(): Plugin {
  return {
    name: 'marko-pollo-dev-write',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__marko-pollo/ping', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })

      server.middlewares.use('/__marko-pollo/write-file', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }

        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > MAX_BODY_SIZE) {
            res.statusCode = 413
            res.end('Request body too large')
            return
          }
          chunks.push(chunk as Buffer)
        }

        try {
          const { path: filePath, content } = JSON.parse(Buffer.concat(chunks).toString())
          const resolved = validateWritePath(server.config.root, filePath)
          if (!resolved) {
            res.statusCode = 403
            res.end('Invalid path')
            return
          }
          await fs.writeFile(resolved, content, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch {
          res.statusCode = 400
          res.end('Bad request')
        }
      })
    },
  }
}
```

**Step 2: Register in vite.config.ts**

```typescript
import { vitePluginDevWrite } from './vite-plugin-dev-write'

export default defineConfig({
  plugins: [react(), vitePluginDevWrite()],
  // ... rest unchanged
})
```

**Step 3: Create validateWritePath unit tests**

Extract `validateWritePath` as a named export and test it:

```typescript
// vite-plugin-dev-write.test.ts (run with environment: 'node')
import { describe, it, expect } from 'vitest'
import { validateWritePath } from './vite-plugin-dev-write'

describe('validateWritePath', () => {
  const root = '/project'

  it('accepts valid src path', () => {
    expect(validateWritePath(root, 'src/assets/slides.md')).toBe('/project/src/assets/slides.md')
  })

  it('accepts presentations path', () => {
    expect(validateWritePath(root, 'presentations/my-talk/slides.md'))
      .toBe('/project/presentations/my-talk/slides.md')
  })

  it('rejects .. traversal', () => {
    expect(validateWritePath(root, 'src/../etc/passwd')).toBeNull()
  })

  it('rejects absolute path', () => {
    expect(validateWritePath(root, '/etc/passwd')).toBeNull()
  })

  it('rejects non-.md extension', () => {
    expect(validateWritePath(root, 'src/assets/slides.js')).toBeNull()
  })

  it('rejects paths outside src/ and presentations/', () => {
    expect(validateWritePath(root, 'public/slides.md')).toBeNull()
  })
})
```

**Step 4: Run tests**

Run: `npx vitest run vite-plugin-dev-write.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vite-plugin-dev-write.ts vite-plugin-dev-write.test.ts vite.config.ts
git commit -m "feat: add Vite dev-write plugin for local file persistence"
```

---

### Task 4.2: Create token-store module

**Files:**
- Create: `src/core/token-store.ts`
- Create: `src/core/token-store.test.ts`

**Step 1: Write failing tests**

```typescript
// src/core/token-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, setToken, clearToken, hasToken } from './token-store'

describe('token-store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('returns null when no token stored', () => {
    expect(getToken()).toBeNull()
  })

  it('stores in sessionStorage by default', () => {
    setToken('ghp_test123', 'session')
    expect(sessionStorage.getItem('marko-pollo-github-token')).toBe('ghp_test123')
    expect(localStorage.getItem('marko-pollo-github-token')).toBeNull()
  })

  it('stores in localStorage when opted in', () => {
    setToken('ghp_test123', 'local')
    expect(localStorage.getItem('marko-pollo-github-token')).toBe('ghp_test123')
  })

  it('getToken checks sessionStorage first then localStorage', () => {
    localStorage.setItem('marko-pollo-github-token', 'ghp_local')
    expect(getToken()).toBe('ghp_local')
    sessionStorage.setItem('marko-pollo-github-token', 'ghp_session')
    expect(getToken()).toBe('ghp_session')
  })

  it('clearToken removes from both storages', () => {
    setToken('ghp_test', 'local')
    setToken('ghp_test', 'session')
    clearToken()
    expect(getToken()).toBeNull()
    expect(hasToken()).toBe(false)
  })

  it('hasToken returns true when token exists', () => {
    setToken('ghp_test', 'session')
    expect(hasToken()).toBe(true)
  })
})
```

**Step 2: Implement token-store.ts**

**Step 3: Run tests — PASS**

**Step 4: Commit**

```bash
git add src/core/token-store.ts src/core/token-store.test.ts
git commit -m "feat: add token-store module for GitHub PAT management"
```

---

### Task 4.3: Create github-api module

**Files:**
- Create: `src/core/github-api.ts`
- Create: `src/core/github-api.test.ts`

**Step 1: Write failing tests**

Test each of the 5 API wrappers with mocked `fetch`. Key tests:
- `getDefaultBranch` sends GET to correct URL with auth header
- `getFileContents` returns `{ sha, content }`
- `getBranchHead` returns the commit SHA (NOT the blob SHA — review finding fix)
- `createBranch` sends POST with correct ref string
- `updateFileContents` base64-encodes content using `btoa(unescape(encodeURIComponent(content)))` (unicode fix)
- `createPullRequest` returns `{ url, number }`
- All wrappers throw meaningful error on 401/403/422

**Step 2: Implement github-api.ts with 6 functions** (5 from spec + `getBranchHead`)

Note the unicode-safe base64 encoding:
```typescript
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}
```

**Step 3: Run tests — PASS**

**Step 4: Commit**

```bash
git add src/core/github-api.ts src/core/github-api.test.ts
git commit -m "feat: add GitHub API module with typed fetch wrappers"
```

---

### Task 4.4: Create persistence module

**Files:**
- Create: `src/core/persistence.ts`
- Create: `src/core/persistence.test.ts`

**Step 1: Write failing tests**

Key tests:
- `detectEnvironment()` returns `'dev'` when DEV and ping succeeds
- `detectEnvironment()` returns `'unknown'` when DEV but ping 404s
- `detectEnvironment()` returns `'github-pages'` when not DEV and URL matches pattern
- `detectGitHubRepo()` parses `{user}.github.io/{repo}` correctly
- `detectGitHubRepo()` returns null for localhost
- `saveToDevServer()` sends correct POST body
- `saveToGitHub()` orchestrates all 5 API calls in order

**CRITICAL testing note:** Use `vi.resetModules()` + dynamic re-import for each `detectEnvironment` test to avoid memo pollution:

```typescript
beforeEach(() => { vi.resetModules() })

it('returns dev when ping succeeds', async () => {
  vi.stubEnv('DEV', 'true')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  const { detectEnvironment } = await import('./persistence')
  expect(await detectEnvironment()).toBe('dev')
})
```

**Step 2: Implement persistence.ts**

**Step 3: Run tests — PASS**

**Step 4: Commit**

```bash
git add src/core/persistence.ts src/core/persistence.test.ts
git commit -m "feat: add persistence module with environment detection and save flows"
```

---

### Task 4.5: Create SaveButton and GitHubAuthModal components

**Files:**
- Create: `src/components/SaveButton.tsx`
- Create: `src/components/GitHubAuthModal.tsx`
- Modify: `src/styles/editor.module.css`

**Step 1: Write failing tests**

Test SaveButton renders in each state (idle, saving, saved, error, prLink). Test GitHubAuthModal shows token input, validates `ghp_` prefix, calls onAuthorize.

**Step 2: Implement components**

SaveButton: 5 states with brand styling. `autocomplete="off"` and `spellcheck="false"` on token input.

GitHubAuthModal: Centered modal, password input with reveal toggle, "Remember" checkbox with explicit warning.

**Step 3: Run tests — PASS**

**Step 4: Commit**

```bash
git add src/components/SaveButton.tsx src/components/GitHubAuthModal.tsx src/styles/editor.module.css
git commit -m "feat: add SaveButton and GitHubAuthModal components"
```

---

### Task 4.6: Wire persistence into EditorView

**Files:**
- Modify: `src/views/EditorView.tsx`

**Step 1: Import and wire**

- Import `detectEnvironment`, `saveToDevServer`, `saveToGitHub`, `detectGitHubRepo` from persistence
- Import `hasToken`, `getToken` from token-store
- Add `SaveButton` to the toolbar (replaces or augments the export button from Phase 3)
- On save click: check environment → dev: `saveToDevServer()`, github-pages: `saveToGitHub()`, unknown: `exportMarkdown()` fallback
- Handle auth modal open/close when no token for GitHub flow

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add src/views/EditorView.tsx
git commit -m "feat: wire persistence into editor with environment-aware save"
```

---

### Task 4.7: Update CSP for GitHub API and add E2E tests

**Files:**
- Modify: `index.html`
- Modify: `e2e/app.spec.ts`

**Step 1: Update CSP connect-src**

```html
connect-src 'self' blob: https://api.github.com https://github.com;
```

**Step 2: Add E2E tests with route interception**

Use `page.route()` to mock GitHub API calls and dev server write endpoint. Do NOT write to actual source files.

```typescript
test('dev save button triggers file write', async ({ page }) => {
  await page.goto('/#deck/default/editor')
  await page.route('**/__marko-pollo/write-file', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
  )
  // Click save button, verify success indicator
})
```

**Step 3: Run E2E — PASS**

**Step 4: Commit**

```bash
git add index.html e2e/app.spec.ts
git commit -m "feat: update CSP for GitHub API and add persistence E2E tests"
```

---

### Task 4.8: Final integration test and cleanup

**Files:**
- Modify: `src/integration.test.tsx` (add cross-feature tests)

**Step 1: Add integration tests**

- Route to `/#/deck/default/editor` → edit → save to localStorage → reload → content persists
- Export button uses `localMarkdown` not stale `rawMarkdown`
- Ctrl+S works from all views

**Step 2: Run full test suite**

Run: `npx vitest run && npx playwright test`
Expected: ALL PASS

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: add cross-feature integration tests"
```

---

## Post-Implementation Checklist

- [ ] All unit tests pass (`npx vitest run`)
- [ ] All E2E tests pass (`npx playwright test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Build with base path succeeds (`npm run build -- --base /marko-pollo/`)
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] PickerView shows all presentations from `presentations/` folder
- [ ] Clicking a deck navigates to presentation view
- [ ] E/O keys work for editor/overview within a deck
- [ ] Ctrl+S downloads .md from any view
- [ ] Export button in editor works
- [ ] Dev save writes to disk (when running `npm run dev`)
- [ ] GitHub repo Settings → Pages → Source set to "GitHub Actions"
