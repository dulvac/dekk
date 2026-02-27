# Multi-Presentation Folders — Design Spec

## Problem

Dekk currently supports exactly one presentation at a time. The active markdown comes from one of three sources — localStorage, a `?url=` parameter, or the bundled `src/assets/slides.md` default. There is no concept of owning multiple presentations, no way to switch between them, and no organised storage convention. A user preparing talks for several conferences must manually swap files by drag-drop or URL, with no persistent identity for each deck.

## Goal

Introduce a flat folder convention for organising multiple presentations inside the repo. Each folder under `presentations/` becomes a named presentation. A build-time registry indexes them all. A new Presentation Picker view lists available presentations and lets the user navigate to one. Each presentation gets a stable URL. The existing editor, overview, and presentation views become deck-scoped.

## Requirements

### Must Have

1. **Folder convention** — Presentations live at `presentations/{deck-id}/slides.md`. `deck-id` must be a URL-safe slug (lowercase letters, digits, hyphens). Each folder may contain supplementary assets (images, attachments) co-located alongside `slides.md` but only `slides.md` is required.

   ```
   presentations/
     my-conference-talk/
       slides.md
     internal-demo/
       slides.md
     rust-async-deep-dive/
       slides.md
   ```

2. **Build-time registry** — Vite's `import.meta.glob` eagerly imports all `presentations/*/slides.md` files at build time. A registry module (`src/core/deckRegistry.ts`) parses each file and produces a `DeckEntry[]` exported as a constant. No network request, no separate JSON file, no dev-server plugin required.

   ```typescript
   export interface DeckEntry {
     id: string           // folder name, e.g. "my-conference-talk"
     title: string        // from frontmatter title, falls back to id
     author?: string      // from frontmatter author
     slideCount: number   // number of --- separated slides
     rawMarkdown: string  // full source
   }

   export const deckRegistry: DeckEntry[]
   export function getDeck(id: string): DeckEntry | undefined
   ```

3. **Presentation Picker UI** — A new `PickerView` component shown at the root route (`/#/`). Displays all `DeckEntry` items as cards in a responsive grid. Each card shows title, author (if present), and slide count. Clicking a card navigates to `/#/deck/{id}`. Brand styling consistent with the dark cinematic theme.

4. **Deck-scoped URL routing** — The routing schema becomes:

   | URL | View |
   |-----|------|
   | `/#/` | Presentation Picker |
   | `/#/deck/{id}` | Presentation (slide 0) |
   | `/#/deck/{id}/{n}` | Presentation (slide n, 0-indexed) |
   | `/#/deck/{id}/editor` | Editor |
   | `/#/deck/{id}/overview` | Overview grid |

   The existing `/#/editor` and `/#/overview` routes are removed (replaced by the deck-scoped equivalents above).

5. **Default route** — Navigating to `/#/` always shows the Picker, not a blank slide or the default bundled deck. The bundled `src/assets/slides.md` becomes one entry in the registry under a conventional id (e.g., `default`) rather than a special-cased fallback.

### Nice to Have

6. **Presentation metadata in picker** — Show title, author, and slide count on each card in the Picker grid.

7. **Create new presentation** — "New Presentation" button in the Picker that opens a modal prompting for a deck name. Creates a blank in-memory presentation (one slide) saved to localStorage under the new deck id. The new deck appears in the Picker as a "local draft" distinct from bundled decks.

8. **Presentation thumbnails** — Render a miniature first-slide preview in each Picker card (re-use the existing slide thumbnail technique from OverviewGrid).

9. **Import via drag-drop** — Dragging a `.md` file onto the Picker view creates a new local-draft presentation from the file contents.

### Architecture Decisions

#### Discovery: build-time only

`import.meta.glob('../../presentations/*/slides.md', { eager: true, query: '?raw', import: 'default' })` runs at Vite build time and bundles all presentation sources into the JS bundle. This means:

- Zero runtime filesystem or network access needed — the SPA stays fully static.
- Adding a new presentation requires a code build (acceptable for conference authoring).
- The bundle grows proportionally to total presentation content — not a concern for text-based decks.
- Vite HMR hot-reloads on `slides.md` changes during development automatically.

A future enhancement could add an optional dev-server plugin that watches for new folders and reloads, but that is out of scope here.

#### State management

`SlideState` gains `currentDeck: string | null`:

```typescript
export interface SlideState {
  currentDeck: string | null   // deck id, null = picker / no deck loaded
  rawMarkdown: string
  slides: SlideData[]
  deckMetadata: DeckMetadata
  currentIndex: number
}
```

New actions:

```typescript
| { type: 'LOAD_DECK'; deckId: string; markdown: string }
| { type: 'UNLOAD_DECK' }
```

`SET_MARKDOWN` is retained as-is for the editor's live-edit path.

The `DeckRegistry` is not part of `SlideState` — it is a build-time constant that does not change at runtime. It is provided as a plain import or via a lightweight `DeckRegistryContext` (simpler: plain import, since it never changes).

#### localStorage: per-deck keying

The existing single key `dekk-slides` is deprecated. Per-deck draft storage uses:

```
dekk-deck-{deckId}
```

When loading a deck, the loader first checks for a localStorage draft under that key, then falls back to the bundled `rawMarkdown` from the registry. On editor save, the draft is written to the deck-specific key.

Local-draft decks created via "Create new" or drag-drop use the same key pattern with user-supplied or auto-generated ids. A separate index of local-draft ids is stored at `dekk-local-decks` (JSON array of strings) so the Picker can enumerate them.

Migration: on first load after the update, if the old `dekk-slides` key exists and no per-deck keys exist, the stored content is migrated to `dekk-deck-default` and the old key is cleared.

#### Hash routing overhaul

`useHashRouting` is replaced by `useRoute` which parses a richer route structure:

```typescript
export type Route =
  | { view: 'picker' }
  | { view: 'presentation'; deckId: string; slideIndex: number }
  | { view: 'editor';        deckId: string }
  | { view: 'overview';      deckId: string }

export function useRoute(): [Route, (route: Route) => void]
```

Hash serialisation:

```typescript
function routeToHash(route: Route): string {
  if (route.view === 'picker') return ''
  if (route.view === 'presentation') return `deck/${route.deckId}/${route.slideIndex}`
  return `deck/${route.deckId}/${route.view}`
}
```

`App.tsx` switches on `route.view` to render the correct view component.

#### Keyboard navigation and slide index sync

Currently `currentIndex` is pure reducer state; the hash only encodes view (`editor`, `overview`). Under the new scheme `slideIndex` is encoded in the URL so browser back/forward work across slides. `useRoute` must keep hash and `currentIndex` in sync bidirectionally:

- Reducer dispatches `GO_TO_SLIDE` → `useRoute` updates hash.
- Browser back/forward → `hashchange` → `useRoute` dispatches `GO_TO_SLIDE`.

This is a non-trivial sync loop. Implementation must guard against cycles (e.g., track `lastPushedIndex` ref).

#### Editor persistence and the file-export feature

The file-export feature writes `rawMarkdown` via blob download keyed to `deckMetadata.title`. Under the new scheme the suggested filename uses the `currentDeck` id as the slug instead of (or in addition to) the frontmatter title. `exporter.ts` signature change is minimal: accept an optional `deckId` parameter in addition to `title`.

## Non-Goals

- Cloud presentation library or sync
- Presentation templates
- Cross-presentation search
- Nested folder hierarchies (one level only: `presentations/{id}/slides.md`)
- Server-side filesystem scanning (static SPA; no backend)
- PDF / HTML export of individual decks

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `presentations/default/slides.md` | The current `src/assets/slides.md` moved here |
| `src/core/deckRegistry.ts` | `import.meta.glob` discovery, `DeckEntry[]` export, `getDeck()` |
| `src/core/deckRegistry.test.ts` | Tests: entry count, getDeck lookup, missing id, slideCount |
| `src/core/route.ts` | `Route` type, `useRoute` hook, `routeToHash`, `hashToRoute` |
| `src/core/route.test.ts` | Tests: hash serialisation round-trips, hashchange sync |
| `src/views/PickerView.tsx` | Presentation picker grid |
| `src/styles/picker.module.css` | Picker styles |
| `src/views/PickerView.test.tsx` | Renders cards for each registry entry, click navigates |

### Modified Files

| File | Change |
|------|--------|
| `src/core/loader.ts` | Replace `loadMarkdown()` with `loadDeck(deckId)` — checks per-deck localStorage key, falls back to registry entry. Add `saveDeckDraft(deckId, markdown)`, migrate old `dekk-slides` key on first run. |
| `src/core/loader.test.ts` | New tests for `loadDeck`, `saveDeckDraft`, migration path |
| `src/core/store.ts` | Add `currentDeck: string \| null` to `SlideState`; add `LOAD_DECK` and `UNLOAD_DECK` actions |
| `src/core/store.test.ts` | Tests for new actions |
| `src/core/hooks.ts` | Remove `useHashRouting`; `useFileDrop` gains deck context (drops create local-draft presentation) |
| `src/App.tsx` | Replace `useHashRouting` with `useRoute`; add `PickerView` branch; wire `LOAD_DECK` on route change; remove hardcoded `loadMarkdown()` call on mount |
| `src/core/keyboard.ts` | No structural change needed; keyboard shortcuts for next/prev slide trigger route update instead of only state update |
| `src/core/exporter.ts` | Accept optional `deckId` for filename derivation |
| `vite.config.ts` | No change required (import.meta.glob works without config) |
| `src/assets/slides.md` | Deleted (content moved to `presentations/default/slides.md`) |

### Data Flow

```
User visits /#/deck/rust-async-deep-dive/2
  → hashToRoute() → { view: 'presentation', deckId: 'rust-async-deep-dive', slideIndex: 2 }
  → App renders <PresentationView />
  → useEffect dispatches LOAD_DECK
      → loadDeck('rust-async-deep-dive')
          → checks localStorage 'dekk-deck-rust-async-deep-dive'
          → falls back to deckRegistry.getDeck('rust-async-deep-dive').rawMarkdown
      → dispatch({ type: 'LOAD_DECK', deckId: 'rust-async-deep-dive', markdown })
  → slideReducer produces new state: { currentDeck: 'rust-async-deep-dive', slides: [...], currentIndex: 2 }
  → PresentationView renders slide at index 2

User presses →
  → dispatch(NEXT_SLIDE)
  → currentIndex becomes 3
  → useRoute syncs hash to /#/deck/rust-async-deep-dive/3

User presses E
  → setRoute({ view: 'editor', deckId: 'rust-async-deep-dive' })
  → hash becomes /#/deck/rust-async-deep-dive/editor

User edits in editor, content changes
  → SET_MARKDOWN updates rawMarkdown in state
  → saveDeckDraft('rust-async-deep-dive', markdown) writes to localStorage

User presses Ctrl+S
  → exportMarkdown(rawMarkdown, deckId) → downloads 'rust-async-deep-dive.md'
```

### deckRegistry.ts (key API)

```typescript
import markdownFiles from 'virtual:deck-registry'
// OR:
const markdownFiles = import.meta.glob(
  '/presentations/*/slides.md',
  { eager: true, query: '?raw', import: 'default' }
) as Record<string, string>

export interface DeckEntry {
  id: string
  title: string
  author?: string
  slideCount: number
  rawMarkdown: string
}

function parseEntry(id: string, rawMarkdown: string): DeckEntry
export const deckRegistry: DeckEntry[]
export function getDeck(id: string): DeckEntry | undefined
```

### route.ts (key API)

```typescript
export type Route =
  | { view: 'picker' }
  | { view: 'presentation'; deckId: string; slideIndex: number }
  | { view: 'editor'; deckId: string }
  | { view: 'overview'; deckId: string }

export function hashToRoute(hash: string): Route
export function routeToHash(route: Route): string
export function useRoute(): [Route, (route: Route) => void]
```

### PickerView layout

```
┌─────────────────────────────────────────────────┐
│  dekk                         [+ New]     │
│─────────────────────────────────────────────────│
│  ┌──────────────┐  ┌──────────────┐             │
│  │ [thumbnail?] │  │ [thumbnail?] │             │
│  │ My Talk      │  │ Internal Demo│             │
│  │ Jane Dev     │  │              │             │
│  │ 12 slides    │  │ 8 slides     │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌──────────────┐                               │
│  │ Rust Deep    │                               │
│  │ Dive         │                               │
│  │ Bob Eng      │                               │
│  │ 24 slides    │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

Card styling: `var(--mp-surface)` background, `var(--mp-primary)` border on hover, title in `var(--mp-text)`, author/count in `var(--mp-muted)`.

### Security Considerations

- `deck-id` from the URL hash is used only for a registry lookup (`getDeck(id)`) and as a localStorage key. It never reaches the filesystem or a server. No path traversal risk.
- LocalStorage keys are prefixed (`dekk-deck-`) and the id is the verbatim hash segment; length-limit the id to 64 characters to prevent excessive localStorage key lengths.
- The import.meta.glob pattern is static; Vite resolves it at build time. No dynamic `import()` of user-supplied paths.
- Per-deck localStorage content is the user's own markdown; the existing XSS protections in the renderer apply unchanged.

### Testing

**Unit tests:**
- `deckRegistry.test.ts`: registry length matches folder count, `getDeck` returns correct entry, missing id returns `undefined`, `slideCount` is accurate
- `route.test.ts`: `hashToRoute` / `routeToHash` round-trip for all four route shapes; invalid hash falls back to `{ view: 'picker' }`; slide index parsing handles NaN
- `loader.test.ts`: `loadDeck` returns localStorage draft when present; falls back to registry; `saveDeckDraft` writes correct key; migration test: old `dekk-slides` → `dekk-deck-default`
- `store.test.ts`: `LOAD_DECK` sets `currentDeck` and parses slides; `UNLOAD_DECK` resets to `initialState`

**E2E tests (Playwright):**
- Root route renders Picker with all deck cards
- Clicking a card navigates to `/#/deck/{id}` and displays first slide
- Browser back returns to Picker
- `E` key in deck view navigates to `/#/deck/{id}/editor`
- `O` key in deck view navigates to `/#/deck/{id}/overview`; clicking a slide thumbnail navigates to `/#/deck/{id}/{n}`
- Slide index in URL survives page reload
- Editor changes persist across reload (localStorage draft)
