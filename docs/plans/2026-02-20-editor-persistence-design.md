# Editor Persistence Feature — Design Spec

## Problem

Editor changes in Dekk persist only to `localStorage`. This is sufficient for session continuity but does not write changes back to the source `.md` file. When a user edits their slide deck in the browser, those edits are stranded in the browser — they cannot be committed to git, shared, or recovered if localStorage is cleared.

Two deployment contexts need different persistence strategies:

- **Local dev server** (`npm run dev`): Direct file write via Vite dev server is both possible and expected. The author is on their own machine with access to the file system.
- **GitHub Pages** (`https://{user}.github.io/{repo}/`): No server-side write access exists. The only durable, versionable save target is the git repository itself, accessed via the GitHub API.

## Goal

Provide a "Save" action in the editor that persists the current `rawMarkdown` to its source file — either by writing to disk (dev) or by opening a GitHub pull request (production).

## Requirements

### Must Have

1. **Local dev write** — When running `npm run dev`, a "Save" button in the editor writes the current markdown to `src/assets/slides.md` on disk via a Vite dev server endpoint. The file on disk is updated immediately; no PR, no git operation.

2. **Environment detection** — The app detects its runtime context at startup:
   - **Dev**: Vite injects `import.meta.env.DEV === true` at build time. Additionally, perform a runtime probe (one `GET /__dekk/ping`) to confirm the write endpoint is available. This double-check handles `vite preview` (built app served by Vite but write endpoint absent) correctly.
   - **GitHub Pages**: `import.meta.env.DEV === false` and the probe 404s.

3. **GitHub PR save** — On GitHub Pages, Save triggers a GitHub API flow:
   1. Obtain a GitHub token (PAT or OAuth — see below).
   2. Fetch the current file SHA from `GET /repos/{owner}/{repo}/contents/{path}`.
   3. Create a new branch `dekk/update-slides-{timestamp}`.
   4. Commit the updated file content to that branch via `PUT /repos/{owner}/{repo}/contents/{path}`.
   5. Open a pull request from that branch to the repo's default branch.
   6. Show the user a link to the created PR.

4. **Repository auto-detection** — When running on GitHub Pages at `https://{username}.github.io/{repo}/`, derive `owner = username` and `repo = repo` automatically. No manual configuration required for the standard GitHub Pages URL pattern. Custom domains fall back to a config UI (see below).

5. **PAT entry UI** — A minimal modal/drawer in the editor allows the user to paste a GitHub Personal Access Token. Token is stored in `sessionStorage` by default (cleared on tab close). An opt-in "Remember this token" checkbox persists to `localStorage` with an explicit warning that the token will be stored in plaintext in the browser.

### Nice to Have

6. **GitHub OAuth device flow** — Instead of a PAT, use GitHub's [Device Authorization Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow):
   - Request device code from `https://github.com/login/device/code`
   - Show user the code and `github.com/login/device` URL
   - Poll for access token in the background
   - Requires a registered GitHub OAuth App; `client_id` is a build-time env var (`VITE_GITHUB_CLIENT_ID`)
   - Nice-to-have because it requires app registration setup; PAT is zero-infrastructure

7. **Conflict detection (dev)** — Record the file's `mtime` when the app loads. Before writing, re-stat the file via `GET /__dekk/stat`. If the mtime has changed, show a warning: "The file was modified outside the editor since you loaded it. Overwrite anyway?"

8. **Conflict detection (GitHub)** — Store the `sha` returned by the initial contents fetch. Before creating the PR branch, re-fetch the file and compare SHA. If it has changed, show the same overwrite warning.

9. **Auto-save to dev server** — Extend the existing 300 ms debounce in `EditorView` to also POST to the dev server endpoint (in addition to `localStorage`). This is transparent — no UI affordance needed. Only applies in dev mode. Auto-save to GitHub is explicitly excluded (PRs should be intentional).

10. **Save indicator** — After a successful save, show a brief "Saved" confirmation in the editor toolbar (same pattern as the file export spec: 2-second fade). Show "Saving…" during in-flight requests.

11. **Dirty state indicator** — Show a subtle dot in the editor header when `rawMarkdown` differs from the last saved content (either the on-disk content at load time, or the last successful save).

### Non-Goals

- Cloud storage (S3, Google Drive, Dropbox, etc.)
- Real-time collaboration or conflict-free merge
- Direct git operations (commit, push) — the PR approach intentionally keeps git out of the browser
- Multi-file or multi-deck save (deferred to the multi-presentation feature; see "Future Considerations")
- Editing history or undo beyond what the browser provides

## Architecture Decisions

### Dev Server Endpoint: Vite Plugin (chosen over standalone middleware)

**Options considered:**
- Vite plugin with `configureServer` hook — no new dependencies, co-located with the build config, only active in dev
- Separate Express server (e.g., `server.ts`, started alongside Vite) — more complex setup, two processes to manage
- Vite's built-in proxy config — cannot write files, only proxies requests

**Decision: Vite plugin.** The `configureServer` hook receives the Connect middleware instance and the project root. Add two routes:
- `GET /__dekk/ping` — returns `{"ok": true}` (used for environment detection)
- `POST /__dekk/write-file` with `{ path: string; content: string }` — writes the file

The plugin lives in `vite-plugin-dev-write.ts` at the project root (not in `src/`). It is applied in `vite.config.ts` only in dev mode.

**Path validation (critical):** Accept only paths matching `^src/[a-zA-Z0-9/_-]+\.md$` resolved relative to project root. Reject anything with `..`, absolute paths, or non-`.md` extensions. See Security section.

### GitHub API: Direct `fetch` calls (chosen over Octokit)

**Options considered:**
- `@octokit/rest` — well-typed, batteries included, but ~70 KB gzipped extra bundle weight
- Direct `fetch` against `https://api.github.com` — zero dependencies, full control, easy to tree-shake

**Decision: Direct `fetch`.** The required API surface is small (5 endpoints). A thin `src/core/github-api.ts` module with typed wrappers is sufficient and keeps the bundle lean. TypeScript types for GitHub API responses are inlined as needed (not from `@octokit/types`).

### GitHub Token Storage

| Storage | Lifetime | Risk |
|---------|----------|------|
| In-memory (React state) | Tab lifetime | Lost on reload — poor UX for long sessions |
| `sessionStorage` | Tab lifetime | Cleared on close; survives reload | **Default** |
| `localStorage` | Permanent | Token persists across sessions; plaintext |

**Decision: `sessionStorage` by default, `localStorage` opt-in with explicit user acknowledgement.** The token is never embedded in the URL, query params, or DOM attributes. A dedicated `src/core/token-store.ts` module centralises all token read/write operations so the policy is enforced in one place.

### Relation to `exporter.ts`

The file export spec defines `src/core/exporter.ts` for browser-side markdown downloads. Persistence is a distinct concern (server write, GitHub API) and should not be coupled to the exporter. However:

- `exporter.slugify()` is reused by the persistence module for deriving PR branch names from the deck title.
- The "Save" button in the editor replaces/augments the export button. A single toolbar button can serve both: primary action = persist (dev write or GitHub PR); secondary/fallback = download (existing exporter).

### Source File Path

For the initial implementation, the target file is always `src/assets/slides.md` — the path that `loader.ts` imports with `?raw`. This is a constant in the persistence module (`DEFAULT_SLIDES_PATH = 'src/assets/slides.md'`).

When the multi-presentation feature is added, the loader will need to track which file is currently loaded (either via a `sourcePath` in `LoadResult` — the field already exists for URLs — or via a new store field). The persistence module will consume that path. No design changes are needed now; the path just needs to flow through.

### State Shape for Persistence

Persistence UI state (save status, dirty flag, GitHub token presence) does not belong in `SlideState` (which owns content). It is local to `EditorView` via `useState`, except for the dirty flag which requires comparing current `rawMarkdown` to a "last saved" snapshot. The snapshot is kept as a `useRef` in `EditorView` and updated on each successful save.

No new global context or reducer is needed.

## New Files

| File | Purpose |
|------|---------|
| `vite-plugin-dev-write.ts` | Vite plugin: dev-only HTTP endpoints for file write and ping |
| `src/core/persistence.ts` | Client-side persistence module: environment detection, dev-server write, GitHub PR creation |
| `src/core/token-store.ts` | GitHub token read/write with session/local storage policy |
| `src/core/github-api.ts` | Typed `fetch` wrappers for the five GitHub API calls |
| `src/components/GitHubAuthModal.tsx` | Modal for PAT entry and optional "Remember" checkbox |
| `src/components/SaveButton.tsx` | Editor toolbar save button: idle / saving / saved / error states |
| `src/core/persistence.test.ts` | Unit tests for environment detection, path validation, PR flow (mocked) |
| `src/core/token-store.test.ts` | Unit tests for token storage, retrieval, and clearing |
| `src/core/github-api.test.ts` | Unit tests for API wrappers (mocked `fetch`) |

## Modified Files

| File | Change |
|------|--------|
| `vite.config.ts` | Import and apply `vitePluginDevWrite()` plugin |
| `src/views/EditorView.tsx` | Add `SaveButton` and `GitHubAuthModal`; manage save state and dirty flag |
| `src/core/loader.ts` | Expose `sourcePath` in `LoadResult` for the dev path; no behaviour change |
| `src/styles/editor.module.css` | Styles for `SaveButton` and `GitHubAuthModal` |

## Module APIs

### `vite-plugin-dev-write.ts`

```typescript
import type { Plugin } from 'vite'

export function vitePluginDevWrite(): Plugin
```

The plugin's `configureServer` handler registers:
- `GET /__dekk/ping` → `200 { ok: true }`
- `POST /__dekk/write-file` body `{ path: string; content: string }` → `200 { ok: true }` or `400/403`

Path validation: only accepts paths matching `/^src\/[a-zA-Z0-9_/-]+\.md$/` after `path.resolve(root, path)`. Returns `403` if the resolved path escapes the project root.

### `src/core/persistence.ts`

```typescript
export type Environment = 'dev' | 'github-pages' | 'unknown'

/** Probe the dev server; result is memoised after first call. */
export async function detectEnvironment(): Promise<Environment>

export interface DevSaveResult {
  ok: true
}

export interface GitHubSaveResult {
  ok: true
  prUrl: string
}

export type SaveResult =
  | { ok: true; prUrl?: string }
  | { ok: false; error: string }

/** Write to the dev server (dev environment only). */
export async function saveToDevServer(
  filePath: string,
  content: string
): Promise<SaveResult>

export interface GitHubSaveOptions {
  owner: string
  repo: string
  filePath: string
  baseBranch: string
  token: string
  commitMessage?: string
}

/** Create a GitHub PR with the updated content. */
export async function saveToGitHub(
  content: string,
  options: GitHubSaveOptions
): Promise<SaveResult>

/** Attempt to auto-detect owner/repo from the current URL (GitHub Pages pattern). */
export function detectGitHubRepo(): { owner: string; repo: string } | null
```

### `src/core/github-api.ts`

```typescript
export interface GitHubFile {
  sha: string
  content: string   // base64-encoded
  encoding: string
}

export async function getFileContents(
  owner: string, repo: string, path: string, token: string, ref?: string
): Promise<GitHubFile>

export async function createBranch(
  owner: string, repo: string, branchName: string, fromSha: string, token: string
): Promise<void>

export async function updateFileContents(
  owner: string, repo: string, path: string,
  content: string, sha: string, branch: string,
  message: string, token: string
): Promise<void>

export async function createPullRequest(
  owner: string, repo: string, title: string,
  head: string, base: string, body: string, token: string
): Promise<{ url: string; number: number }>

export async function getDefaultBranch(
  owner: string, repo: string, token: string
): Promise<string>
```

### `src/core/token-store.ts`

```typescript
export type TokenPersistence = 'session' | 'local'

export function getToken(): string | null
export function setToken(token: string, persistence: TokenPersistence): void
export function clearToken(): void
export function hasToken(): boolean
export function getTokenPersistence(): TokenPersistence | null
```

## Data Flows

### Dev Save (Must Have)

```
User clicks Save
  → EditorView calls saveToDevServer('src/assets/slides.md', rawMarkdown)
  → persistence.ts: POST /__dekk/write-file { path, content }
  → vite-plugin-dev-write.ts validates path, writes file with fs.writeFile
  → Response 200 → EditorView updates lastSavedRef, shows "Saved" for 2s
  → Response 4xx/network error → EditorView shows error message
```

### GitHub Pages Save (Must Have)

```
User clicks Save
  → No token present → open GitHubAuthModal
  → User enters PAT, optionally checks "Remember", clicks Authorize
  → token-store.ts saves token to sessionStorage (or localStorage)
  → EditorView calls saveToGitHub(rawMarkdown, { owner, repo, ... })
  → github-api.ts:
      1. getDefaultBranch → "main"
      2. getFileContents → { sha: currentFileSha }
      3. createBranch "dekk/update-slides-{timestamp}" from HEAD SHA
      4. updateFileContents → commits file to new branch
      5. createPullRequest → returns prUrl
  → EditorView shows "PR opened ↗" link for 10s, then idle
```

### Environment Detection (startup)

```
App mounts (App.tsx or EditorView mounts)
  → import.meta.env.DEV === true ?
      YES → fetch GET /__dekk/ping
              200 → environment = 'dev'
              else → environment = 'unknown'
      NO  → detectGitHubRepo()
              match → environment = 'github-pages'
              no match → environment = 'unknown'
  → environment stored in module-level memo (not React state)
  → EditorView reads environment to choose save strategy
```

### Auto-save (Nice to Have, dev only)

```
User types in editor
  → handleChange fires (existing 300ms debounce)
  → dispatch SET_MARKDOWN + saveToLocalStorage (existing)
  → if environment === 'dev': saveToDevServer (fire-and-forget, no UI update)
```

## UI Changes

### Editor Toolbar

Current editor has no explicit toolbar. Add a minimal header row above the CodeMirror pane:

```
┌──────────────────────────────────┬────────────────────────────────────┐
│  [● unsaved]        [Save ↑]  ✕  │  [Preview pane]                    │
│  ...editor...                    │  ...preview...                      │
```

- **Dirty indicator** (Nice to Have): small dot `●` in `var(--mp-secondary)` when unsaved changes exist
- **Save button**: primary label depends on environment:
  - Dev: "Save" (disk icon)
  - GitHub Pages (token present): "Open PR" (GitHub icon or arrow-up)
  - GitHub Pages (no token): "Connect GitHub" (lock icon)
- **Save states**: idle → loading spinner → "Saved" (green, 2s) or "Error" (red, persistent until next attempt)
- **PR link**: on successful GitHub save, the button area shows a "PR #N ↗" link for 10 seconds

### GitHub Auth Modal

A small centered modal (not full-screen):

```
┌────────────────────────────────────────────┐
│  Connect GitHub                            │
│                                            │
│  GitHub Personal Access Token:             │
│  ┌──────────────────────────────────────┐  │
│  │ ghp_...                              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Required scopes: repo (or public_repo)    │
│                                            │
│  ☐ Remember this token (stored in         │
│    localStorage — not recommended on       │
│    shared computers)                       │
│                                            │
│  [Cancel]                  [Authorize →]   │
└────────────────────────────────────────────┘
```

- Styled with brand colours (surface background, primary CTA)
- Token input: `type="password"` with toggle to reveal
- Link to GitHub token creation page (`https://github.com/settings/tokens/new`) opens in a new tab
- Validation: reject tokens that don't start with `ghp_` or `github_pat_` before even trying the API

## Security Considerations

### Dev Server Path Traversal Prevention

The write endpoint MUST reject:
- Absolute paths
- Paths containing `..` components (check both the raw input string and after `path.resolve`)
- Paths that resolve outside the project root
- Non-`.md` file extensions
- Paths outside `src/` (even within the project)

The validation must be done server-side (in the Vite plugin handler), not just client-side, because any local process could call the endpoint.

```typescript
function validateWritePath(root: string, rawPath: string): string | null {
  if (rawPath.includes('..') || path.isAbsolute(rawPath)) return null
  if (!/^src\/[a-zA-Z0-9_/-]+\.md$/.test(rawPath)) return null
  const resolved = path.resolve(root, rawPath)
  if (!resolved.startsWith(root + path.sep)) return null
  return resolved
}
```

### GitHub Token Handling

- Token is NEVER logged or included in error messages
- Token is NEVER placed in the URL (no `?token=...` patterns)
- Token is NEVER stored in `SlideState` or dispatched as a Redux-style action
- `token-store.ts` is the single source of truth; components receive the token only when needed for an API call
- The "Remember" warning must be visible and not buried in fine print
- On sign-out (clear token), both `sessionStorage` and `localStorage` entries are wiped

### CORS

The dev server endpoint is accessed at `http://localhost:{port}` from the same origin. No CORS headers are needed. If a future scenario requires cross-origin access (e.g., a standalone server on a different port), add an explicit `Access-Control-Allow-Origin: http://localhost:{port}` check — do not use `*`.

### GitHub API Requests

- All GitHub API requests use `https://` only
- Requests include `Authorization: Bearer {token}` header (not basic auth)
- Content is base64-encoded for the GitHub Contents API (standard requirement)
- PR branch names are sanitised: `dekk/update-slides-` + timestamp (no user-controlled input in the branch name unless the deck title is used, in which case apply `slugify()`)

## Testing

### Unit Tests

**`persistence.test.ts`:**
- `detectEnvironment()` returns `'dev'` when `import.meta.env.DEV` is true and ping succeeds
- `detectEnvironment()` returns `'unknown'` when ping 404s (vite preview scenario)
- `detectGitHubRepo()` parses standard GitHub Pages URLs correctly
- `detectGitHubRepo()` returns null for localhost and custom domains
- `saveToDevServer()` sends correct POST body and returns `SaveResult`
- `saveToDevServer()` returns `{ ok: false }` on network error

**`token-store.test.ts`:**
- `setToken(..., 'session')` writes to `sessionStorage`, not `localStorage`
- `setToken(..., 'local')` writes to both (so `getToken` finds it after session clear simulation)
- `clearToken()` removes from both storages
- `getToken()` returns null when neither storage has the key

**`github-api.test.ts`:**
- Each wrapper sends correct HTTP method, URL, and headers
- `createBranch()` constructs the correct `ref` string
- `updateFileContents()` base64-encodes the content
- All wrappers throw with a meaningful message on 401/403/422

### Integration / E2E Tests

**Dev write (E2E, dev server must be running):**
- Click Save in editor → file on disk is updated → page reload reflects changes
- Attempt to save a path with `..` → server returns 403, UI shows error

**GitHub PR (E2E, mocked GitHub API via Playwright route interception):**
- Click Save without token → auth modal appears
- Enter invalid token format → "Authorize" button disabled
- Complete auth flow → modal closes, save proceeds
- Successful save → "PR #1 ↗" link appears in toolbar

### Manual Visual Checklist

- [ ] Save button placement and sizing matches editor layout at 1440×900
- [ ] Dirty indicator visible but not distracting
- [ ] "Saving…" spinner does not cause layout shift
- [ ] Auth modal is centred and fully visible on small viewports (1024×768)
- [ ] "Saved" → "PR #N ↗" transition is clear and readable
- [ ] Token input password masking and reveal toggle work correctly

## Future Considerations

### Multi-Presentation Support

When the multi-presentation feature lands, `loadMarkdown()` will return a `sourcePath` identifying which file is active. `EditorView` should read `sourcePath` from loader state and pass it to `saveToDevServer` / `saveToGitHub`. No changes to the persistence module API are required — the `filePath` parameter already accepts an arbitrary path.

One new concern: the GitHub PR flow will need to know the path of every changed file if multi-file editing is supported. For now, only single-file saves are in scope.

### OAuth App vs. PAT

The device flow (Nice to Have #6) requires a GitHub OAuth App registration with a `client_id`. If the project is hosted under a GitHub organisation, an org-level OAuth App can be created. The `VITE_GITHUB_CLIENT_ID` build-time env var gates the feature: if absent, the UI shows only the PAT flow; if present, the UI offers "Authorize with GitHub" as the primary CTA.

### Vite Preview Compatibility

`vite preview` serves the production build via Vite's HTTP server but does NOT run the `configureServer` plugin hook. The environment detection ping will 404, so `detectEnvironment()` returns `'unknown'`. In this state, the Save button should fall back to the file export (download) behaviour from `exporter.ts`, not the GitHub PR flow. A brief tooltip "Save to GitHub only available on GitHub Pages" explains the situation.
